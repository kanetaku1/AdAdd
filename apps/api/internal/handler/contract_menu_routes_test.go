package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

// Deletion is Administrator-only system-wide (spec/api.md#Authorization
// Matrix). Sponsorship Member may create/update Contract Menus but must be
// rejected before the handler runs, so no DB access happens here.
func TestDeleteContractMenuRejectsSponsorshipMember(t *testing.T) {
	e := echo.New()
	RegisterContractMenuRoutes(e)
	e.Use(withRoles("SPONSORSHIP_MEMBER"))

	req := httptest.NewRequest(http.MethodDelete, "/contract-menus/1", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected status %d for SPONSORSHIP_MEMBER, got %d", http.StatusForbidden, rec.Code)
	}
}

func TestDeleteContractMenuRejectsRolelessUser(t *testing.T) {
	e := echo.New()
	RegisterContractMenuRoutes(e)
	e.Use(withRoles())

	req := httptest.NewRequest(http.MethodDelete, "/contract-menus/1", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected status %d for a user with no Role, got %d", http.StatusForbidden, rec.Code)
	}
}

func withRoles(roles ...string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Set("userRoles", roles)
			return next(c)
		}
	}
}
