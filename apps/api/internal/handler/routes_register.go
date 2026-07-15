package handler

import "github.com/labstack/echo/v4"

func RegisterRoutes(e *echo.Echo) {
	// Auth middleware applied to API routes; health remains public
	e.Use(AuthMiddleware)

	RegisterCompanyRoutes(e)
	RegisterYearRoutes(e)
	RegisterYearlyCompanyRoutes(e)
	RegisterContractRoutes(e)
	RegisterPaymentRoutes(e)
	RegisterContractMenuRoutes(e)
	RegisterAssignmentRoutes(e)
	RegisterSponsorshipMenuRoutes(e)
	RegisterUserRoutes(e)
	RegisterActivityLogRoutes(e)
	RegisterAdvisorRoutes(e)
}
