package main

import (
	"log"

	"github.com/labstack/echo/v4"

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

	handler.RegisterHealthRoutes(e)
	handler.RegisterRoutes(e)

	log.Printf("starting server on port %s", cfg.AppPort)
	if err := e.Start(":" + cfg.AppPort); err != nil {
		log.Fatal(err)
	}
}
