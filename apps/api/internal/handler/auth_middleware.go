package handler

import (
	"errors"
	"strings"

	"github.com/kanetaku1/AdAdd/apps/api/internal/auth"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
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

// errSessionUserUnavailable means the JWT names a User who no longer exists
// or has been deactivated.
var errSessionUserUnavailable = errors.New("session user is unavailable")

// loadSessionRoles reads the signed-in User from MySQL and returns its
// current Role codes, or errSessionUserUnavailable. A variable so handler
// unit tests can run without a database.
var loadSessionRoles = func(userID string) ([]string, error) {
	user, err := repository.NewUserRepository().GetByID(userID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, errSessionUserUnavailable
	}
	if err != nil {
		return nil, err
	}
	if !user.IsActive {
		return nil, errSessionUserUnavailable
	}
	roles, err := service.NewRoleService().ListCodesByUserID(userID)
	if err != nil {
		return nil, err
	}
	if roles == nil {
		roles = []string{}
	}
	return roles, nil
}

// AuthMiddleware verifies the AdAdd JWT from `Authorization: Bearer`, then
// reads the User and its Roles from MySQL on every request — never from
// anything the client supplies, and never from the token itself — so
// deactivating a User or revoking a Role takes effect on the next request
// (spec/api.md#Authentication). The old X-User-ID/X-User-Roles header stub
// only applies when devAuthEnabled (config.DevAuthEnabled, forced off
// outside development).
func AuthMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if isPublicPath(c.Request().URL.Path) {
			return next(c)
		}

		authHeader := c.Request().Header.Get("Authorization")
		if token, ok := strings.CutPrefix(authHeader, "Bearer "); ok {
			claims, err := jwtIssuer.Verify(token)
			if err != nil {
				return respondUnauthorized(c, "invalid or expired token")
			}
			roles, err := loadSessionRoles(claims.Subject)
			if errors.Is(err, errSessionUserUnavailable) {
				return respondUnauthorized(c, "user is not registered or inactive")
			}
			if err != nil {
				return respondInternalServerError(c, err)
			}
			c.Set("userId", claims.Subject)
			c.Set("userRoles", roles)
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

// isPublicPath reports whether a path is reachable without a session: the
// health check and the login endpoint, which is how a session is obtained
// in the first place (spec/api.md#Login). e.Use applies AuthMiddleware to
// every route regardless of registration order, so they are skipped here.
func isPublicPath(path string) bool {
	return path == "/health" || strings.HasPrefix(path, "/auth/")
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
