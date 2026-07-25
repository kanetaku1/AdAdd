package handler

import (
	"strings"

	"github.com/kanetaku1/AdAdd/apps/api/internal/auth"
	"github.com/labstack/echo/v4"
)

var (
	jwtIssuer      *auth.JWTIssuer
	googleVerifier *auth.GoogleVerifier
	devAuthEnabled bool
)

// InitAuth wires the JWT issuer/verifier and dev-stub gate used by
// AuthMiddleware and POST /auth/google (spec/api.md#Authentication). Must
// be called before RegisterRoutes.
func InitAuth(issuer *auth.JWTIssuer, verifier *auth.GoogleVerifier, devEnabled bool) {
	jwtIssuer = issuer
	googleVerifier = verifier
	devAuthEnabled = devEnabled
}

// AuthMiddleware verifies the AdAdd JWT from `Authorization: Bearer` and
// resolves userId/userRoles from its signed claims — never from anything
// the client supplies directly (spec/api.md#Authentication). The old
// X-User-ID/X-User-Roles header stub only applies when devAuthEnabled
// (config.DevAuthEnabled, forced off outside development).
func AuthMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		authHeader := c.Request().Header.Get("Authorization")
		if token, ok := strings.CutPrefix(authHeader, "Bearer "); ok {
			claims, err := jwtIssuer.Verify(token)
			if err != nil {
				return respondUnauthorized(c, "invalid or expired token")
			}
			c.Set("userId", claims.Subject)
			c.Set("userRoles", claims.Roles)
			return next(c)
		}

		if devAuthEnabled {
			userID := c.Request().Header.Get("X-User-ID")
			rolesHeader := c.Request().Header.Get("X-User-Roles")
			var roles []string
			if rolesHeader != "" {
				for _, r := range strings.Split(rolesHeader, ",") {
					r = strings.TrimSpace(r)
					if r != "" {
						roles = append(roles, r)
					}
				}
			}
			c.Set("userId", userID)
			c.Set("userRoles", roles)
			return next(c)
		}

		return respondUnauthorized(c, "authentication required")
	}
}

// RequireRoles returns middleware that enforces at least one of the allowed roles is present.
func RequireRoles(allowed ...string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			v := c.Get("userRoles")
			if v == nil {
				return respondForbidden(c, "forbidden")
			}
			userRoles, ok := v.([]string)
			if !ok {
				return respondForbidden(c, "forbidden")
			}
			for _, ur := range userRoles {
				for _, a := range allowed {
					if strings.EqualFold(ur, a) {
						return next(c)
					}
				}
			}
			return respondForbidden(c, "forbidden")
		}
	}
}
