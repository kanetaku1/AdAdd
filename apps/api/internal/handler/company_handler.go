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

	rc := e.Group("")
	rc.Use(RequireRoles("company_manager", "admin"))
	rc.POST("/companies", createCompany)
	rc.PATCH("/companies/:id", updateCompany)
}

func listCompanies(c echo.Context) error {
	svc := service.NewCompanyService()
	companies, err := svc.ListAll()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": companies, "message": "success"})
}

func createCompany(c echo.Context) error {
	var req model.Company
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}
	svc := service.NewCompanyService()
	if err := svc.Create(&req); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": req, "message": "created"})
}

func updateCompany(c echo.Context) error {
	id := c.Param("id")
	var req model.Company
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}
	req.ID = id
	svc := service.NewCompanyService()
	if err := svc.Update(&req); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": req, "message": "updated"})
}
