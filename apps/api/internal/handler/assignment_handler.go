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

func getAssignedCompaniesForMe(c echo.Context) error {
	userId := c.Get("userId")
	if userId == nil || userId == "" {
		return respondUnauthorized(c, "unauthenticated")
	}
	uid := userId.(string)
	asvc := service.NewAssignmentService()
	list, err := asvc.ListByUser(uid)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": list, "message": "success"})
}
