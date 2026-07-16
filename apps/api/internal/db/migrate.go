package db

import (
	"fmt"
	"log"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/mysql"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/kanetaku1/AdAdd/apps/api/internal/config"
)

// ApplyMigrations applies SQL migrations from the given directory to the configured database.
// It is optional and controlled by config.MigrateOnStart. It returns an error if migration fails.
func ApplyMigrations(cfg *config.Config) error {
	if cfg.MigrationsPath == "" {
		return nil
	}
	url := fmt.Sprintf("mysql://%s:%s@tcp(%s:%s)/%s?multiStatements=true",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName)
	m, err := migrate.New(
		"file://"+cfg.MigrationsPath,
		url,
	)
	if err != nil {
		return fmt.Errorf("migrate.New failed: %w", err)
	}
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migration up failed: %w", err)
	}
	log.Println("migrations applied")
	return nil
}
