package db

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestMigrationVersionsListsUpFilesInOrder(t *testing.T) {
	dir := t.TempDir()
	for _, name := range []string{
		"0010_add_later.up.sql",
		"0001_baseline.up.sql",
		"0002_add_column.up.sql",
		"0002_add_column.down.sql", // not a migration AdAdd applies
		"README.md",
	} {
		if err := os.WriteFile(filepath.Join(dir, name), nil, 0o644); err != nil {
			t.Fatal(err)
		}
	}

	got, err := migrationVersions(dir)
	if err != nil {
		t.Fatal(err)
	}
	if want := []uint{1, 2, 10}; !reflect.DeepEqual(got, want) {
		t.Fatalf("migrationVersions = %v, want %v", got, want)
	}
}
