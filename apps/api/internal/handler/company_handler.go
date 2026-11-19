package handler

import (
	"encoding/csv"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func RegisterCompanyRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/companies", listCompanies)
	r.GET("/companies/:id", getCompany)

	rc := e.Group("")
	rc.Use(RequireRoles("SPONSORSHIP_MEMBER", "ADMINISTRATOR"))
	rc.POST("/companies", createCompany)
	rc.POST("/companies/bulk", bulkImportCompanies)
	rc.PATCH("/companies/:id", updateCompany)

	// Deletion is Administrator-only system-wide (spec/api.md#Authorization
	// Matrix) — Sponsorship Member's company master access stops at update.
	rAdmin := e.Group("")
	rAdmin.Use(RequireRoles("ADMINISTRATOR"))
	rAdmin.DELETE("/companies/:id", deleteCompany)
}

func listCompanies(c echo.Context) error {
	svc := service.NewCompanyService()
	companies, err := svc.ListAll()
	if err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": companies, "message": "success"})
}

func getCompany(c echo.Context) error {
	id := c.Param("id")
	svc := service.NewCompanyService()
	company, err := svc.GetByID(id)
	if err != nil {
		return respondNotFound(c, "company not found")
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": company, "message": "success"})
}

type createCompanyRequest struct {
	CompanyName          string `json:"companyName"`
	CompanyNameKana      string `json:"companyNameKana"`
	PostalCode           string `json:"postalCode"`
	Address              string `json:"address"`
	PhoneNumber          string `json:"phoneNumber"`
	Website              string `json:"website"`
	ContactPersonName    string `json:"contactPersonName"`
	ContactEmailOrForm   string `json:"contactEmailOrForm"`
	FirstSponsorshipYear string `json:"firstSponsorshipYear"`
	Memo                 string `json:"memo"`
}

func createCompany(c echo.Context) error {
	var req createCompanyRequest
	if err := c.Bind(&req); err != nil {
		return respondBadRequest(c, err.Error())
	}
	if strings.TrimSpace(req.CompanyName) == "" {
		return respondBadRequest(c, "companyName is required")
	}
	company := &model.Company{
		CompanyName:          strings.TrimSpace(req.CompanyName),
		CompanyNameKana:      req.CompanyNameKana,
		PostalCode:           req.PostalCode,
		Address:              req.Address,
		PhoneNumber:          req.PhoneNumber,
		Website:              req.Website,
		ContactPersonName:    req.ContactPersonName,
		ContactEmailOrForm:   req.ContactEmailOrForm,
		FirstSponsorshipYear: req.FirstSponsorshipYear,
		Memo:                 req.Memo,
	}
	svc := service.NewCompanyService()
	if err := svc.Create(company); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": company, "message": "created"})
}

type updateCompanyRequest struct {
	CompanyName          optionalString `json:"companyName"`
	CompanyNameKana      optionalString `json:"companyNameKana"`
	PostalCode           optionalString `json:"postalCode"`
	Address              optionalString `json:"address"`
	PhoneNumber          optionalString `json:"phoneNumber"`
	Website              optionalString `json:"website"`
	ContactPersonName    optionalString `json:"contactPersonName"`
	ContactEmailOrForm   optionalString `json:"contactEmailOrForm"`
	FirstSponsorshipYear optionalString `json:"firstSponsorshipYear"`
	Memo                 optionalString `json:"memo"`
}

func updateCompany(c echo.Context) error {
	id := c.Param("id")
	var req updateCompanyRequest
	if err := c.Bind(&req); err != nil {
		return respondBadRequest(c, err.Error())
	}

	if req.CompanyName.Sent && (req.CompanyName.Value == nil || strings.TrimSpace(*req.CompanyName.Value) == "") {
		return respondBadRequest(c, "companyName must not be empty")
	}

	changes := map[string]interface{}{}
	if req.CompanyName.Sent && req.CompanyName.Value != nil {
		changes["company_name"] = strings.TrimSpace(*req.CompanyName.Value)
	}
	if req.CompanyNameKana.Sent && req.CompanyNameKana.Value != nil {
		changes["company_name_kana"] = *req.CompanyNameKana.Value
	}
	if req.PostalCode.Sent && req.PostalCode.Value != nil {
		changes["postal_code"] = *req.PostalCode.Value
	}
	if req.Address.Sent && req.Address.Value != nil {
		changes["address"] = *req.Address.Value
	}
	if req.PhoneNumber.Sent && req.PhoneNumber.Value != nil {
		changes["phone_number"] = *req.PhoneNumber.Value
	}
	if req.Website.Sent && req.Website.Value != nil {
		changes["website"] = *req.Website.Value
	}
	if req.ContactPersonName.Sent && req.ContactPersonName.Value != nil {
		changes["contact_person_name"] = *req.ContactPersonName.Value
	}
	if req.ContactEmailOrForm.Sent && req.ContactEmailOrForm.Value != nil {
		changes["contact_email_or_form"] = *req.ContactEmailOrForm.Value
	}
	if req.FirstSponsorshipYear.Sent && req.FirstSponsorshipYear.Value != nil {
		changes["first_sponsorship_year"] = *req.FirstSponsorshipYear.Value
	}
	if req.Memo.Sent && req.Memo.Value != nil {
		changes["memo"] = *req.Memo.Value
	}

	svc := service.NewCompanyService()
	updated, err := svc.UpdateColumns(id, changes)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return respondNotFound(c, "company not found")
		}
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": updated, "message": "updated"})
}

