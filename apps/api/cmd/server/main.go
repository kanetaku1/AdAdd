package main

import (
	"context"
	"log"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"github.com/kanetaku1/AdAdd/apps/api/internal/auth"
	"github.com/kanetaku1/AdAdd/apps/api/internal/config"
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/handler"
)

func main() {
	cfg := config.Load()

	// Optionally apply migrations on startup if MIGRATE_ON_START=true
	if cfg.MigrateOnStart {
		if err := db.ApplyMigrations(cfg); err != nil {
			log.Fatalf("failed to apply migrations: %v", err)
		}
	}

	// Initialize DB connection
	db.Init(cfg)

	initAuth(cfg)

	e := echo.New()

	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: cfg.AllowedOrigins,
		AllowHeaders: []string{
			echo.HeaderOrigin,
			echo.HeaderContentType,
			echo.HeaderAccept,
			"X-User-ID",
			"X-User-Roles",
			echo.HeaderAuthorization,
		},
		AllowMethods: []string{
			http.MethodGet,
			http.MethodPut,
			http.MethodPost,
			http.MethodDelete,
			http.MethodOptions,
			http.MethodPatch,
		},
	}))

	handler.RegisterHealthRoutes(e)
	handler.RegisterRoutes(e)

	log.Printf("starting server on port %s", cfg.AppPort)
	if err := e.Start(":" + cfg.AppPort); err != nil {
		log.Fatal(err)
	}
}

// initAuth wires the JWT issuer and Google id_token verifier used by
// AuthMiddleware and POST /auth/google (spec/api.md#Authentication).
func initAuth(cfg *config.Config) {
	secret := cfg.JWTSecret
	if secret == "" {
		if cfg.AppEnv == "development" {
			secret = "dev-insecure-jwt-secret"
			log.Println("WARNING: JWT_SECRET not set, using an insecure development default")
		} else {
			log.Fatal("JWT_SECRET must be set outside development")
		}
	}
	issuer := auth.NewJWTIssuer(secret)

	var verifier *auth.GoogleVerifier
	if cfg.GoogleClientID == "" {
		log.Println("WARNING: GOOGLE_CLIENT_ID not set, POST /auth/google will be unavailable")
	} else {
		v, err := auth.NewGoogleVerifier(context.Background(), cfg.GoogleClientID)
		if err != nil {
			log.Printf("WARNING: failed to initialize Google id_token verifier: %v", err)
		} else {
			verifier = v
		}
	}

	handler.InitAuth(issuer, verifier, cfg.DevAuthEnabled)
}
