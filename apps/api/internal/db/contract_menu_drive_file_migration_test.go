package db

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestContractMenuDriveFileMigrationPreservesLegacyDataBeforeDroppingColumns(t *testing.T) {
	_, file, _, _ := runtime.Caller(0)
	path := filepath.Join(filepath.Dir(file), "..", "..", "migrations", "0002_create_contract_menu_drive_files.up.sql")
	contents, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	sql := string(contents)
	copyAt := strings.Index(sql, "INSERT INTO contract_menu_drive_files")
	dropAt := strings.Index(sql, "DROP COLUMN drive_url")
	if copyAt < 0 || dropAt < 0 || copyAt > dropAt {
		t.Fatalf("legacy rows must be copied before drive_url is dropped")
	}
	for _, required := range []string{
		"COLLATE=utf8mb4_0900_bin",
		"WHERE drive_url IS NOT NULL AND TRIM(drive_url) <> ''",
		"FOREIGN KEY (contract_menu_id) REFERENCES contract_menus (id) ON DELETE CASCADE",
	} {
		if !strings.Contains(sql, required) {
			t.Fatalf("migration is missing %q", required)
		}
	}
}
