package handler

import (
	"errors"
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// RegisterAuthRoutes wires POST /auth/google (spec/api.md#Login). This
// endpoint is how a session is obtained in the first place, so
// AuthMiddleware skips it (isPublicPath).
func RegisterAuthRoutes(e *echo.Echo) {
	e.POST("/auth/google", loginWithGoogle)
}

func loginWithGoogle(c echo.Context) error {
	var body struct {
		IDToken string `json:"idToken"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	if body.IDToken == "" {
		return respondBadRequest(c, "idToken is required")
	}
	if googleVerifier == nil {
		return respondInternalServerError(c, errors.New("google auth is not configured"))
	}

	email, err := googleVerifier.VerifyIDToken(body.IDToken)
	if err != nil {
		return respondUnauthorized(c, "invalid Google id_token")
	}

	return startSession(c, email)
}

// startSession issues the AdAdd JWT for the User with this email, which
// Google has already verified (spec/api.md#Login).
func startSession(c echo.Context, email string) error {
	userRepo := repository.NewUserRepository()
	user, err := userRepo.FindByEmail(email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// No self-registration (spec/model.md Business Invariants) —
			// an unrecognized email never creates a User.
			return respondForbidden(c, "email is not registered")
		}
		return respondInternalServerError(c, err)
	}
	// Checked here rather than relying on the OAuth client's test-user
	// list, which stops applying once the client is published.
	if !user.IsActive {
		return respondForbidden(c, "user is inactive")
	}

	roleSvc := service.NewRoleService()
	roles, err := roleSvc.ListCodesByUserID(user.ID)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	if roles == nil {
		roles = []string{}
	}

	token, err := jwtIssuer.Issue(user.ID)
	if err != nil {
		return respondInternalServerError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"data": map[string]interface{}{
			"token": token,
			"user": map[string]interface{}{
				"id":    user.ID,
				"name":  user.Name,
				"roles": roles,
			},
		},
		"message": "success",
	})
}
