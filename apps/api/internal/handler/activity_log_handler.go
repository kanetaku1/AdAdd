package handler

import (
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

func RegisterActivityLogRoutes(e *echo.Echo) {
	r := e.Group("")
	// 活動記録 is sales history: Finance-only and no-Role Users do not need it
	// (UC-14, spec/api.md#Authorization Matrix, Issue #167).
	r.Use(RequireRoles("SPONSORSHIP_MEMBER", "ADVISOR", "ADVERTISEMENT_MANAGER", "ADMINISTRATOR"))
	r.GET("/yearly-companies/:id/activity-logs", listActivityLogs)
}

func listActivityLogs(c echo.Context) error {
	ycId := c.Param("id")
	svc := service.NewActivityLogService()
	list, err := svc.ListByYearlyCompany(ycId)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": list, "message": "success"})
}
