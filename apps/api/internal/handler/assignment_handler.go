package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
)

func RegisterAssignmentRoutes(e *echo.Echo) {
	r := e.Group("")
	r.POST("/yearly-companies/:id/assignments", createAssignment)
	r.GET("/users/me/companies", getAssignedCompaniesForMe)
}

func createAssignment(c echo.Context) error {
	ycId := c.Param("id")
	var req model.Assignment
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}
	req.YearlyCompanyID = ycId
	svc := service.NewAssignmentService()
	if err := svc.Create(&req); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	// Activity log
	alRepo := repository.NewActivityLogRepository()
	alRepo.Create(&model.ActivityLog{
		YearlyCompanyID: req.YearlyCompanyID,
		UserID: req.UserID,
		Action: "ASSIGNED_MEMBER",
		Description: "Member assigned to YearlyCompany",
	})
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": req, "message": "created"})
}

func getAssignedCompaniesForMe(c echo.Context) error {
	userId := c.Get("userId")
	if userId == nil || userId == "" {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{"error": "unauthenticated"})
	}
	uid := userId.(string)
	asvc := service.NewAssignmentService()
	list, err := asvc.ListByUser(uid)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": list, "message": "success"})
}
