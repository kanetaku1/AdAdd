package auth

import (
	"context"
	"errors"
	"fmt"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

const googleJWKSURL = "https://www.googleapis.com/oauth2/v3/certs"

// Google issues id_tokens with either form; both are legitimate.
var acceptedGoogleIssuers = map[string]bool{
	"https://accounts.google.com": true,
	"accounts.google.com":         true,
}

type googleIDTokenClaims struct {
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	jwt.RegisteredClaims
}

// GoogleVerifier verifies Google-issued id_tokens against Google's public
// JWKS (spec/api.md#Login). Create once at startup and reuse — it holds a
// background key-refresh goroutine, so a fresh instance per request would
// leak goroutines.
type GoogleVerifier struct {
	clientID string
	keys     keyfunc.Keyfunc
}

func NewGoogleVerifier(ctx context.Context, clientID string) (*GoogleVerifier, error) {
	k, err := keyfunc.NewDefaultCtx(ctx, []string{googleJWKSURL})
	if err != nil {
		return nil, fmt.Errorf("failed to load Google JWKS: %w", err)
	}
	return &GoogleVerifier{clientID: clientID, keys: k}, nil
}

// VerifyIDToken verifies signature, audience, issuer, expiry, and
// email_verified, returning the verified email. There is no Google
// Workspace / hosted-domain restriction (spec/api.md#Login) — the only
// gate is whether this exact email is pre-registered, checked by the
// caller.
func (g *GoogleVerifier) VerifyIDToken(idToken string) (string, error) {
	var claims googleIDTokenClaims
	_, err := jwt.ParseWithClaims(idToken, &claims, g.keys.Keyfunc, jwt.WithAudience(g.clientID))
	if err != nil {
		return "", fmt.Errorf("invalid id_token: %w", err)
	}
	if !acceptedGoogleIssuers[claims.Issuer] {
		return "", fmt.Errorf("unexpected issuer: %s", claims.Issuer)
	}
	if !claims.EmailVerified {
		return "", errors.New("email not verified")
	}
	if claims.Email == "" {
		return "", errors.New("id_token missing email claim")
	}
	return claims.Email, nil
}
