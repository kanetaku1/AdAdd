package main

import (
	"path/filepath"
	"testing"

	"github.com/joho/godotenv"
	"github.com/kanetaku1/AdAdd/apps/api/internal/config"
)

func TestSaveCredentialsPreservesExistingValues(t *testing.T) {
	path := filepath.Join(t.TempDir(), ".env")
	if err := godotenv.Write(map[string]string{"KEEP": "value"}, path); err != nil {
		t.Fatal(err)
	}
	cfg := &config.Config{
		GoogleDriveClientID:     "client-id",
		GoogleDriveClientSecret: "client-secret",
		GoogleDriveAccountEmail: "drive@example.com",
	}
	if err := saveCredentials(path, cfg, "refresh-token"); err != nil {
		t.Fatal(err)
	}
	values, err := godotenv.Read(path)
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]string{
		"KEEP":                       "value",
		"GOOGLE_DRIVE_CLIENT_ID":     "client-id",
		"GOOGLE_DRIVE_CLIENT_SECRET": "client-secret",
		"GOOGLE_DRIVE_REFRESH_TOKEN": "refresh-token",
		"GOOGLE_DRIVE_ACCOUNT_EMAIL": "drive@example.com",
	}
	for key, expected := range want {
		if got := values[key]; got != expected {
			t.Errorf("%s = %q, want %q", key, got, expected)
		}
	}
}
