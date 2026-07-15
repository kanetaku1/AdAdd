package handler

import (
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

func RegisterYearRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/years", listYears)

	rc := e.Group("")
	rc.Use(RequireRoles("company_manager", "admin"))
	rc.POST("/years", createYear)
}

func listYears(c echo.Context) error {
	svc := service.NewYearService()
	years, err := svc.List()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": years, "message": "success"})
}

func createYear(c echo.Context) error {
	var req model.Year
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}
	svc := service.NewYearService()
	if err := svc.Create(&req); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": req, "message": "created"})
}
