package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
)

func RegisterActivityLogRoutes(e *echo.Echo) {
	r := e.Group("")
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
