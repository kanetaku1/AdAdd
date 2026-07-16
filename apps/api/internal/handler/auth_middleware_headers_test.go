package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestAuthMiddlewareSetsUserContextFromHeaders(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-User-ID", "user-123")
	req.Header.Set("X-User-Roles", "admin, staff")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	handler := AuthMiddleware(func(c echo.Context) error {
		uid := c.Get("userId")
		if uid == nil || uid.(string) != "user-123" {
			t.Fatalf("expected userId in context to be 'user-123', got %v", uid)
		}
		roles := c.Get("userRoles")
		if roles == nil {
			t.Fatalf("expected userRoles in context")
		}
		rs := roles.([]string)
		if len(rs) != 2 || rs[0] != "admin" || rs[1] != "staff" {
			t.Fatalf("unexpected roles: %v", rs)
		}
		return c.NoContent(http.StatusOK)
	})

	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
}
