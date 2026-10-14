package handler

import "github.com/labstack/echo/v4"

func RegisterRoutes(e *echo.Echo) {
	// Public — this is how a session is obtained in the first place
	// (spec/api.md#Login). e.Use below still runs for these routes;
	// AuthMiddleware skips them by path (isPublicPath), as it does /health.
	RegisterAuthRoutes(e)

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
