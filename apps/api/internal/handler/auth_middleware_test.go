package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestRequireRolesAllowsConfiguredRole(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.Set("userRoles", []string{"admin"})
	if err := RequireRoles("admin")(func(c echo.Context) error { return c.NoContent(http.StatusOK) })(c); err != nil {
		t.Fatalf("expected middleware to allow role: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}
}

func TestRequireRolesRejectsMissingRole(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.Set("userRoles", []string{"member"})
	err := RequireRoles("admin")(func(c echo.Context) error { return c.NoContent(http.StatusOK) })(c)
	if err != nil {
		t.Fatalf("expected middleware to return a response, not an error: %v", err)
	}
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d", http.StatusForbidden, rec.Code)
	}
}
