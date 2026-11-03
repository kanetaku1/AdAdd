package handler

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
	"github.com/shopspring/decimal"
	"google.golang.org/api/drive/v3"
	"gorm.io/gorm"
)

type ContractMenuDriveOperator interface {
	UploadFile(context.Context, string, string, string, string, string, io.Reader) (*drive.File, error)
	TrashFile(context.Context, string) error
}

var newContractMenuDriveOperator = func() ContractMenuDriveOperator {
	return service.NewDriveService()
}

// SetContractMenuDriveOperatorFactory wires the Drive dependency. Production
// uses the dedicated-account service above; integration tests inject a fake.
func SetContractMenuDriveOperatorFactory(factory func() ContractMenuDriveOperator) {
	newContractMenuDriveOperator = factory
}

func RegisterContractMenuRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/contracts/:contractId/menus", listContractMenus)
	r.GET("/contract-menus/:id/production/files", listContractMenuFiles)
	// staff and admin manage contract menus — create/update only
	rStaff := e.Group("")
	rStaff.Use(RequireRoles("SPONSORSHIP_MEMBER", "ADMINISTRATOR"))
	rStaff.POST("/contracts/:contractId/menus", addContractMenu)
	rStaff.PATCH("/contract-menus/:id", updateContractMenuDetails)
	rStaff.PATCH("/contract-menus/:id/status", updateContractMenuStatus)

	rFiles := e.Group("")
	rFiles.Use(RequireRoles("SPONSORSHIP_MEMBER", "ADVISOR", "ADVERTISEMENT_MANAGER", "ADMINISTRATOR"))
	rFiles.PATCH("/contract-menus/:id/production", uploadContractMenuProduction)
	rFiles.POST("/contract-menus/:id/drive-upload", driveUploadContractMenu)
	rFiles.POST("/contract-menus/:id/production/files", addContractMenuFiles)
	rFiles.PATCH("/contract-menus/:id/production/files/:fileId", updateContractMenuFile)
	rFiles.DELETE("/contract-menus/:id/production/files/:fileId", deleteContractMenuFile)
	// Compatibility for the path used by the first multiple-file prototype.
	rFiles.DELETE("/contract-menus/:id/files/:fileId", deleteContractMenuFile)

	// Deletion is Administrator-only system-wide (spec/api.md#Authorization
	// Matrix) — Sponsorship Member's "manage menus" access stops at update.
	rAdmin := e.Group("")
	rAdmin.Use(RequireRoles("ADMINISTRATOR"))
	rAdmin.DELETE("/contract-menus/:id", deleteContractMenu)

	r.GET("/years/:yearId/contract-menus", listContractMenusAcrossYear)
}

