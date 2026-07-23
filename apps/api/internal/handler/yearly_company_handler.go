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
	r.GET("/yearly-companies/:id", getYearlyCompany)
	r.GET("/yearly-companies/:id/progress", getProgress)
	// Create and updates require staff or admin
	rStaff := e.Group("")
	rStaff.Use(RequireRoles("staff", "admin"))
	rStaff.POST("/years/:yearId/companies", createYearlyCompany)
	rStaff.PATCH("/yearly-companies/:id/company-status", updateCompanyStatus)
	rStaff.PATCH("/yearly-companies/:id/phase", updatePhase)
	rStaff.PATCH("/yearly-companies/:id/progress", updateProgress)
}

func getYearlyCompany(c echo.Context) error {
	id := c.Param("id")
	svc := service.NewYearlyCompanyService()
	yc, err := svc.GetByID(id)
	if err != nil {
		return respondNotFound(c, "yearly company not found")
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": yc, "message": "success"})
}

func getProgress(c echo.Context) error {
	id := c.Param("id")
	svc := service.NewYearlyCompanyService()
	yc, err := svc.GetByID(id)
	if err != nil {
		return respondNotFound(c, "yearly company not found")
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"data":    map[string]string{"progress": yc.Progress},
		"message": "success",
	})
}

func updateProgress(c echo.Context) error {
	id := c.Param("id")
	var body struct {
		Progress string `json:"progress"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	if err := ValidateProgress(body.Progress); err != nil {
		return respondBadRequest(c, err.Error())
	}
	svc := service.NewYearlyCompanyService()
	yc, err := svc.GetByID(id)
	if err != nil {
		return respondNotFound(c, "yearly company not found")
	}
	yc.Progress = body.Progress
	if err := svc.Update(&yc.YearlyCompany); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": yc, "message": "updated"})
}

func listYearlyCompanies(c echo.Context) error {
	yearId := c.Param("yearId")
	svc := service.NewYearlyCompanyService()
	list, err := svc.ListByYear(yearId)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": list, "message": "success"})
}

func createYearlyCompany(c echo.Context) error {
	yearId := c.Param("yearId")
	var req model.YearlyCompany
	if err := c.Bind(&req); err != nil {
		return respondBadRequest(c, err.Error())
	}
	// validation
	if req.CompanyID == "" {
		return respondBadRequest(c, "companyId is required")
	}
	req.YearID = yearId
	svc := service.NewYearlyCompanyService()
	if err := svc.Create(&req); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": req, "message": "created"})
}

func updateCompanyStatus(c echo.Context) error {
	id := c.Param("id")
	var body struct {
		CompanyStatus string `json:"companyStatus"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	if err := ValidateCompanyStatus(body.CompanyStatus); err != nil {
		return respondBadRequest(c, err.Error())
	}
	svc := service.NewYearlyCompanyService()
	yc, err := svc.GetByID(id)
	if err != nil {
		return respondNotFound(c, "yearly company not found")
	}
	yc.CompanyStatus = body.CompanyStatus
	if err := svc.Update(&yc.YearlyCompany); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": yc, "message": "updated"})
}

func updatePhase(c echo.Context) error {
	id := c.Param("id")
	var body struct {
		Phase string `json:"phase"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	if err := ValidatePhase(body.Phase); err != nil {
		return respondBadRequest(c, err.Error())
	}
	svc := service.NewYearlyCompanyService()
	yc, err := svc.GetByID(id)
	if err != nil {
		return respondNotFound(c, "yearly company not found")
	}
	yc.Phase = body.Phase
	if err := svc.Update(&yc.YearlyCompany); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": yc, "message": "updated"})
}
