package db

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestDriveFileIDMigrationPreservesExistingReferences(t *testing.T) {
	_, file, _, _ := runtime.Caller(0)
	path := filepath.Join(filepath.Dir(file), "..", "..", "migrations", "0004_add_drive_file_id.up.sql")
	contents, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	sql := string(contents)
	for _, required := range []string{
		"ADD COLUMN drive_file_id VARCHAR(255) NULL",
		"idx_contract_menu_drive_files_drive_file_id",
	} {
		if !strings.Contains(sql, required) {
			t.Fatalf("migration is missing %q", required)
		}
	}
	if strings.Contains(strings.ToUpper(sql), "DELETE FROM") {
		t.Fatal("drive_file_id migration must not delete existing references")
	}
}