func listContractMenusAcrossYear(c echo.Context) error {
	yearId := c.Param("yearId")
	filters := make(map[string]interface{})

	if q := c.QueryParam("companyName"); q != "" {
		filters["companyName"] = q
	}
	if q := c.QueryParam("sponsorshipMenuId"); q != "" {
		filters["sponsorshipMenuId"] = q
	}
	if q := c.QueryParam("status"); q != "" {
		filters["status"] = q
	}
	if q := c.QueryParam("productionType"); q != "" {
		filters["productionType"] = q
	}

	svc := service.NewContractMenuService()
	list, err := svc.ListAcrossYear(yearId, filters)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	for i := range list {
		applyContractMenuCapabilities(c, &list[i].ContractMenu)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": list, "message": "success"})
}

func listContractMenus(c echo.Context) error {
	contractId := c.Param("contractId")
	svc := service.NewContractMenuService()
	list, err := svc.ListByContract(contractId)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	for i := range list {
		applyContractMenuCapabilities(c, &list[i])
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": list, "message": "success"})
}

func addContractMenu(c echo.Context) error {
	contractId := c.Param("contractId")
	var body struct {
		SponsorshipMenuID  string           `json:"sponsorshipMenuId"`
		Quantity           int              `json:"quantity"`
		UnitPrice          *decimal.Decimal `json:"unitPrice"`
		IsGoodsSponsorship bool             `json:"isGoodsSponsorship"`
		ProductionType     string           `json:"productionType"`
		Remarks            string           `json:"remarks"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	if body.SponsorshipMenuID == "" {
		return respondBadRequest(c, "sponsorshipMenuId is required")
	}
	if body.Quantity <= 0 {
		return respondBadRequest(c, "quantity must be > 0")
	}
	if body.UnitPrice != nil && !validateNonNegativeAmount(*body.UnitPrice) {
		return respondBadRequest(c, "unitPrice must be non-negative")
	}

	req := &model.ContractMenu{
		ContractID:         contractId,
		SponsorshipMenuID:  body.SponsorshipMenuID,
		Quantity:           body.Quantity,
		IsGoodsSponsorship: body.IsGoodsSponsorship,
		ProductionType:     body.ProductionType,
		Remarks:            body.Remarks,
	}
	if body.UnitPrice != nil {
		req.UnitPrice = *body.UnitPrice
	}

	svc := service.NewContractMenuService()
	if err := svc.Create(req, body.UnitPrice != nil); err != nil {
		if errors.Is(err, service.ErrConfirmedPaymentAmountMismatch) {
			return respondConflict(c, err.Error())
		}
		return respondInternalServerError(c, err)
	}
	created, err := svc.GetByID(req.ID)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	applyContractMenuCapabilities(c, created)
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": created, "message": "created"})
}

func deleteContractMenu(c echo.Context) error {
	id := c.Param("id")
	svc := service.NewContractMenuService()
	if err := svc.Delete(id); err != nil {
		if errors.Is(err, service.ErrConfirmedPaymentAmountMismatch) {
			return respondConflict(c, err.Error())
		}
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"message": "deleted"})
}

func updateContractMenuStatus(c echo.Context) error {
	id := c.Param("id")
	var body struct {
		Status string `json:"status"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	// validate status
	if err := ValidateContractMenuStatus(body.Status); err != nil {
		return respondBadRequest(c, err.Error())
	}
	svc := service.NewContractMenuService()
	cm, err := svc.GetByID(id)
	if err != nil {
		return respondNotFound(c, "contract menu not found")
	}
	cm.Status = body.Status
	userId := ""
	if uid := c.Get("userId"); uid != nil {
		userId, _ = uid.(string)
	}
	if err := svc.UpdateWithUser(cm, userId); err != nil {
		if errors.Is(err, service.ErrConfirmedPaymentAmountMismatch) {
			return respondConflict(c, err.Error())
		}
		if errors.Is(err, service.ErrSubmittedStateConflict) {
			return respondConflict(c, err.Error())
		}
		return respondInternalServerError(c, err)
	}
	cm, err = svc.GetByID(id)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	applyContractMenuCapabilities(c, cm)
	return c.JSON(http.StatusOK, map[string]interface{}{"data": cm, "message": "updated"})
}

func uploadContractMenuProduction(c echo.Context) error {
	id := c.Param("id")
	var body struct {
		DriveFolderUrl *string `json:"driveFolderUrl"`
		DriveFileName  *string `json:"driveFileName"`
		Remarks        *string `json:"remarks"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	svc := service.NewContractMenuService()
	var file *service.ContractMenuDriveFileInput
	if body.DriveFolderUrl != nil {
		name := "資料"
		if body.DriveFileName != nil {
			name = *body.DriveFileName
		}
		file = &service.ContractMenuDriveFileInput{DriveURL: *body.DriveFolderUrl, DriveFileName: name}
	}
	userID, _ := c.Get("userId").(string)
	cm, err := svc.UpdateLegacyProduction(id, body.Remarks, file, userID)
	if err != nil {
		return respondContractMenuFileError(c, err)
	}
	applyContractMenuCapabilities(c, cm)
	return c.JSON(http.StatusOK, map[string]interface{}{"data": cm, "message": "updated"})
}

func driveUploadContractMenu(c echo.Context) error {
	id := c.Param("id")

	// Get form values
	folderId := c.FormValue("folderId")
	if folderId == "" {
		return respondBadRequest(c, "folderId is required")
	}
	form, err := c.MultipartForm()
	if err != nil {
		return respondBadRequest(c, "multipart form is required")
	}
	fileHeaders := append(form.File["file"], form.File["files"]...)
	if len(fileHeaders) == 0 {
		return respondBadRequest(c, "file or files is required")
	}

	// Get ContractMenu to obtain suffix (ProductionType)
	menuSvc := service.NewContractMenuService()
	cm, err := menuSvc.GetByID(id)
	if err != nil {
		return respondNotFound(c, "contract menu not found")
	}
	if err := menuSvc.EnsureFilesWritable(id); err != nil {
		return respondContractMenuFileError(c, err)
	}

	// 企業名の取得
	companyName := "不明な企業"
	csvc := service.NewContractService()
	if contract, err := csvc.GetByID(cm.ContractID); err == nil {
		ycsvc := service.NewYearlyCompanyService()
		if yc, err := ycsvc.GetByID(contract.YearlyCompanyID); err == nil {
			companyName = yc.CompanyName
		}
	}

	// Suffix mapping logic
	suffix := ""
	switch cm.ProductionType {
	case "COMPANY":
		suffix = "企業"
	case "INTERNAL", "COMMITTEE":
		suffix = "委員"
	case "CONTINUATION":
		suffix = "継続"
	default:
		suffix = "不明"
	}
	suffix = fmt.Sprintf("%s_%s", suffix, companyName)

	rootFolderId := os.Getenv("GOOGLE_DRIVE_ROOT_FOLDER_ID")
	driveSvc := newContractMenuDriveOperator()
	inputs := make([]service.ContractMenuDriveFileInput, 0, len(fileHeaders))
	fileNames := make([]string, 0, len(fileHeaders))
	for i, fileHeader := range fileHeaders {
		file, err := fileHeader.Open()
		if err != nil {
			cleanupUploadedDriveFiles(c.Request().Context(), driveSvc, inputs)
			return respondInternalServerError(c, err)
		}
		fileBytes, readErr := io.ReadAll(file)
		file.Close()
		if readErr != nil {
			cleanupUploadedDriveFiles(c.Request().Context(), driveSvc, inputs)
			return respondInternalServerError(c, fmt.Errorf("failed to read file content: %w", readErr))
		}
		originalExt := filepath.Ext(fileHeader.Filename)
		uploadSuffix := suffix
		if len(fileHeaders) > 1 {
			base := filepath.Base(fileHeader.Filename)
			base = base[:len(base)-len(originalExt)]
			uploadSuffix = fmt.Sprintf("%s_%02d_%s", suffix, i+1, base)
		}
		uploadedFile, uploadErr := driveSvc.UploadFile(
			c.Request().Context(),
			folderId,
			rootFolderId,
			uploadSuffix,
			originalExt,
			fileHeader.Header.Get("Content-Type"),
			bytes.NewReader(fileBytes),
		)
		if uploadErr != nil {
			cleanupUploadedDriveFiles(c.Request().Context(), driveSvc, inputs)
			return respondDriveOperationError(c, uploadErr)
		}
		if uploadedFile == nil || strings.TrimSpace(uploadedFile.Id) == "" {
			cleanupUploadedDriveFiles(c.Request().Context(), driveSvc, inputs)
			return respondDriveOperationError(c, service.ErrDriveFileIDMissing)
		}
		driveFileID := uploadedFile.Id
		inputs = append(inputs, service.ContractMenuDriveFileInput{
			DriveFileID:   &driveFileID,
			DriveURL:      uploadedFile.WebViewLink,
			DriveFileName: uploadedFile.Name,
		})
		fileNames = append(fileNames, uploadedFile.Name)
	}

	userID, _ := c.Get("userId").(string)
	cm, err = menuSvc.AddUploadedFiles(id, folderId, inputs, userID)
	if err != nil {
		cleanupUploadedDriveFiles(c.Request().Context(), driveSvc, inputs)
		return respondContractMenuFileError(c, err)
	}
	applyContractMenuCapabilities(c, cm)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":   "upload successful",
		"data":      cm,
		"fileNames": fileNames,
		"fileName":  fileNames[0],
	})
}

// cleanupUploadedDriveFiles is a best-effort compensation for a request that
// uploaded Drive bodies but could not commit their AdAdd references.
func cleanupUploadedDriveFiles(ctx context.Context, driveSvc ContractMenuDriveOperator, inputs []service.ContractMenuDriveFileInput) {
	for _, input := range inputs {
		if input.DriveFileID == nil || strings.TrimSpace(*input.DriveFileID) == "" {
			continue
		}
		_ = driveSvc.TrashFile(ctx, *input.DriveFileID)
	}
}

func updateContractMenuDetails(c echo.Context) error {
	id := c.Param("id")
	var body struct {
		Quantity           *int             `json:"quantity"`
		UnitPrice          *decimal.Decimal `json:"unitPrice"`
		IsGoodsSponsorship *bool            `json:"isGoodsSponsorship"`
		ProductionType     *string          `json:"productionType"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	if body.Quantity != nil && *body.Quantity <= 0 {
		return respondBadRequest(c, "quantity must be > 0")
	}
	if body.UnitPrice != nil && !validateNonNegativeAmount(*body.UnitPrice) {
		return respondBadRequest(c, "unitPrice must be non-negative")
	}

	svc := service.NewContractMenuService()
	updated, err := svc.PatchDetails(id, body.Quantity, body.UnitPrice, body.IsGoodsSponsorship, body.ProductionType)
	if err != nil {
		if errors.Is(err, service.ErrConfirmedPaymentAmountMismatch) {
			return respondConflict(c, err.Error())
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return respondNotFound(c, "contract menu not found")
		}
		return respondInternalServerError(c, err)
	}

	updated, err = svc.GetByID(id)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	applyContractMenuCapabilities(c, updated)
	return c.JSON(http.StatusOK, map[string]interface{}{"data": updated, "message": "updated"})
}

func listContractMenuFiles(c echo.Context) error {
	files, err := service.NewContractMenuService().ListFiles(c.Param("id"))
	if err != nil {
		return respondContractMenuFileError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": files, "message": "success"})
}

func addContractMenuFiles(c echo.Context) error {
	var body struct {
		Files []struct {
			DriveFileID   *string `json:"driveFileId"`
			DriveURL      string  `json:"driveUrl"`
			DriveFileName string  `json:"driveFileName"`
		} `json:"files"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	inputs := make([]service.ContractMenuDriveFileInput, 0, len(body.Files))
	for _, file := range body.Files {
		inputs = append(inputs, service.ContractMenuDriveFileInput{
			DriveFileID:   file.DriveFileID,
			DriveURL:      file.DriveURL,
			DriveFileName: file.DriveFileName,
		})
	}
	userID, _ := c.Get("userId").(string)
	cm, err := service.NewContractMenuService().AddFiles(c.Param("id"), inputs, userID)
	if err != nil {
		return respondContractMenuFileError(c, err)
	}
	applyContractMenuCapabilities(c, cm)
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": cm, "message": "created"})
}

func updateContractMenuFile(c echo.Context) error {
	var body struct {
		DriveURL      *string `json:"driveUrl"`
		DriveFileName *string `json:"driveFileName"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	file, err := service.NewContractMenuService().UpdateFile(
		c.Param("id"), c.Param("fileId"), body.DriveURL, body.DriveFileName,
	)
	if err != nil {
		return respondContractMenuFileError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": file, "message": "updated"})
}

func deleteContractMenuFile(c echo.Context) error {
	menuSvc := service.NewContractMenuService()
	file, err := menuSvc.GetFileForDeletion(c.Param("id"), c.Param("fileId"))
	if err != nil {
		return respondContractMenuFileError(c, err)
	}
	driveFileID := ""
	if file.DriveFileID != nil {
		driveFileID = strings.TrimSpace(*file.DriveFileID)
	}
	if driveFileID == "" {
		driveFileID, err = service.ExtractDriveFileID(file.DriveURL)
		if err != nil {
			return respondConflict(c, "Google DriveのファイルIDを特定できないため削除できません")
		}
	}
	if err := newContractMenuDriveOperator().TrashFile(c.Request().Context(), driveFileID); err != nil {
		return respondDriveOperationError(c, err)
	}
	userID, _ := c.Get("userId").(string)
	cm, err := menuSvc.DeleteFile(c.Param("id"), c.Param("fileId"), driveFileID, userID)
	if err != nil {
		return respondContractMenuFileError(c, err)
	}
	applyContractMenuCapabilities(c, cm)
	return c.JSON(http.StatusOK, map[string]interface{}{"data": cm, "message": "deleted"})
}

func respondDriveOperationError(c echo.Context, err error) error {
	if errors.Is(err, service.ErrDriveNotConfigured) {
		return respondDriveUnavailable(c, http.StatusServiceUnavailable, "Google Drive連携が設定されていません。管理者に連絡してください")
	}
	if errors.Is(err, service.ErrDriveFileIDMissing) || errors.Is(err, service.ErrDriveFolderTarget) {
		return respondConflict(c, err.Error())
	}
	return respondDriveUnavailable(c, http.StatusBadGateway, "Google Driveの操作に失敗しました。AdAddの資料は変更されていません")
}

func respondContractMenuFileError(c echo.Context, err error) error {
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		return respondNotFound(c, "contract menu or file not found")
	case errors.Is(err, service.ErrPastYearReadOnly), errors.Is(err, service.ErrSubmittedStateConflict):
		return respondConflict(c, err.Error())
	case errors.Is(err, service.ErrInvalidDriveFile):
		return respondBadRequest(c, err.Error())
	default:
		return respondInternalServerError(c, err)
	}
}

func applyContractMenuCapabilities(c echo.Context, cm *model.ContractMenu) {
	roles, _ := c.Get("userRoles").([]string)
	canManageFiles := hasAnyRole(roles,
		"SPONSORSHIP_MEMBER", "ADVISOR", "ADVERTISEMENT_MANAGER", "ADMINISTRATOR",
	)
	cm.AllowUpload = cm.ActiveYear && canManageFiles
	cm.AllowDelete = cm.ActiveYear && canManageFiles
}

func hasAnyRole(actual []string, allowed ...string) bool {
	for _, role := range actual {
		for _, candidate := range allowed {
			if strings.EqualFold(role, candidate) {
				return true
			}
		}
	}
	return false
}
