package handler

import (
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
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
	}
	if err := c.Bind(&body); err != nil {
		return respondRequestBodyError(c, err, "invalid request body")
	}

	ycRepo := repository.NewYearlyCompanyRepository()
	if _, err := ycRepo.GetByIDRaw(ycId); err != nil {
		return respondNotFound(c, "yearly company not found")
	}

	userID := ""
	if body.UserID != nil {
		userID = *body.UserID
	}

	if userID != "" {
		userRepo := repository.NewUserRepository()
		user, err := userRepo.GetByID(userID)
		if err != nil {
			return respondNotFound(c, "user not found")
		}
		if !user.IsActive {
			return respondBadRequest(c, "user is not active")
		}
	}

	actorID := ""
	if uid := c.Get("userId"); uid != nil {
		actorID, _ = uid.(string)
	}

	svc := service.NewAssignmentService()
	result, changed, err := svc.AssignOrClear(ycId, userID, actorID)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	if !changed {
		return c.JSON(http.StatusOK, map[string]interface{}{"data": result, "message": "unchanged"})
	}
	if result == nil {
		return c.JSON(http.StatusOK, map[string]interface{}{"data": nil, "message": "cleared"})
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": result, "message": "created"})
}
