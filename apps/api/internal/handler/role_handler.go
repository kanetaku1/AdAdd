package handler

import (
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

// RegisterRoleRoutes wires GET /roles and the User<->Role grant/revoke
// endpoints (spec/api.md#List Roles, #Grant Role, #Revoke Role).
//
// Uses the existing "admin" RequireRoles string, matching every other
// handler today — Issue #61 reconciles all of these to the 7 canonical Role
// codes in one pass, this isn't the place to get ahead of that.
func RegisterRoleRoutes(e *echo.Echo) {
	admin := e.Group("", RequireRoles("admin"))
	admin.GET("/roles", listRoles)
	admin.POST("/users/:userId/roles", grantRole)
	admin.DELETE("/users/:userId/roles/:roleId", revokeRole)
}

func listRoles(c echo.Context) error {
	svc := service.NewRoleService()
	roles, err := svc.ListAll()
	if err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": roles, "message": "success"})
}

func grantRole(c echo.Context) error {
	userId := c.Param("userId")
	var body struct {
		RoleID string `json:"roleId"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	if body.RoleID == "" {
		return respondBadRequest(c, "roleId is required")
	}
	svc := service.NewRoleService()
	ur, err := svc.GrantToUser(userId, body.RoleID)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": ur, "message": "created"})
}

func revokeRole(c echo.Context) error {
	userId := c.Param("userId")
	roleId := c.Param("roleId")
	svc := service.NewRoleService()
	if err := svc.RevokeFromUser(userId, roleId); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"message": "deleted"})
}
