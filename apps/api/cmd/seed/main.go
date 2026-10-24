// Command seed loads fictitious development data into the configured
// database (spec/development.md#Development Seed). It is safe to run more
// than once, and refuses to run outside APP_ENV=development or against a
// database other than the development ones.
package main

import (
	"log"
	"os"
	"slices"

	"github.com/kanetaku1/AdAdd/apps/api/internal/config"
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/seed"
)

// developmentDatabaseNames are the only databases the seed writes to: the
// local development database and the E2E database (spec/development.md#Development Seed).
// Checked as well as APP_ENV, so a production database is refused even when
// APP_ENV was left at development by mistake (Issue #156).
var developmentDatabaseNames = []string{"adadd", "adadd_e2e"}

func main() {
	cfg := config.Load()
	if cfg.AppEnv != "development" {
		log.Fatalf("seed only runs with APP_ENV=development (got %q)", cfg.AppEnv)
	}
	if !slices.Contains(developmentDatabaseNames, cfg.DBName) {
		log.Fatalf("seed only runs against %v (got DB_NAME=%q)", developmentDatabaseNames, cfg.DBName)
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
