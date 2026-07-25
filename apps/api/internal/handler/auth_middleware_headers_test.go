package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/auth"
	"github.com/labstack/echo/v4"
)

func TestAuthMiddlewareSetsUserContextFromHeadersWhenDevAuthEnabled(t *testing.T) {
	devAuthEnabled = true
	defer func() { devAuthEnabled = false }()

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-User-ID", "user-123")
	req.Header.Set("X-User-Roles", "admin, staff")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	called := false
	handlerFunc := AuthMiddleware(func(c echo.Context) error {
		called = true
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

	if err := handlerFunc(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if !called {
		t.Fatalf("expected the wrapped handler to be called")
	}
}

func TestAuthMiddlewareRejectsHeadersWhenDevAuthDisabled(t *testing.T) {
	devAuthEnabled = false

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-User-ID", "user-123")
	req.Header.Set("X-User-Roles", "admin")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	called := false
	handlerFunc := AuthMiddleware(func(c echo.Context) error {
		called = true
		return c.NoContent(http.StatusOK)
	})

	if err := handlerFunc(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if called {
		t.Fatalf("expected the dev-stub headers to be ignored when devAuthEnabled is false")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}

func TestAuthMiddlewareAcceptsValidBearerToken(t *testing.T) {
	prevIssuer := jwtIssuer
	jwtIssuer = auth.NewJWTIssuer("test-secret")
	defer func() { jwtIssuer = prevIssuer }()

	token, err := jwtIssuer.Issue("user-456", []string{"ADMINISTRATOR"})
	if err != nil {
		t.Fatalf("failed to issue token: %v", err)
	}

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	called := false
	handlerFunc := AuthMiddleware(func(c echo.Context) error {
		called = true
		if uid := c.Get("userId"); uid != "user-456" {
			t.Fatalf("expected userId 'user-456', got %v", uid)
		}
		roles, _ := c.Get("userRoles").([]string)
		if len(roles) != 1 || roles[0] != "ADMINISTRATOR" {
			t.Fatalf("unexpected roles: %v", roles)
		}
		return c.NoContent(http.StatusOK)
	})

	if err := handlerFunc(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if !called {
		t.Fatalf("expected the wrapped handler to be called")
	}
}

func TestAuthMiddlewareRejectsInvalidBearerToken(t *testing.T) {
	prevIssuer := jwtIssuer
	jwtIssuer = auth.NewJWTIssuer("test-secret")
	defer func() { jwtIssuer = prevIssuer }()

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer not-a-real-token")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	called := false
	handlerFunc := AuthMiddleware(func(c echo.Context) error {
		called = true
		return c.NoContent(http.StatusOK)
	})

	if err := handlerFunc(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if called {
		t.Fatalf("expected an invalid token to be rejected before reaching the handler")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}
