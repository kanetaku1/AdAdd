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
	rc.PATCH("/years/:yearId/document-issuer", updateYearDocumentIssuer)
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
	var req struct {
		Name      string     `json:"name"`
		StartDate model.Date `json:"startDate"`
		EndDate   model.Date `json:"endDate"`
	}
	if err := c.Bind(&req); err != nil {
		return respondRequestBodyError(c, err, "invalid request body")
	}
	svc := service.NewYearService()
	year := model.Year{
		Name:      req.Name,
		StartDate: req.StartDate,
		EndDate:   req.EndDate,
	}
	if err := svc.Create(&year); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": year, "message": "created"})
}

func updateYearDocumentIssuer(c echo.Context) error {
	var req service.DocumentIssuerInput
	if err := c.Bind(&req); err != nil {
		return respondRequestBodyError(c, err, "invalid request body")
	}
	year, err := service.NewYearService().UpdateDocumentIssuer(c.Param("yearId"), req)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return respondNotFound(c, "year not found")
	}
	if err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": year, "message": "success"})
}
