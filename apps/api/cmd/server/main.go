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
	cfg.Validate()

	// MIGRATE_ON_START=true (development) applies migrations on startup.
	// Otherwise (production) they are applied with cmd/migrate, and the API
	// refuses to start until the schema matches (spec/operations.md).
	if cfg.MigrateOnStart {
		if err := db.ApplyMigrations(cfg); err != nil {
			log.Fatalf("failed to apply migrations: %v", err)
		}
	} else if err := db.CheckMigrations(cfg); err != nil {
		log.Fatalf("refusing to start: %v", err)
	}

	// Initialize DB connection
	db.Init(cfg)

	initAuth(cfg)

	e := echo.New()

	e.Use(handler.RequestBodyLimit)
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: cfg.AllowedOrigins,
		AllowHeaders: []string{
			echo.HeaderOrigin,
			echo.HeaderContentType,
			echo.HeaderAccept,
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

func initAuth(cfg *config.Config) {
	issuer := auth.NewJWTIssuer(cfg.JWTSecret)

	var verifier *auth.GoogleVerifier
	if cfg.GoogleClientID != "" {
		v, err := auth.NewGoogleVerifier(context.Background(), cfg.GoogleClientID)
		if err != nil {
			log.Printf("WARNING: failed to initialize Google id_token verifier: %v", err)
		} else {
			verifier = v
		}
	}

	handler.InitAuth(issuer, verifier)
}
