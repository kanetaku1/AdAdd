package handler

import (
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"github.com/labstack/echo/v4"
)

func RegisterCompanyRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/companies", listCompanies)
}

func listCompanies(c echo.Context) error {
	repo := repository.NewCompanyRepository()
	companies, err := repo.ListAll()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": companies, "message": "success"})
}
