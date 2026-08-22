package handler

import (
	"errors"
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func RegisterYearRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/years", listYears)

	rc := e.Group("")
	rc.Use(RequireRoles("ADMINISTRATOR"))
	rc.POST("/years", createYear)
	rc.DELETE("/years/:yearId", deleteYear)
}

func listYears(c echo.Context) error {
	svc := service.NewYearService()
	years, err := svc.List()
	if err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": years, "message": "success"})
}

func createYear(c echo.Context) error {
	var req model.Year
	if err := c.Bind(&req); err != nil {
		return respondBadRequest(c, err.Error())
	}
	svc := service.NewYearService()
	if err := svc.Create(&req); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": req, "message": "created"})
}

func deleteYear(c echo.Context) error {
	id := c.Param("yearId")
	svc := service.NewYearService()
	if err := svc.Delete(id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return respondNotFound(c, "year not found")
		}
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"message": "deleted"})
}
