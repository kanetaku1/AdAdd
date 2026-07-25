package handler

import (
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

func RegisterCompanyRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/companies", listCompanies)
	r.GET("/companies/:id", getCompany)

	rc := e.Group("")
	rc.Use(RequireRoles("company_manager", "admin"))
	rc.POST("/companies", createCompany)
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
