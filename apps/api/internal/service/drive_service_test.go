package service

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"golang.org/x/oauth2"
)

func TestExtractDriveFileID(t *testing.T) {
	tests := map[string]string{
		"https://drive.google.com/file/d/abc_DEF-123/view": "abc_DEF-123",
		"https://drive.google.com/open?id=abc_DEF-123":     "abc_DEF-123",
	}
	for rawURL, want := range tests {
		got, err := ExtractDriveFileID(rawURL)
		if err != nil || got != want {
			t.Errorf("ExtractDriveFileID(%q) = %q, %v; want %q", rawURL, got, err, want)
		}
	}
	for _, rawURL := range []string{
		"https://example.com/file/d/abc/view",
		"https://drive.google.com/drive/folders/folder-id",
		"not a URL",
	} {
		if _, err := ExtractDriveFileID(rawURL); !errors.Is(err, ErrDriveFileIDMissing) {
			t.Errorf("ExtractDriveFileID(%q) error = %v, want ErrDriveFileIDMissing", rawURL, err)
		}
	}
}

func TestTrashFileChecksMetadataThenMovesFileToTrash(t *testing.T) {
	var patched bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/files/file-1"):
			_ = json.NewEncoder(w).Encode(map[string]any{
				"id": "file-1", "mimeType": "application/pdf", "trashed": false,
			})
		case r.Method == http.MethodPatch && strings.HasSuffix(r.URL.Path, "/files/file-1"):
			var body struct {
				Trashed bool `json:"trashed"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil || !body.Trashed {
				t.Fatalf("PATCH body = %+v, err = %v", body, err)
			}
			patched = true
			_ = json.NewEncoder(w).Encode(map[string]any{"id": "file-1", "trashed": true})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	svc := &DriveService{
		apiEndpoint: server.URL + "/drive/v3/",
		tokenSource: oauth2.StaticTokenSource(&oauth2.Token{AccessToken: "test-token"}),
	}
	if err := svc.TrashFile(context.Background(), "file-1"); err != nil {
		t.Fatal(err)
	}
	if !patched {
		t.Fatal("Drive file was not patched with trashed=true")
	}
}

func TestTrashFileRefusesFolder(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"id": "folder-1", "mimeType": "application/vnd.google-apps.folder", "trashed": false,
		})
	}))
	defer server.Close()

	svc := &DriveService{
		apiEndpoint: server.URL + "/drive/v3/",
		tokenSource: oauth2.StaticTokenSource(&oauth2.Token{AccessToken: "test-token"}),
	}
	if err := svc.TrashFile(context.Background(), "folder-1"); !errors.Is(err, ErrDriveFolderTarget) {
		t.Fatalf("error = %v, want ErrDriveFolderTarget", err)
	}
}
