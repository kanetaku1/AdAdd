package handler

import (
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

func RegisterAssignmentRoutes(e *echo.Echo) {
	rAdmin := e.Group("")
	rAdmin.Use(RequireRoles("ADMINISTRATOR"))
	rAdmin.POST("/yearly-companies/:id/assignments", createAssignment)
}

func createAssignment(c echo.Context) error {
	ycId := c.Param("id")
	var body struct {
		UserID *string `json:"userId"`
		Role   string  `json:"role"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
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
		return respondInternalServerError(c, err)
	}
	if result == nil {
		return c.JSON(http.StatusOK, map[string]interface{}{"data": nil, "message": "cleared"})
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": result, "message": "created"})
}
