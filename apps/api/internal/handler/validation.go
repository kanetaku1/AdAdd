package handler

import (
	"net/http"

	"github.com/shopspring/decimal"
	"github.com/labstack/echo/v4"
)

// Helper to return a standard bad request
func badRequest(c echo.Context, msg string) error {
	return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": msg})
}

func validateNonNegativeAmount(val decimal.Decimal) bool {
	return !val.IsNegative()
}

func validateStatus(status string, allowed []string) bool {
	if status == "" {
		return false
	}
	for _, s := range allowed {
		if s == status {
			return true
		}
	}
	return false
}
