package handler

import "github.com/labstack/echo/v4"

func RegisterRoutes(e *echo.Echo) {
	// Public — must be registered before AuthMiddleware, since this is how
	// a session is obtained in the first place (spec/api.md#Login).
	RegisterAuthRoutes(e)

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
	RegisterRoleRoutes(e)
}
