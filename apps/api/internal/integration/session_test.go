package integration

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/auth"
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/handler"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/testdb"
	"github.com/labstack/echo/v4"
)

// sessionAPI is the full API with the development header stub disabled, so
// requests can only authenticate with a session JWT (spec/api.md#Authentication).
type sessionAPI struct {
	t      *testing.T
	server *echo.Echo
	issuer *auth.JWTIssuer
}

func newSessionAPI(t *testing.T) sessionAPI {
	t.Helper()
	testdb.Open(t)

	issuer := auth.NewJWTIssuer("test-secret")
	handler.InitAuth(issuer, nil, false)
	server := echo.New()
	handler.RegisterHealthRoutes(server)
	handler.RegisterRoutes(server)
	return sessionAPI{t: t, server: server, issuer: issuer}
}

// send makes a request, with a session JWT for userID when it is not empty.
func (api sessionAPI) send(method, path, userID, body string) *httptest.ResponseRecorder {
	api.t.Helper()
	request := httptest.NewRequest(method, path, bytes.NewReader([]byte(body)))
	request.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	if userID != "" {
		token, err := api.issuer.Issue(userID)
		if err != nil {
			api.t.Fatalf("issue token: %v", err)
		}
		request.Header.Set("Authorization", "Bearer "+token)
	}
	recorder := httptest.NewRecorder()
	api.server.ServeHTTP(recorder, request)
	return recorder
}

// createUserWithRole stores an active User and grants one Role, as an Administrator would.
func createUserWithRole(t *testing.T, id, roleCode string) {
	t.Helper()
	if err := db.DB.Create(&model.User{ID: id, Name: id, Email: id + "@example.com", IsActive: true}).Error; err != nil {
		t.Fatalf("create user %s: %v", id, err)
	}
	var role model.Role
	if err := db.DB.First(&role, "code = ?", roleCode).Error; err != nil {
		t.Fatalf("load role %s: %v", roleCode, err)
	}
	if err := db.DB.Create(&model.UserRole{UserID: id, RoleID: role.ID, AssignedAt: time.Now()}).Error; err != nil {
		t.Fatalf("grant role %s to %s: %v", roleCode, id, err)
	}
}

func TestSessionRolesComeFromMySQL(t *testing.T) {
	api := newSessionAPI(t)
	createUserWithRole(t, "user-finance", "FINANCE_DEPARTMENT")

	response := api.send(http.MethodGet, "/users/me", "user-finance", "")
	expectStatus(t, response, http.StatusOK)
	me := decodeData[struct {
		ID    string   `json:"id"`
		Roles []string `json:"roles"`
	}](t, response)
	if me.ID != "user-finance" || len(me.Roles) != 1 || me.Roles[0] != "FINANCE_DEPARTMENT" {
		t.Fatalf("/users/me = %+v, want user-finance with FINANCE_DEPARTMENT", me)
	}
}

func TestRevokedRoleTakesEffectOnNextRequest(t *testing.T) {
	api := newSessionAPI(t)
	createUserWithRole(t, "user-administrator", "ADMINISTRATOR")

	// GET /roles is Administrator-only.
	expectStatus(t, api.send(http.MethodGet, "/roles", "user-administrator", ""), http.StatusOK)

	if err := db.DB.Where("user_id = ?", "user-administrator").Delete(&model.UserRole{}).Error; err != nil {
		t.Fatalf("revoke role: %v", err)
	}
	expectStatus(t, api.send(http.MethodGet, "/roles", "user-administrator", ""), http.StatusForbidden)
}

func TestDeactivatedUserIsRejectedOnNextRequest(t *testing.T) {
	api := newSessionAPI(t)
	createUserWithRole(t, "user-member", "SPONSORSHIP_MEMBER")

	expectStatus(t, api.send(http.MethodGet, "/users/me", "user-member", ""), http.StatusOK)

	if err := db.DB.Model(&model.User{}).Where("id = ?", "user-member").Update("is_active", false).Error; err != nil {
		t.Fatalf("deactivate user: %v", err)
	}
	expectStatus(t, api.send(http.MethodGet, "/users/me", "user-member", ""), http.StatusUnauthorized)
}

func TestTokenOfUnknownUserIsRejected(t *testing.T) {
	api := newSessionAPI(t)

	expectStatus(t, api.send(http.MethodGet, "/users/me", "user-that-never-existed", ""), http.StatusUnauthorized)
}

// Without the development header stub, the login endpoint and the health
// check must still be reachable without a session; everything else is not.
func TestPublicRoutesNeedNoSessionWhenHeaderStubIsOff(t *testing.T) {
	api := newSessionAPI(t)

	expectStatus(t, api.send(http.MethodGet, "/health", "", ""), http.StatusOK)
	// No Google verifier in tests: reaching the handler means "not configured" (500), not 401.
	expectStatus(t, api.send(http.MethodPost, "/auth/google", "", `{"idToken":"x"}`), http.StatusInternalServerError)
	expectStatus(t, api.send(http.MethodGet, "/companies", "", ""), http.StatusUnauthorized)
}