func bulkImportCompanies(c echo.Context) error {
	dryRun := c.FormValue("dryRun") == "true"

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return respondBadRequest(c, "missing csv file key 'file'")
	}
	file, err := fileHeader.Open()
	if err != nil {
		return respondInternalServerError(c, err)
	}
	defer file.Close()

	buf := make([]byte, 3)
	n, _ := io.ReadFull(file, buf)
	if n == 3 && buf[0] == 0xef && buf[1] == 0xbb && buf[2] == 0xbf {
		// skipped BOM
	} else {
		file.Seek(0, 0)
	}

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return respondBadRequest(c, "invalid csv formatting")
	}
	if len(records) < 2 {
		return respondBadRequest(c, "csv must contain header and rows")
	}

	headers := records[0]
	headerMap := make(map[string]int)
	for i, h := range headers {
		headerMap[strings.TrimSpace(h)] = i
	}

	var rows []service.CompanyCsvRow
	for i, record := range records[1:] {
		rowNumber := i + 2

		getVal := func(header string) string {
			idx, ok := headerMap[header]
			if !ok || idx >= len(record) {
				return ""
			}
			return strings.TrimSpace(record[idx])
		}

		rows = append(rows, service.CompanyCsvRow{
			RowNumber:            rowNumber,
			CompanyName:          getVal("companyName"),
			CompanyNameKana:      getVal("companyNameKana"),
			PostalCode:           getVal("postalCode"),
			Address:              getVal("address"),
			PhoneNumber:          getVal("phoneNumber"),
			Website:              getVal("website"),
			ContactPersonName:    getVal("contactPersonName"),
			ContactEmailOrForm:   getVal("contactEmailOrForm"),
			FirstSponsorshipYear: getVal("firstSponsorshipYear"),
			Memo:                 getVal("memo"),
			PreviousYearContract: getVal("previousYearContract"),
		})
	}

	svc := service.NewCompanyService()
	result, err := svc.BulkImport(rows, dryRun)
	if err != nil {
		return respondInternalServerError(c, err)
	}

	msg := "Import successful"
	if dryRun {
		msg = "Preview successful"
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": result, "message": msg})
}

func deleteCompany(c echo.Context) error {
	id := c.Param("id")
	svc := service.NewCompanyService()
	if err := svc.Delete(id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return respondNotFound(c, "company not found")
		}
		if errors.Is(err, service.ErrCompanyInUse) {
			return respondConflict(c, "company has yearly companies and cannot be deleted")
		}
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"message": "deleted"})
}
