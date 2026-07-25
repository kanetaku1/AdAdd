package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// tokenTTL: no refresh-token mechanism — a short TTL would just force
// re-login mid-session for an internal tool, so this is intentionally long.
// See Issue #60 discussion.
const tokenTTL = 30 * 24 * time.Hour

// AppClaims is the AdAdd-issued JWT payload (spec/api.md#Login). Roles are
// resolved server-side from UserRole at issuance time — never supplied by
// the client.
type AppClaims struct {
	Roles []string `json:"roles"`
	jwt.RegisteredClaims
}

// JWTIssuer signs and verifies AdAdd's own session tokens, distinct from
// the Google id_token used only once at login (see GoogleVerifier).
type JWTIssuer struct {
	secret []byte
}

func NewJWTIssuer(secret string) *JWTIssuer {
	return &JWTIssuer{secret: []byte(secret)}
}

func (j *JWTIssuer) Issue(userID string, roles []string) (string, error) {
	now := time.Now()
	claims := AppClaims{
		Roles: roles,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tokenTTL)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.secret)
}

func (j *JWTIssuer) Verify(tokenString string) (*AppClaims, error) {
	var claims AppClaims
	token, err := jwt.ParseWithClaims(tokenString, &claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return j.secret, nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	return &claims, nil
}
