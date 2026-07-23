package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func RegisterAdvisorRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/advisor-assignments", listAdvisorAssignments)
	r.GET("/users/:userId/advisor-members", getAdvisorMembers)

	rAdmin := e.Group("")
	rAdmin.Use(RequireRoles("admin"))
	rAdmin.POST("/advisor-assignments", createAdvisorAssignment)
	rAdmin.DELETE("/advisor-assignments/:id", deleteAdvisorAssignment)
}

func createAdvisorAssignment(c echo.Context) error {
	var body struct {
		YearID        string `json:"yearId"`
		AdvisorUserID string `json:"advisorUserId"`
		MemberUserID  string `json:"memberUserId"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	if body.YearID == "" || body.AdvisorUserID == "" || body.MemberUserID == "" {
		return respondBadRequest(c, "yearId, advisorUserId, and memberUserId are required")
	}
	if body.AdvisorUserID == body.MemberUserID {
		return respondBadRequest(c, "advisor and member must be different users")
	}

	req := &model.AdvisorAssignment{
		YearID:     body.YearID,
		AdvisorID:  body.AdvisorUserID,
		MemberID:   body.MemberUserID,
		AssignedAt: time.Now(),
	}
	svc := service.NewAdvisorService()
	if err := svc.Create(req); err != nil {
		if err == service.ErrAdvisorAssignmentExists {
			return respondConflict(c, "advisor assignment already exists")
		}
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": req, "message": "created"})
}

func deleteAdvisorAssignment(c echo.Context) error {
	id := c.Param("id")
	svc := service.NewAdvisorService()
	if err := svc.Delete(id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return respondNotFound(c, "advisor assignment not found")
		}
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"message": "deleted"})
}

func listAdvisorAssignments(c echo.Context) error {
	yearId := c.QueryParam("yearId")
	if yearId == "" {
		return respondBadRequest(c, "yearId is required")
	}
	svc := service.NewAdvisorService()
	list, err := svc.ListByYear(yearId)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": list, "message": "success"})
}

func getAdvisorMembers(c echo.Context) error {
	userId := c.Param("userId")
	svc := service.NewAdvisorService()
	list, err := svc.ListMembersByAdvisor(userId)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": list, "message": "success"})
}
