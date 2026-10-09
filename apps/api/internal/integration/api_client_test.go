// Package integration verifies business flows end to end: real routing,
// role checks, handlers, services, and MySQL (spec/development.md#Integration Tests).
package integration

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/handler"
	"github.com/kanetaku1/AdAdd/apps/api/internal/testdb"
	"github.com/labstack/echo/v4"
)

// apiClient sends requests to the full API as one User, authenticated with
// the development X-User-ID / X-User-Roles headers (spec/api.md#Authentication).
type apiClient struct {
	t      *testing.T
	server *echo.Echo
	userID string
	roles  []string
}

// newAPI prepares an empty test database and the full API router.
func newAPI(t *testing.T) *echo.Echo {
	t.Helper()
	testdb.Open(t)

	handler.InitAuth(nil, nil, true)
	server := echo.New()
	handler.RegisterHealthRoutes(server)
	handler.RegisterRoutes(server)
	return server
}

func asUser(t *testing.T, server *echo.Echo, userID string, roles ...string) *apiClient {
	return &apiClient{t: t, server: server, userID: userID, roles: roles}
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
	request.Header.Set("X-User-ID", c.userID)
	request.Header.Set("X-User-Roles", strings.Join(c.roles, ","))

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
