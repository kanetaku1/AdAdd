package handler

import (
	"encoding/csv"
	"io"
	"net/http"
	"strings"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

func RegisterCompanyRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/companies", listCompanies)
	r.GET("/companies/:id", getCompany)

	rc := e.Group("")
	rc.Use(RequireRoles("COMPANY_MANAGEMENT_DEPARTMENT", "ADMINISTRATOR"))
	rc.POST("/companies", createCompany)
	rc.POST("/companies/bulk", bulkImportCompanies)
	rc.PATCH("/companies/:id", updateCompany)
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

func createCompany(c echo.Context) error {
	var req model.Company
	if err := c.Bind(&req); err != nil {
		return respondBadRequest(c, err.Error())
	}
	svc := service.NewCompanyService()
	if err := svc.Create(&req); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": req, "message": "created"})
}

func updateCompany(c echo.Context) error {
	id := c.Param("id")
	var req struct {
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
	if err := c.Bind(&req); err != nil {
		return respondBadRequest(c, err.Error())
	}

	svc := service.NewCompanyService()
	existing, err := svc.GetByID(id)
	if err != nil {
		return respondNotFound(c, "company not found")
	}

	existing.CompanyName = req.CompanyName
	existing.CompanyNameKana = req.CompanyNameKana
	existing.PostalCode = req.PostalCode
	existing.Address = req.Address
	existing.PhoneNumber = req.PhoneNumber
	existing.Website = req.Website
	existing.ContactPersonName = req.ContactPersonName
	existing.ContactEmailOrForm = req.ContactEmailOrForm
	existing.FirstSponsorshipYear = req.FirstSponsorshipYear
	existing.Memo = req.Memo

	if err := svc.Update(existing); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": existing, "message": "updated"})
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
