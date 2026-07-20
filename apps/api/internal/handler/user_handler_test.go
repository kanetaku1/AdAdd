package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestGetCurrentUserUnauthenticated(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/users/me", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := getCurrentUser(c)
	if err != nil {
		t.Fatalf("expected no error from handler, got %v", err)
	}

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}

func TestRequireRolesMiddleware(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	mw := RequireRoles("admin")
	handler := mw(func(c echo.Context) error {
		return c.String(http.StatusOK, "ok")
	})

	c.Set("userRoles", []string{"user"})
	err := handler(c)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403 Forbidden since role doesn't match, got %d", rec.Code)
	}

	rec2 := httptest.NewRecorder()
	c2 := e.NewContext(req, rec2)
	c2.Set("userRoles", []string{"admin"})
	_ = handler(c2)
	if rec2.Code != http.StatusOK {
		t.Errorf("expected 200 OK since role matches, got %d", rec2.Code)
	}
}

func TestRegisterUserRoutes(t *testing.T) {
	e := echo.New()
	RegisterUserRoutes(e)

	// Check routes are registered
	var foundGetUsers, foundPostUsers, foundPatchUsers bool
	for _, r := range e.Routes() {
		if r.Path == "/users" && r.Method == http.MethodGet {
			foundGetUsers = true
		}
		if r.Path == "/users" && r.Method == http.MethodPost {
			foundPostUsers = true
		}
		if r.Path == "/users/:id" && r.Method == http.MethodPatch {
			foundPatchUsers = true
		}
	}

	if !foundGetUsers || !foundPostUsers || !foundPatchUsers {
		t.Errorf("Missing expected user admin routes")
	}
}
