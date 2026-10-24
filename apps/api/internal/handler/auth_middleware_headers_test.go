package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/auth"
	"github.com/labstack/echo/v4"
)

// The former development header stub is gone: X-User-ID / X-User-Roles
// never authenticate (Issue #156).
func TestAuthMiddlewareIgnoresDevelopmentHeaders(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-User-ID", "user-123")
	req.Header.Set("X-User-Roles", "ADMINISTRATOR")
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
		t.Fatalf("expected X-User-ID / X-User-Roles to be ignored")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}

func TestIsPublicPathMatchesExactPathsOnly(t *testing.T) {
	cases := map[string]bool{
		"/health":        true,
		"/auth/google":   true,
		"/auth/":         false,
		"/auth/other":    false,
		"/auth/google/x": false,
		"/companies":     false,
	}
	for path, want := range cases {
		if got := isPublicPath(path); got != want {
			t.Errorf("isPublicPath(%q) = %v, want %v", path, got, want)
		}
	}
}

// stubSessionRoles replaces the MySQL lookup of the signed-in User for one test.
func stubSessionRoles(t *testing.T, load func(userID string) ([]string, error)) {
	t.Helper()
	prev := loadSessionRoles
	loadSessionRoles = load
	t.Cleanup(func() { loadSessionRoles = prev })
}

func TestAuthMiddlewareAcceptsValidBearerToken(t *testing.T) {
	prevIssuer := jwtIssuer
	jwtIssuer = auth.NewJWTIssuer("test-secret")
	defer func() { jwtIssuer = prevIssuer }()
	// Roles come from the User's current grants, not from the token.
	stubSessionRoles(t, func(userID string) ([]string, error) {
		if userID != "user-456" {
			t.Fatalf("looked up %q, want user-456", userID)
		}
		return []string{"ADMINISTRATOR"}, nil
	})

	token, err := jwtIssuer.Issue("user-456")
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

func TestAuthMiddlewareRejectsTokenOfUnavailableUser(t *testing.T) {
	prevIssuer := jwtIssuer
	jwtIssuer = auth.NewJWTIssuer("test-secret")
	defer func() { jwtIssuer = prevIssuer }()
	// Deactivated or deleted after the token was issued.
	stubSessionRoles(t, func(string) ([]string, error) { return nil, errSessionUserUnavailable })

	token, err := jwtIssuer.Issue("user-789")
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
		return c.NoContent(http.StatusOK)
	})

	if err := handlerFunc(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if called {
		t.Fatalf("expected the token of an unavailable User to be rejected")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, rec.Code)
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
