package db

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestAdvertisementManagerRoleMigrationIsSafeForExistingDatabases(t *testing.T) {
	_, file, _, _ := runtime.Caller(0)
	path := filepath.Join(filepath.Dir(file), "..", "..", "migrations", "0003_add_advertisement_manager_role.up.sql")
	contents, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}

	sql := string(contents)
	for _, required := range []string{
		"'ADVERTISEMENT_MANAGER'",
		"'広告管理部門'",
		"WHERE NOT EXISTS",
	} {
		if !strings.Contains(sql, required) {
			t.Fatalf("migration is missing %q", required)
		}
	}
}
