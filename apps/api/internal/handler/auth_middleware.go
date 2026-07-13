package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// Simple auth middleware that reads X-User-ID header and stores it in context.
// In production, replace with real authentication.
func AuthMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		userID := c.Request().Header.Get("X-User-ID")
		if userID == "" {
			// No auth header; for now allow anonymous but set user to empty
			// Optionally return 401: c.JSON(http.StatusUnauthorized, ...)
			c.Set("userId", "")
			return next(c)
		}
		c.Set("userId", userID)
		return next(c)
	}
}
