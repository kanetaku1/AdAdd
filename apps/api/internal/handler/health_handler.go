package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func RegisterHealthRoutes(e *echo.Echo) {
	e.GET("/health", healthCheck)
}

func healthCheck(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"status": "ok",
	})
}
