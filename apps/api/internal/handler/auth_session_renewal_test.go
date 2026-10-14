package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/kanetaku1/AdAdd/apps/api/internal/auth"
	"github.com/labstack/echo/v4"
)

const renewalTestSecret = "test-secret"

// signTokenIssuedAt signs a session JWT as JWTIssuer does, but with a chosen issue time.
func signTokenIssuedAt(t *testing.T, userID string, issuedAt time.Time) string {
	t.Helper()
	claims := auth.AppClaims{RegisteredClaims: jwt.RegisteredClaims{
		Subject:   userID,
		IssuedAt:  jwt.NewNumericDate(issuedAt),
		ExpiresAt: jwt.NewNumericDate(issuedAt.Add(30 * 24 * time.Hour)),
	}}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(renewalTestSecret))
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return token
}

// runWithToken passes a request with this Bearer token through AuthMiddleware.
func runWithToken(t *testing.T, token string) *httptest.ResponseRecorder {
	t.Helper()
	prevIssuer := jwtIssuer
	jwtIssuer = auth.NewJWTIssuer(renewalTestSecret)
	t.Cleanup(func() { jwtIssuer = prevIssuer })
	stubSessionRoles(t, func(string) ([]string, error) { return []string{"SPONSORSHIP_MEMBER"}, nil })

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	handlerFunc := AuthMiddleware(func(c echo.Context) error { return c.NoContent(http.StatusOK) })
	if err := handlerFunc(e.NewContext(req, rec)); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	return rec
}

func TestAuthMiddlewareRenewsSessionOlderThanOneDay(t *testing.T) {
	rec := runWithToken(t, signTokenIssuedAt(t, "user-member", time.Now().Add(-2*24*time.Hour)))

	renewed := rec.Header().Get(sessionTokenHeader)
	if renewed == "" {
		t.Fatalf("expected a renewed token in %s", sessionTokenHeader)
	}
	claims, err := auth.NewJWTIssuer(renewalTestSecret).Verify(renewed)
	if err != nil {
		t.Fatalf("renewed token does not verify: %v", err)
	}
	if claims.Subject != "user-member" {
		t.Fatalf("renewed token subject = %q, want user-member", claims.Subject)
	}
	if time.Since(claims.IssuedAt.Time) > time.Minute {
		t.Fatalf("renewed token was issued at %v, want now", claims.IssuedAt.Time)
	}
}

func TestAuthMiddlewareKeepsFreshSession(t *testing.T) {
	rec := runWithToken(t, signTokenIssuedAt(t, "user-member", time.Now().Add(-time.Hour)))

	if renewed := rec.Header().Get(sessionTokenHeader); renewed != "" {
		t.Fatalf("expected no renewal for a fresh token, got one")
	}
}
