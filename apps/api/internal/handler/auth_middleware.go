package handler

import (
	"strings"

	"github.com/labstack/echo/v4"
)

// Simple auth middleware that reads X-User-ID header and stores it in context.
// Also reads X-User-Roles header (comma-separated) and stores as []string.
// In production, replace with real authentication.
func AuthMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		userID := c.Request().Header.Get("X-User-ID")
		rolesHeader := c.Request().Header.Get("X-User-Roles")
		var roles []string
		if rolesHeader != "" {
			for _, r := range strings.Split(rolesHeader, ",") {
				r = strings.TrimSpace(r)
				if r != "" {
					roles = append(roles, r)
				}
			}
		}
		c.Set("userId", userID)
		c.Set("userRoles", roles)
		return next(c)
	}
}

// RequireRoles returns middleware that enforces at least one of the allowed roles is present.
func RequireRoles(allowed ...string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			v := c.Get("userRoles")
			if v == nil {
				return respondForbidden(c, "forbidden")
			}
			userRoles, ok := v.([]string)
			if !ok {
				return respondForbidden(c, "forbidden")
			}
			for _, ur := range userRoles {
				for _, a := range allowed {
					if strings.EqualFold(ur, a) {
						return next(c)
					}
				}
			}
			return respondForbidden(c, "forbidden")
		}
	}
}
