package handler

import (
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

func RegisterActivityLogRoutes(e *echo.Echo) {
	r := e.Group("")
	// activity logs are limited to staff and admin
	r.Use(RequireRoles("staff", "admin"))
	r.GET("/yearly-companies/:id/activity-logs", listActivityLogs)
}

func listActivityLogs(c echo.Context) error {
	ycId := c.Param("id")
	svc := service.NewActivityLogService()
	list, err := svc.ListByYearlyCompany(ycId)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": list, "message": "success"})
}
