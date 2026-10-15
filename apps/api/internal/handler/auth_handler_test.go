package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/auth"
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/testdb"
	"github.com/labstack/echo/v4"
)

// startSessionStatus runs startSession for an email Google has already
// verified, against the test database (spec/api.md#Login).
func startSessionStatus(t *testing.T, email string) int {
	t.Helper()
	prevIssuer := jwtIssuer
	jwtIssuer = auth.NewJWTIssuer("test-secret")
	t.Cleanup(func() { jwtIssuer = prevIssuer })

	e := echo.New()
	rec := httptest.NewRecorder()
	c := e.NewContext(httptest.NewRequest(http.MethodPost, "/auth/google", nil), rec)
	if err := startSession(c, email); err != nil {
		t.Fatalf("startSession returned error: %v", err)
	}
	return rec.Code
}

func TestStartSessionForActiveUser(t *testing.T) {
	testdb.Open(t)
	if err := db.DB.Create(&model.User{ID: "user-active", Name: "active", Email: "active@example.com", IsActive: true}).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}

	if got := startSessionStatus(t, "active@example.com"); got != http.StatusOK {
		t.Fatalf("status = %d, want %d", got, http.StatusOK)
	}
}

func TestStartSessionRejectsInactiveUser(t *testing.T) {
	testdb.Open(t)
	user := model.User{ID: "user-inactive", Name: "inactive", Email: "inactive@example.com"}
	if err := db.DB.Create(&user).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}
	// is_active has a default in the schema; set false explicitly.
	if err := db.DB.Model(&user).Update("is_active", false).Error; err != nil {
		t.Fatalf("deactivate user: %v", err)
	}

	if got := startSessionStatus(t, "inactive@example.com"); got != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", got, http.StatusForbidden)
	}
}

func TestStartSessionRejectsUnregisteredEmail(t *testing.T) {
	testdb.Open(t)

	if got := startSessionStatus(t, "nobody@example.com"); got != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", got, http.StatusForbidden)
	}
}
