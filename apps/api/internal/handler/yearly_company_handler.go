package handler

import (
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

func RegisterYearlyCompanyRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/years/:yearId/companies", listYearlyCompanies)
	r.POST("/years/:yearId/companies", createYearlyCompany)
	r.PATCH("/yearly-companies/:id/company-status", updateCompanyStatus)
	r.PATCH("/yearly-companies/:id/phase", updatePhase)
}

func listYearlyCompanies(c echo.Context) error {
	yearId := c.Param("yearId")
	svc := service.NewYearlyCompanyService()
	list, err := svc.ListByYear(yearId)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": list, "message": "success"})
}

func createYearlyCompany(c echo.Context) error {
	yearId := c.Param("yearId")
	var req model.YearlyCompany
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}
	req.YearID = yearId
	svc := service.NewYearlyCompanyService()
	if err := svc.Create(&req); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": req, "message": "created"})
}

func updateCompanyStatus(c echo.Context) error {
	id := c.Param("id")
	var body struct {
		CompanyStatus string `json:"companyStatus"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}
	svc := service.NewYearlyCompanyService()
	yc, err := svc.GetByID(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]interface{}{"error": "yearly company not found"})
	}
	yc.CompanyStatus = body.CompanyStatus
	if err := svc.Update(yc); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": yc, "message": "updated"})
}

func updatePhase(c echo.Context) error {
	id := c.Param("id")
	var body struct {
		Phase string `json:"phase"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}
	svc := service.NewYearlyCompanyService()
	yc, err := svc.GetByID(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]interface{}{"error": "yearly company not found"})
	}
	yc.Phase = body.Phase
	if err := svc.Update(yc); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": yc, "message": "updated"})
}
