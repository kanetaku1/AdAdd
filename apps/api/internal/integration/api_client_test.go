// Package integration verifies business flows end to end: real routing,
// role checks, handlers, services, and MySQL (spec/development.md#Integration Tests).
package integration

import (
	"bytes"
	"encoding/json"
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

// testSessionIssuer signs the session JWTs of the tests. The API verifies
// them like production sessions (spec/api.md#Authentication).
var testSessionIssuer = auth.NewJWTIssuer("integration-test-secret")

// apiClient sends requests to the full API as one User, with a session JWT.
// Its Roles come from MySQL on every request, as in operation.
type apiClient struct {
	t      *testing.T
	server *echo.Echo
	userID string
}

// newAPI prepares an empty test database and the full API router.
func newAPI(t *testing.T) *echo.Echo {
	t.Helper()
	testdb.Open(t)

	handler.InitAuth(testSessionIssuer, nil)
	server := echo.New()
	handler.RegisterHealthRoutes(server)
	handler.RegisterRoutes(server)
	return server
}

// asUser stores an active User with the given Roles and returns a client
// that acts as that User.
func asUser(t *testing.T, server *echo.Echo, userID string, roleCodes ...string) *apiClient {
	t.Helper()
	createUserWithRoles(t, userID, roleCodes...)
	return &apiClient{t: t, server: server, userID: userID}
}

// createUserWithRoles stores an active User and grants its Roles, as an
// Administrator would.
func createUserWithRoles(t *testing.T, userID string, roleCodes ...string) {
	t.Helper()
	if err := db.DB.Create(&model.User{ID: userID, Name: userID, Email: userID + "@example.com", IsActive: true}).Error; err != nil {
		t.Fatalf("create user %s: %v", userID, err)
	}
	for _, roleCode := range roleCodes {
		var role model.Role
		if err := db.DB.First(&role, "code = ?", roleCode).Error; err != nil {
			t.Fatalf("load role %s: %v", roleCode, err)
		}
		if err := db.DB.Create(&model.UserRole{UserID: userID, RoleID: role.ID, AssignedAt: time.Now()}).Error; err != nil {
			t.Fatalf("grant role %s to %s: %v", roleCode, userID, err)
		}
	}
}

// authenticate attaches a session JWT for the client's User.
func (c *apiClient) authenticate(request *http.Request) {
	c.t.Helper()
	token, err := testSessionIssuer.Issue(c.userID)
	if err != nil {
		c.t.Fatalf("issue session token: %v", err)
	}
	request.Header.Set(echo.HeaderAuthorization, "Bearer "+token)
}

// do sends a JSON request and returns the recorded response.
func (c *apiClient) do(method, path string, body any) *httptest.ResponseRecorder {
	c.t.Helper()

	var reader *bytes.Reader
	if body == nil {
		reader = bytes.NewReader(nil)
	} else {
		encoded, err := json.Marshal(body)
		if err != nil {
			c.t.Fatalf("encode request body: %v", err)
		}
		reader = bytes.NewReader(encoded)
	}

	request := httptest.NewRequest(method, path, reader)
	request.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	c.authenticate(request)

	recorder := httptest.NewRecorder()
	c.server.ServeHTTP(recorder, request)
	return recorder
}

// expectStatus fails the test unless the response has the wanted status.
func expectStatus(t *testing.T, response *httptest.ResponseRecorder, want int) {
	t.Helper()
	if response.Code != want {
		t.Fatalf("status = %d, want %d; body = %s", response.Code, want, response.Body.String())
	}
}

// decodeData decodes the `data` envelope of a successful response.
func decodeData[T any](t *testing.T, response *httptest.ResponseRecorder) T {
	t.Helper()
	var envelope struct {
		Data T `json:"data"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode response: %v; body = %s", err, response.Body.String())
	}
	return envelope.Data
}
