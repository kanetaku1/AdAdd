package db

import (
	"errors"
	"fmt"
	"io/fs"
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
		if errors.Is(err, fs.ErrNotExist) {
			// The database records a version with no file, e.g. a local
			// database from before the baseline squash.
			return fmt.Errorf("migration up failed: %w (the database's version has no migration file; see spec/development.md#Baseline)", err)
		}
		return fmt.Errorf("migration up failed: %w", err)
	}
	log.Println("migrations applied")
	return nil
}
