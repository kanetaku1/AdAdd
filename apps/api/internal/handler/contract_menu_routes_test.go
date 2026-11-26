package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestReviewContractMenuRoleBoundary(t *testing.T) {
	cases := []struct {
		name       string
		roles      []string
		wantStatus int
	}{
		{name: "sponsorship member", roles: []string{"SPONSORSHIP_MEMBER"}, wantStatus: http.StatusForbidden},
		{name: "advisor", roles: []string{"ADVISOR"}, wantStatus: http.StatusForbidden},
		{name: "finance", roles: []string{"FINANCE_DEPARTMENT"}, wantStatus: http.StatusForbidden},
		{name: "no role", roles: []string{}, wantStatus: http.StatusForbidden},
		// A malformed body reaches the handler and returns 400, proving the role
		// middleware allowed these two roles through without touching the DB.
		{name: "advertisement manager", roles: []string{"ADVERTISEMENT_MANAGER"}, wantStatus: http.StatusBadRequest},
		{name: "administrator", roles: []string{"ADMINISTRATOR"}, wantStatus: http.StatusBadRequest},
	}
	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			e := echo.New()
			RegisterContractMenuRoutes(e)
			e.Use(withRoles(testCase.roles...))

			req := httptest.NewRequest(http.MethodPost, "/contract-menus/1/submissions/2/review", strings.NewReader("{"))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			e.ServeHTTP(rec, req)

			if rec.Code != testCase.wantStatus {
				t.Fatalf("expected status %d, got %d", testCase.wantStatus, rec.Code)
			}
		})
	}
}

func TestUploadContractMenuRejectsAdvisor(t *testing.T) {
	e := echo.New()
	RegisterContractMenuRoutes(e)
	e.Use(withRoles("ADVISOR"))

	req := httptest.NewRequest(http.MethodPost, "/contract-menus/1/production/files", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected status %d for ADVISOR upload, got %d", http.StatusForbidden, rec.Code)
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
