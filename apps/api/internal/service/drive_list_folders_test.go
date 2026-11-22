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

func newTestDriveService(serverURL string) *DriveService {
	return &DriveService{
		apiEndpoint: serverURL + "/drive/v3/",
		tokenSource: oauth2.StaticTokenSource(&oauth2.Token{AccessToken: "test-token"}),
	}
}

func TestListFoldersRoot(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/files/root-id"):
			_ = json.NewEncoder(w).Encode(map[string]any{
				"id": "root-id", "name": "広告データ", "mimeType": "application/vnd.google-apps.folder",
				"parents": []string{"some-parent"},
			})
		case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/drive/v3/files") && r.URL.RawQuery != "":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"files": []map[string]any{
					{"id": "child-1", "name": "パンフレット広告"},
					{"id": "child-2", "name": "ホームページ広告"},
				},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	svc := newTestDriveService(server.URL)
	listing, err := svc.ListFolders(context.Background(), "", "root-id")
	if err != nil {
		t.Fatal(err)
	}
	if listing.Current.ID != "root-id" {
		t.Fatalf("current.id = %q, want root-id", listing.Current.ID)
	}
	if len(listing.Ancestors) != 0 {
		t.Fatalf("ancestors = %v, want empty", listing.Ancestors)
	}
	if len(listing.Folders) != 2 {
		t.Fatalf("folders count = %d, want 2", len(listing.Folders))
	}
	if listing.Folders[0].Name != "パンフレット広告" {
		t.Fatalf("folders[0].name = %q, want パンフレット広告", listing.Folders[0].Name)
	}
}

func TestListFoldersChild(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/files/child-1"):
			_ = json.NewEncoder(w).Encode(map[string]any{
				"id": "child-1", "name": "パンフレット広告", "mimeType": "application/vnd.google-apps.folder",
				"parents": []string{"root-id"},
			})
		case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/drive/v3/files") && r.URL.RawQuery != "":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"files": []map[string]any{
					{"id": "grandchild-1", "name": "企業A"},
				},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	svc := newTestDriveService(server.URL)
	listing, err := svc.ListFolders(context.Background(), "child-1", "root-id")
	if err != nil {
		t.Fatal(err)
	}
	if listing.Current.ID != "child-1" {
		t.Fatalf("current.id = %q, want child-1", listing.Current.ID)
	}
	if len(listing.Ancestors) != 0 {
		t.Fatalf("ancestors = %v, want empty (child's parent is root)", listing.Ancestors)
	}
	if len(listing.Folders) != 1 || listing.Folders[0].Name != "企業A" {
		t.Fatalf("folders = %v, want [{企業A}]", listing.Folders)
	}
}

func TestListFoldersGrandchild(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/files/grandchild-1"):
			_ = json.NewEncoder(w).Encode(map[string]any{
				"id": "grandchild-1", "name": "企業A", "mimeType": "application/vnd.google-apps.folder",
				"parents": []string{"child-1"},
			})
		case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/files/child-1"):
			_ = json.NewEncoder(w).Encode(map[string]any{
				"id": "child-1", "name": "パンフレット広告", "mimeType": "application/vnd.google-apps.folder",
				"parents": []string{"root-id"},
			})
		case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/drive/v3/files") && r.URL.RawQuery != "":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"files": []map[string]any{
					{"id": "leaf-1", "name": "素材"},
					{"id": "leaf-2", "name": "完成"},
				},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	svc := newTestDriveService(server.URL)
	listing, err := svc.ListFolders(context.Background(), "grandchild-1", "root-id")
	if err != nil {
		t.Fatal(err)
	}
	if listing.Current.ID != "grandchild-1" {
		t.Fatalf("current.id = %q, want grandchild-1", listing.Current.ID)
	}
	if len(listing.Ancestors) != 1 || listing.Ancestors[0].ID != "child-1" {
		t.Fatalf("ancestors = %v, want [{child-1 パンフレット広告}]", listing.Ancestors)
	}
	if len(listing.Folders) != 2 {
		t.Fatalf("folders count = %d, want 2", len(listing.Folders))
	}
}

func TestListFoldersOutsideRoot(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/files/outside-folder"):
			_ = json.NewEncoder(w).Encode(map[string]any{
				"id": "outside-folder", "name": "外部", "mimeType": "application/vnd.google-apps.folder",
				"parents": []string{"some-other-root"},
			})
		case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/files/some-other-root"):
			_ = json.NewEncoder(w).Encode(map[string]any{
				"id": "some-other-root", "name": "Other",
				"parents": []string{},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	svc := newTestDriveService(server.URL)
	_, err := svc.ListFolders(context.Background(), "outside-folder", "root-id")
	if !errors.Is(err, ErrDriveFolderOutsideRoot) {
		t.Fatalf("error = %v, want ErrDriveFolderOutsideRoot", err)
	}
}

func TestListFoldersNotAFolder(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"id": "file-1", "name": "file.pdf", "mimeType": "application/pdf",
			"parents": []string{"root-id"},
		})
	}))
	defer server.Close()

	svc := newTestDriveService(server.URL)
	_, err := svc.ListFolders(context.Background(), "file-1", "root-id")
	if !errors.Is(err, ErrDriveFolderNotFound) {
		t.Fatalf("error = %v, want ErrDriveFolderNotFound", err)
	}
}

func TestListFolders404(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"error": map[string]any{"code": 404, "message": "File not found"},
		})
	}))
	defer server.Close()

	svc := newTestDriveService(server.URL)
	_, err := svc.ListFolders(context.Background(), "nonexistent", "root-id")
	if !errors.Is(err, ErrDriveFolderNotFound) {
		t.Fatalf("error = %v, want ErrDriveFolderNotFound", err)
	}
}
