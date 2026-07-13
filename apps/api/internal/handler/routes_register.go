package handler

import "github.com/labstack/echo/v4"

func RegisterRoutes(e *echo.Echo) {
	// Auth middleware applied to API routes; health remains public
	e.Use(AuthMiddleware)

	RegisterCompanyRoutes(e)
	RegisterYearlyCompanyRoutes(e)
	RegisterContractRoutes(e)
	RegisterCompanyRoutes(e) // companies already registered; harmless
}
