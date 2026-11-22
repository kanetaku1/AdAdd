package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

type fakeDriveFolderOperator struct {
	listing *service.DriveFolderListing
	err     error
}

func (f *fakeDriveFolderOperator) ListFolders(_ context.Context, _, _ string, _ ...bool) (*service.DriveFolderListing, error) {
	return f.listing, f.err
}

func setupDriveFolderEcho(roles []string, operator DriveFolderOperator) *echo.Echo {
	origFactory := newDriveFolderOperator
	newDriveFolderOperator = func() DriveFolderOperator { return operator }

	e := echo.New()
	e.Use(withRoles(roles...))
	RegisterDriveFolderRoutes(e)

	// Restore after route setup (factory is captured by closure)
	_ = origFactory
	return e
}

func TestListDriveFoldersRolelessUserRejected(t *testing.T) {
	e := echo.New()
	e.Use(withRoles())
	RegisterDriveFolderRoutes(e)

	req := httptest.NewRequest(http.MethodGet, "/drive/folders", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected %d, got %d", http.StatusForbidden, rec.Code)
	}
}

func TestListDriveFoldersFinanceRejected(t *testing.T) {
	e := echo.New()
	e.Use(withRoles("FINANCE"))
	RegisterDriveFolderRoutes(e)

	req := httptest.NewRequest(http.MethodGet, "/drive/folders", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected %d, got %d", http.StatusForbidden, rec.Code)
	}
}

func TestListDriveFoldersSponsorshipMemberAllowed(t *testing.T) {
	t.Setenv("GOOGLE_DRIVE_ROOT_FOLDER_ID", "root-id")

	fake := &fakeDriveFolderOperator{
		listing: &service.DriveFolderListing{
			Current:   service.DriveFolderEntry{ID: "root-id", Name: "広告データ"},
			Ancestors: nil,
			Folders: []service.DriveFolderEntry{
				{ID: "child-1", Name: "パンフレット広告"},
			},
		},
	}
	e := setupDriveFolderEcho([]string{"SPONSORSHIP_MEMBER"}, fake)

	req := httptest.NewRequest(http.MethodGet, "/drive/folders", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected %d, got %d: %s", http.StatusOK, rec.Code, rec.Body.String())
	}

	var body service.DriveFolderListing
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body.Current.ID != "root-id" {
		t.Fatalf("current.id = %q, want root-id", body.Current.ID)
	}
	if len(body.Folders) != 1 {
		t.Fatalf("folders count = %d, want 1", len(body.Folders))
	}
}

func TestListDriveFoldersNotConfigured(t *testing.T) {
	t.Setenv("GOOGLE_DRIVE_ROOT_FOLDER_ID", "root-id")

	fake := &fakeDriveFolderOperator{err: service.ErrDriveNotConfigured}
	e := setupDriveFolderEcho([]string{"ADMINISTRATOR"}, fake)

	req := httptest.NewRequest(http.MethodGet, "/drive/folders", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected %d, got %d", http.StatusServiceUnavailable, rec.Code)
	}
}

func TestListDriveFoldersMissingRootFolderID(t *testing.T) {
	t.Setenv("GOOGLE_DRIVE_ROOT_FOLDER_ID", "")

	fake := &fakeDriveFolderOperator{}
	e := setupDriveFolderEcho([]string{"ADMINISTRATOR"}, fake)

	req := httptest.NewRequest(http.MethodGet, "/drive/folders", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected %d, got %d", http.StatusServiceUnavailable, rec.Code)
	}
}

func TestListDriveFoldersOutsideRoot(t *testing.T) {
	t.Setenv("GOOGLE_DRIVE_ROOT_FOLDER_ID", "root-id")

	fake := &fakeDriveFolderOperator{err: service.ErrDriveFolderOutsideRoot}
	e := setupDriveFolderEcho([]string{"ADMINISTRATOR"}, fake)

	req := httptest.NewRequest(http.MethodGet, "/drive/folders?parent=outside", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected %d, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestListDriveFoldersNotFound(t *testing.T) {
	t.Setenv("GOOGLE_DRIVE_ROOT_FOLDER_ID", "root-id")

	fake := &fakeDriveFolderOperator{err: service.ErrDriveFolderNotFound}
	e := setupDriveFolderEcho([]string{"ADMINISTRATOR"}, fake)

	req := httptest.NewRequest(http.MethodGet, "/drive/folders?parent=nonexistent", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected %d, got %d", http.StatusNotFound, rec.Code)
	}
}
