package integration

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/labstack/echo/v4"
)

// sessionAPI is the full API. Requests can only authenticate with a session
// JWT (spec/api.md#Authentication).
type sessionAPI struct {
	t      *testing.T
	server *echo.Echo
}

func newSessionAPI(t *testing.T) sessionAPI {
	t.Helper()
	return sessionAPI{t: t, server: newAPI(t)}
}

// send makes a request, with a session JWT for userID when it is not empty,
// and with any extra headers given.
func (api sessionAPI) send(method, path, userID, body string, headers ...[2]string) *httptest.ResponseRecorder {
	api.t.Helper()
	request := httptest.NewRequest(method, path, bytes.NewReader([]byte(body)))
	request.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	for _, header := range headers {
		request.Header.Set(header[0], header[1])
	}
	if userID != "" {
		token, err := testSessionIssuer.Issue(userID)
		if err != nil {
			api.t.Fatalf("issue token: %v", err)
		}
		request.Header.Set("Authorization", "Bearer "+token)
	}
	recorder := httptest.NewRecorder()
	api.server.ServeHTTP(recorder, request)
	return recorder
}

func TestSessionRolesComeFromMySQL(t *testing.T) {
	api := newSessionAPI(t)
	createUserWithRoles(t, "user-finance", "FINANCE_DEPARTMENT")

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
	createUserWithRoles(t, "user-administrator", "ADMINISTRATOR")

	// GET /roles is Administrator-only.
	expectStatus(t, api.send(http.MethodGet, "/roles", "user-administrator", ""), http.StatusOK)

	if err := db.DB.Where("user_id = ?", "user-administrator").Delete(&model.UserRole{}).Error; err != nil {
		t.Fatalf("revoke role: %v", err)
	}
	expectStatus(t, api.send(http.MethodGet, "/roles", "user-administrator", ""), http.StatusForbidden)
}

func TestDeactivatedUserIsRejectedOnNextRequest(t *testing.T) {
	api := newSessionAPI(t)
	createUserWithRoles(t, "user-member", "SPONSORSHIP_MEMBER")

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

// The login endpoint and the health check are reachable without a session;
// everything else is not, including other paths under /auth/.
func TestOnlyHealthAndLoginNeedNoSession(t *testing.T) {
	api := newSessionAPI(t)

	expectStatus(t, api.send(http.MethodGet, "/health", "", ""), http.StatusOK)
	// No Google verifier in tests: reaching the handler means "not configured" (500), not 401.
	expectStatus(t, api.send(http.MethodPost, "/auth/google", "", `{"idToken":"x"}`), http.StatusInternalServerError)
	expectStatus(t, api.send(http.MethodGet, "/companies", "", ""), http.StatusUnauthorized)
	expectStatus(t, api.send(http.MethodGet, "/auth/anything-else", "", ""), http.StatusUnauthorized)
}

// The former development header stub is gone: X-User-ID / X-User-Roles
// never authenticate, in any environment (Issue #156).
func TestDevelopmentHeadersDoNotAuthenticate(t *testing.T) {
	api := newSessionAPI(t)
	createUserWithRoles(t, "user-administrator", "ADMINISTRATOR")

	response := api.send(http.MethodGet, "/users", "", "",
		[2]string{"X-User-ID", "user-administrator"},
		[2]string{"X-User-Roles", "ADMINISTRATOR"},
	)
	expectStatus(t, response, http.StatusUnauthorized)
}
