package handler

import (
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"github.com/labstack/echo/v4"
)

func RegisterUserRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/users/me", getCurrentUser)
}

func getCurrentUser(c echo.Context) error {
	uid := c.Get("userId")
	if uid == nil || uid == "" {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{"error": "unauthenticated"})
	}
	userId := uid.(string)
	repo := repository.NewUserRepository()
	u, err := repo.GetByID(userId)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]interface{}{"error": "user not found"})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": u, "message": "success"})
}
