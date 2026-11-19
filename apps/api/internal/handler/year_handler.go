package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

type createYearRequest struct {
	Name      string `json:"name"`
	StartDate string `json:"startDate"`
	EndDate   string `json:"endDate"`
}

func RegisterYearRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/years", listYears)

	rc := e.Group("")
	rc.Use(RequireRoles("ADMINISTRATOR"))
	rc.POST("/years", createYear)
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
	var req createYearRequest
	if err := c.Bind(&req); err != nil {
		return respondBadRequest(c, err.Error())
	}

	if strings.TrimSpace(req.Name) == "" {
		return respondBadRequest(c, "name is required")
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return respondBadRequest(c, "startDate must be a valid YYYY-MM-DD date")
	}
	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return respondBadRequest(c, "endDate must be a valid YYYY-MM-DD date")
	}
	if startDate.After(endDate) {
		return respondBadRequest(c, "startDate must not be after endDate")
	}

	svc := service.NewYearService()

	if exists, err := svc.NameExists(req.Name); err != nil {
		return respondInternalServerError(c, err)
	} else if exists {
		return respondConflict(c, "a year with this name already exists")
	}

	year := &model.Year{
		Name:      strings.TrimSpace(req.Name),
		StartDate: model.Date(startDate),
		EndDate:   model.Date(endDate),
	}
	if err := svc.Create(year); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": year, "message": "created"})
}
