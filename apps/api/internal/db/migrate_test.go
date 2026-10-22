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

func TestMigrationStatusComparesVersionWithFiles(t *testing.T) {
	files := []uint{1, 2, 3}
	for _, tc := range []struct {
		name        string
		version     uint
		dirty       bool
		want        MigrationStatus
		wantMatches bool
	}{
		{"empty database", 0, false, MigrationStatus{Pending: []uint{1, 2, 3}}, false},
		{"pending", 1, false, MigrationStatus{Version: 1, Pending: []uint{2, 3}}, false},
		{"up to date", 3, false, MigrationStatus{Version: 3}, true},
		{"dirty", 3, true, MigrationStatus{Version: 3, Dirty: true}, false},
		// A local database from before the baseline squash.
		{"unknown version", 12, false, MigrationStatus{Version: 12, Unknown: true}, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got := newMigrationStatus(tc.version, tc.dirty, files)
			if !reflect.DeepEqual(*got, tc.want) {
				t.Fatalf("status = %+v, want %+v", *got, tc.want)
			}
			if err := got.MismatchError(); (err == nil) != tc.wantMatches {
				t.Fatalf("MismatchError = %v, want matches = %v", err, tc.wantMatches)
			}
		})
	}
}
