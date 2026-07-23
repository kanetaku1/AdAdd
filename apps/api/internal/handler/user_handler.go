package handler

import (
	"errors"
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

func RegisterUserRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/users/me", getCurrentUser)

	admin := e.Group("/users", RequireRoles("admin"))
	admin.GET("", listUsers)
	admin.POST("", createUser)
	admin.PATCH("/:id", updateUser)
}

func getCurrentUser(c echo.Context) error {
	uid := c.Get("userId")
	if uid == nil || uid == "" {
		return respondUnauthorized(c, "unauthenticated")
	}
	userId := uid.(string)
	repo := repository.NewUserRepository()
	u, err := repo.GetByID(userId)
	if err != nil {
		return respondNotFound(c, "user not found")
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": u, "message": "success"})
}

func listUsers(c echo.Context) error {
	svc := service.NewUserService()
	users, err := svc.ListAll()
	if err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": users, "message": "success"})
}

func createUser(c echo.Context) error {
	var user model.User
	if err := c.Bind(&user); err != nil {
		return respondBadRequest(c, "invalid request body")
	}

	svc := service.NewUserService()
	if err := svc.Create(&user); err != nil {
		if errors.Is(err, service.ErrEmailAlreadyExists) {
			return respondConflict(c, err.Error())
		}
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": user, "message": "success"})
}

func updateUser(c echo.Context) error {
	id := c.Param("id")
	var req service.UserUpdateOpts
	if err := c.Bind(&req); err != nil {
		return respondBadRequest(c, "invalid request body")
	}

	svc := service.NewUserService()
	user, err := svc.Update(id, req)
	if err != nil {
		if errors.Is(err, service.ErrEmailAlreadyExists) {
			return respondConflict(c, err.Error())
		}
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": user, "message": "success"})
}
