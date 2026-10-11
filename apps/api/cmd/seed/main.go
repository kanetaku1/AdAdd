// Command seed loads fictitious development data into the configured
// database (spec/development.md#Development Seed). It is safe to run more
// than once, and refuses to run outside APP_ENV=development.
package main

import (
	"log"
	"os"

	"github.com/kanetaku1/AdAdd/apps/api/internal/config"
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/seed"
)

func main() {
	cfg := config.Load()
	if cfg.AppEnv != "development" {
		log.Fatalf("seed only runs with APP_ENV=development (got %q)", cfg.AppEnv)
	}

	// Creating contracts mentions the assignee on Slack (UC-16). Seed data
	// must never reach a real Slack workspace.
	os.Unsetenv("SLACK_BOT_TOKEN")
	os.Unsetenv("SLACK_CHANNEL_ID")

	if err := db.ApplyMigrations(cfg); err != nil {
		log.Fatalf("failed to apply migrations: %v", err)
	}
	db.Init(cfg)

	if err := seed.Run(os.Stdout); err != nil {
		log.Fatal(err)
	}
	log.Println("seed completed")
}
