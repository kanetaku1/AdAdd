package handler

import (
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

func RegisterAssignmentRoutes(e *echo.Echo) {
	r := e.Group("")
	rAdmin := e.Group("")
	rAdmin.Use(RequireRoles("admin"))
	rAdmin.POST("/yearly-companies/:id/assignments", createAssignment)
	r.GET("/users/me/companies", getAssignedCompaniesForMe)
}

func createAssignment(c echo.Context) error {
	ycId := c.Param("id")
	var body struct {
		UserID *string `json:"userId"`
		Role   string  `json:"role"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}

	userID := ""
	if body.UserID != nil {
		userID = *body.UserID
	}

	actorID := ""
	if uid := c.Get("userId"); uid != nil {
		actorID, _ = uid.(string)
	}

	svc := service.NewAssignmentService()
	result, err := svc.AssignOrClear(ycId, userID, body.Role, actorID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	if result == nil {
		return c.JSON(http.StatusOK, map[string]interface{}{"data": nil, "message": "cleared"})
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": result, "message": "created"})
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
