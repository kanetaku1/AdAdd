// Package testdb connects integration tests to a dedicated MySQL database
// with every migration applied, so domain rules and business flows are
// verified against real constraints rather than mocks
// (spec/development.md#Integration Tests).
package testdb

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"testing"
	"time"

	gomysql "github.com/go-sql-driver/mysql"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/mysql"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// EnvDSN names the environment variable holding the test database DSN,
// e.g. adadd:adadd_password@tcp(127.0.0.1:3306)/adadd_test
const EnvDSN = "ADADD_API_TEST_DSN"

// preservedTables survive Reset: migration bookkeeping, and Roles, which are
// fixed master data seeded by migrations (spec/model.md#Role).
var preservedTables = map[string]bool{
	"schema_migrations": true,
	"roles":             true,
}

var (
	setupOnce      sync.Once
	setupErr       error
	testDB         *gorm.DB
	resettableList []string
)

// Open prepares the test database and points the global db.DB at it.
//
// On first use in a test binary, every table in the test database is dropped
// and all migrations are applied from scratch, so a broken or conflicting
// migration fails the test run. Every call then empties all business tables,
// so each test starts from a known, empty state.
//
// Without EnvDSN the test is skipped locally, but fails in CI so integration
// tests are never silently skipped there.
func Open(t testing.TB) *gorm.DB {
	t.Helper()

	dsn := os.Getenv(EnvDSN)
	if dsn == "" {
		if os.Getenv("CI") == "true" {
			t.Fatalf("%s must be set in CI", EnvDSN)
		}
		t.Skipf("%s is not set; skipping DB integration test", EnvDSN)
	}

	setupOnce.Do(func() {
		setupErr = setup(dsn)
	})
	if setupErr != nil {
		t.Fatalf("set up test database: %v", setupErr)
	}

	db.DB = testDB
	Reset(t)
	return testDB
}

// Reset empties every table except preservedTables.
func Reset(t testing.TB) {
	t.Helper()

	err := testDB.Connection(func(conn *gorm.DB) error {
		if err := conn.Exec("SET FOREIGN_KEY_CHECKS = 0").Error; err != nil {
			return err
		}
		for _, table := range resettableList {
			if err := conn.Exec("TRUNCATE TABLE `" + table + "`").Error; err != nil {
				return fmt.Errorf("truncate %s: %w", table, err)
			}
		}
		return conn.Exec("SET FOREIGN_KEY_CHECKS = 1").Error
	})
	if err != nil {
		t.Fatalf("reset test database: %v", err)
	}
}

func setup(dsn string) error {
	config, err := gomysql.ParseDSN(dsn)
	if err != nil {
		return fmt.Errorf("parse %s: %w", EnvDSN, err)
	}
	// Every table is dropped below, so refuse anything that is not clearly
	// a throwaway test database.
	if !strings.HasSuffix(config.DBName, "_test") {
		return fmt.Errorf("%s must point to a database whose name ends with _test, got %q", EnvDSN, config.DBName)
	}
	// Same connection settings as db.Init.
	config.ParseTime = true
	config.Loc = time.Local
	if config.Params == nil {
		config.Params = map[string]string{}
	}
	config.Params["charset"] = "utf8mb4"

	if err := dropAllTables(config); err != nil {
		return err
	}
	if err := applyMigrations(config); err != nil {
		return err
	}

	testDB, err = gorm.Open(mysql.Open(config.FormatDSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return fmt.Errorf("open test database: %w", err)
	}

	tables, err := listTables(testDB)
	if err != nil {
		return err
	}
	for _, table := range tables {
		if !preservedTables[table] {
			resettableList = append(resettableList, table)
		}
	}
	return nil
}

func dropAllTables(config *gomysql.Config) error {
	sqlDB, err := sql.Open("mysql", config.FormatDSN())
	if err != nil {
		return fmt.Errorf("open test database: %w", err)
	}
	defer sqlDB.Close()

	// A single connection so FOREIGN_KEY_CHECKS applies to every DROP.
	sqlDB.SetMaxOpenConns(1)

	rows, err := sqlDB.Query("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()")
	if err != nil {
		return fmt.Errorf("list tables: %w", err)
	}
	var tables []string
	for rows.Next() {
		var table string
		if err := rows.Scan(&table); err != nil {
			rows.Close()
			return fmt.Errorf("list tables: %w", err)
		}
		tables = append(tables, table)
	}
	rows.Close()

	if _, err := sqlDB.Exec("SET FOREIGN_KEY_CHECKS = 0"); err != nil {
		return err
	}
	for _, table := range tables {
		if _, err := sqlDB.Exec("DROP TABLE `" + table + "`"); err != nil {
			return fmt.Errorf("drop %s: %w", table, err)
		}
	}
	_, err = sqlDB.Exec("SET FOREIGN_KEY_CHECKS = 1")
	return err
}

func applyMigrations(config *gomysql.Config) error {
	migrateConfig := config.Clone()
	migrateConfig.MultiStatements = true

	source, err := iofs.New(os.DirFS(migrationsDir()), ".")
	if err != nil {
		return fmt.Errorf("read migrations: %w", err)
	}
	m, err := migrate.NewWithSourceInstance("iofs", source, "mysql://"+migrateConfig.FormatDSN())
	if err != nil {
		return fmt.Errorf("init migrations: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("apply migrations: %w", err)
	}
	return nil
}

func listTables(gormDB *gorm.DB) ([]string, error) {
	var tables []string
	err := gormDB.Raw("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()").
		Scan(&tables).Error
	if err != nil {
		return nil, fmt.Errorf("list tables: %w", err)
	}
	return tables, nil
}

// migrationsDir resolves apps/api/migrations from this file's location, so it
// works regardless of which package's test binary is running.
func migrationsDir() string {
	_, file, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(file), "..", "..", "migrations")
}
