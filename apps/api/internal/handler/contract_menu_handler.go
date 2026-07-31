package handler

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

func RegisterContractMenuRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/contracts/:contractId/menus", listContractMenus)
	// staff and admin manage contract menus
	rStaff := e.Group("")
	rStaff.Use(RequireRoles("SPONSORSHIP_MEMBER", "ADMINISTRATOR"))
	rStaff.POST("/contracts/:contractId/menus", addContractMenu)
	rStaff.DELETE("/contract-menus/:id", deleteContractMenu)
	rStaff.PATCH("/contract-menus/:id", updateContractMenuDetails)
	rStaff.PATCH("/contract-menus/:id/status", updateContractMenuStatus)
	rStaff.PATCH("/contract-menus/:id/production", uploadContractMenuProduction)
	rStaff.POST("/contract-menus/:id/drive-upload", driveUploadContractMenu)

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
	return c.JSON(http.StatusOK, map[string]interface{}{"data": list, "message": "success"})
}

func listContractMenus(c echo.Context) error {
	contractId := c.Param("contractId")
	svc := service.NewContractMenuService()
	list, err := svc.ListByContract(contractId)
	if err != nil {
		return respondInternalServerError(c, err)
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
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": req, "message": "created"})
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
	if err := svc.Update(cm); err != nil {
		if errors.Is(err, service.ErrConfirmedPaymentAmountMismatch) {
			return respondConflict(c, err.Error())
		}
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": cm, "message": "updated"})
}

func uploadContractMenuProduction(c echo.Context) error {
	id := c.Param("id")
	var body struct {
		DriveFolderUrl *string `json:"driveFolderUrl"`
		Remarks        *string `json:"remarks"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	svc := service.NewContractMenuService()
	cm, err := svc.GetByID(id)
	if err != nil {
		return respondNotFound(c, "contract menu not found")
	}
	if body.DriveFolderUrl != nil {
		cm.DriveURL = *body.DriveFolderUrl
	}
	if body.Remarks != nil {
		cm.Remarks = *body.Remarks
	}
	cm.Status = "SUBMITTED"
	userId := ""
	if uid := c.Get("userId"); uid != nil {
		userId = uid.(string)
	}
	if err := svc.UpdateWithUser(cm, userId); err != nil {
		if errors.Is(err, service.ErrConfirmedPaymentAmountMismatch) {
			return respondConflict(c, err.Error())
		}
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": cm, "message": "updated"})
}

func driveUploadContractMenu(c echo.Context) error {
	id := c.Param("id")

	// Get form values
	folderId := c.FormValue("folderId")
	if folderId == "" {
		return respondBadRequest(c, "folderId is required")
	}
	accessToken := c.FormValue("accessToken")
	if accessToken == "" {
		return respondBadRequest(c, "accessToken is required")
	}

	// Read file from multipart
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return respondBadRequest(c, "file is required")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return respondInternalServerError(c, err)
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return respondInternalServerError(c, fmt.Errorf("failed to read file content: %w", err))
	}
	fileReader := bytes.NewReader(fileBytes)

	// Get ContractMenu to obtain suffix (ProductionType)
	menuSvc := service.NewContractMenuService()
	cm, err := menuSvc.GetByID(id)
	if err != nil {
		return respondNotFound(c, "contract menu not found")
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
	case "COMMITTEE":
		suffix = "委員"
	case "CONTINUATION":
		suffix = "継続"
	default:
		suffix = "不明"
	}
	suffix = fmt.Sprintf("%s_%s", suffix, companyName)

	mimeType := fileHeader.Header.Get("Content-Type")
	originalExt := filepath.Ext(fileHeader.Filename)
	rootFolderId := os.Getenv("GOOGLE_DRIVE_ROOT_FOLDER_ID")

	driveSvc := service.NewDriveService()
	uploadedFile, err := driveSvc.UploadFile(c.Request().Context(), accessToken, folderId, rootFolderId, suffix, originalExt, mimeType, fileReader)
	if err != nil {
		return respondInternalServerError(c, err) // Wrap in standard error format
	}

	// Update the database
	cm.DriveFolderID = folderId
	cm.DriveURL = uploadedFile.WebViewLink
	cm.DriveFileName = uploadedFile.Name
	cm.Status = "SUBMITTED"

	userId := ""
	if uid := c.Get("userId"); uid != nil {
		userId = uid.(string)
	}

	if err := menuSvc.UpdateWithUser(cm, userId); err != nil {
		if errors.Is(err, service.ErrConfirmedPaymentAmountMismatch) {
			return respondConflict(c, err.Error())
		}
		return respondInternalServerError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":  "upload successful",
		"data":     cm,
		"fileName": uploadedFile.Name,
	})
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

	return c.JSON(http.StatusOK, map[string]interface{}{"data": updated, "message": "updated"})
}
