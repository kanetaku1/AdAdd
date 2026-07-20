package main

import (
	"log"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

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
