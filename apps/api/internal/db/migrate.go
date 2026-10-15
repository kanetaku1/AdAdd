package db

import (
	"errors"
	"fmt"
	"io/fs"
	"log"
	"os"
	"regexp"
	"sort"
	"strconv"

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
	m, err := newMigrate(cfg)
	if err != nil {
		return err
	}
	defer m.Close()
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

// MigrationStatus is where the database stands against the migration files
// (spec/operations.md#Upgrading Production).
type MigrationStatus struct {
	// Version is the last applied migration; 0 when none has been applied.
	Version uint
	// Dirty means a migration failed partway. MySQL cannot roll DDL back, so
	// the schema may be half-changed: restore the backup, never edit by hand.
	Dirty bool
	// Pending are the migration files above Version, in the order they apply.
	Pending []uint
	// Unknown means Version has no migration file, e.g. a local database
	// from before the baseline squash (spec/development.md#Baseline).
	Unknown bool
}

// GetMigrationStatus reads the database's migration version and compares it
// with the migration files. It changes nothing.
func GetMigrationStatus(cfg *config.Config) (*MigrationStatus, error) {
	m, err := newMigrate(cfg)
	if err != nil {
		return nil, err
	}
	defer m.Close()

	status := &MigrationStatus{}
	version, dirty, err := m.Version()
	switch {
	case errors.Is(err, migrate.ErrNilVersion):
		// Empty database: nothing applied yet.
	case err != nil:
		return nil, fmt.Errorf("read migration version: %w", err)
	default:
		status.Version, status.Dirty = version, dirty
	}

	files, err := migrationVersions(cfg.MigrationsPath)
	if err != nil {
		return nil, err
	}
	status.Unknown = status.Version != 0
	for _, v := range files {
		if v == status.Version {
			status.Unknown = false
		}
		if v > status.Version {
			status.Pending = append(status.Pending, v)
		}
	}
	return status, nil
}

var migrationFilePattern = regexp.MustCompile(`^(\d+)_[a-z0-9_]+\.up\.sql$`)

// migrationVersions lists the versions of the up migrations in dir, ascending.
func migrationVersions(dir string) ([]uint, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read migrations: %w", err)
	}
	var versions []uint
	for _, entry := range entries {
		match := migrationFilePattern.FindStringSubmatch(entry.Name())
		if match == nil {
			continue
		}
		v, err := strconv.ParseUint(match[1], 10, 64)
		if err != nil {
			return nil, fmt.Errorf("migration %s: %w", entry.Name(), err)
		}
		versions = append(versions, uint(v))
	}
	sort.Slice(versions, func(i, j int) bool { return versions[i] < versions[j] })
	return versions, nil
}

func newMigrate(cfg *config.Config) (*migrate.Migrate, error) {
	url := fmt.Sprintf("mysql://%s:%s@tcp(%s:%s)/%s?multiStatements=true",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName)
	m, err := migrate.New("file://"+cfg.MigrationsPath, url)
	if err != nil {
		return nil, fmt.Errorf("migrate.New failed: %w", err)
	}
	return m, nil
}
