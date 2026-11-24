package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type createYearRequest struct {
	Name          string `json:"name"`
	StartDate     string `json:"startDate"`
	EndDate       string `json:"endDate"`
	EditionNumber *int   `json:"editionNumber"`
}

type updateYearRequest struct {
	Name          *string          `json:"name"`
	StartDate     *string          `json:"startDate"`
	EndDate       *string          `json:"endDate"`
	EditionNumber *int             `json:"editionNumber"`
	RawEdition    *json.RawMessage `json:"-"`
}

func RegisterYearRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/years", listYears)

	rc := e.Group("")
	rc.Use(RequireRoles("ADMINISTRATOR"))
	rc.POST("/years", createYear)
	rc.PATCH("/years/:yearId", updateYear)
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
	var req createYearRequest
	if err := c.Bind(&req); err != nil {
		return respondRequestBodyError(c, err, "invalid request body")
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
		Name:          strings.TrimSpace(req.Name),
		StartDate:     model.Date(startDate),
		EndDate:       model.Date(endDate),
		EditionNumber: req.EditionNumber,
	}
	if err := svc.Create(year); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": year, "message": "created"})
}

func updateYear(c echo.Context) error {
	body, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return respondRequestBodyError(c, err, "invalid request body")
	}

	var req updateYearRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return respondRequestBodyError(c, err, "invalid request body")
	}

	input := service.UpdateYearInput{
		Name:      req.Name,
		StartDate: req.StartDate,
		EndDate:   req.EndDate,
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err == nil {
		if _, ok := raw["editionNumber"]; ok {
			input.EditionNumber = req.EditionNumber
			input.EditionNumberSent = true
		}
	}

	svc := service.NewYearService()
	year, err := svc.Update(c.Param("yearId"), input)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return respondNotFound(c, "year not found")
	}
	if errors.Is(err, service.ErrPastYear) {
		return respondConflict(c, "past year is read-only")
	}
	if errors.Is(err, service.ErrInvalidDate) {
		return respondBadRequest(c, "startDate and endDate must be valid YYYY-MM-DD dates")
	}
	if err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": year, "message": "success"})
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
