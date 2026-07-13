package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
)

func RegisterAdvisorRoutes(e *echo.Echo) {
	r := e.Group("")
	r.POST("/advisor-assignments", createAdvisorAssignment)
	r.GET("/users/:userId/advisor-members", getAdvisorMembers)
}

func createAdvisorAssignment(c echo.Context) error {
	var req model.AdvisorAssignment
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}
	svc := service.NewAdvisorService()
	if err := svc.Create(&req); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": req, "message": "created"})
}

func getAdvisorMembers(c echo.Context) error {
	userId := c.Param("userId")
	svc := service.NewAdvisorService()
	list, err := svc.ListMembersByAdvisor(userId)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": list, "message": "success"})
}
