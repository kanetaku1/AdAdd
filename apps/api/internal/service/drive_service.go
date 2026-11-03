package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"mime"

	"github.com/kanetaku1/AdAdd/apps/api/internal/config"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
)

var (
	ErrDriveNotConfigured = errors.New("dedicated Google Drive account is not configured")
	ErrDriveFileIDMissing = errors.New("Google Drive file ID is unavailable")
	ErrDriveFolderTarget  = errors.New("the Drive reference points to a folder, not a file")
)

var driveFileIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)

type DriveService struct {
	clientID     string
	clientSecret string
	refreshToken string
	apiEndpoint  string
	tokenSource  oauth2.TokenSource
}

func NewDriveService() *DriveService {
	cfg := config.Load()
	return &DriveService{
		clientID:     cfg.GoogleDriveClientID,
		clientSecret: cfg.GoogleDriveClientSecret,
		refreshToken: cfg.GoogleDriveRefreshToken,
	}
}

func (s *DriveService) driveClient(ctx context.Context) (*drive.Service, error) {
	var client *http.Client
	if s.tokenSource != nil {
		client = oauth2.NewClient(ctx, s.tokenSource)
	} else {
		if strings.TrimSpace(s.clientID) == "" || strings.TrimSpace(s.clientSecret) == "" || strings.TrimSpace(s.refreshToken) == "" {
			return nil, ErrDriveNotConfigured
		}
		oauthConfig := &oauth2.Config{
			ClientID:     s.clientID,
			ClientSecret: s.clientSecret,
			Endpoint:     google.Endpoint,
			Scopes:       []string{drive.DriveScope},
		}
		client = oauthConfig.Client(ctx, &oauth2.Token{RefreshToken: s.refreshToken})
	}
	options := []option.ClientOption{option.WithHTTPClient(client)}
	if s.apiEndpoint != "" {
		options = append(options, option.WithEndpoint(s.apiEndpoint))
	}
	srv, err := drive.NewService(ctx, options...)
	if err != nil {
		return nil, fmt.Errorf("create Drive client: %w", err)
	}
	return srv, nil
}

// UploadFile uploads a file to the specified Google Drive folder, renaming it
// based on the folder hierarchy and a suffix (e.g. from ContractMenu.ProductionType).
func (s *DriveService) UploadFile(ctx context.Context, folderId, rootFolderId, suffix, originalExt, providedMimeType string, fileContent io.Reader) (*drive.File, error) {
	srv, err := s.driveClient(ctx)
	if err != nil {
		return nil, err
	}

	// 1. Traverse folder hierarchy to determine the base file name (all folders below rootFolderId)
	var folderNames []string
	currentFolderId := folderId

	for currentFolderId != "" {
		f, err := srv.Files.Get(currentFolderId).Fields("id, name, parents").SupportsAllDrives(true).Do()
		if err != nil {
			if gErr, ok := err.(*googleapi.Error); ok && (gErr.Code == 404 || gErr.Code == 403) {
				break
			}
			return nil, fmt.Errorf("failed to get folder info for %s: %w", currentFolderId, err)
		}

		// Prepend to maintain root-to-leaf order
		folderNames = append([]string{f.Name}, folderNames...)

		if len(f.Parents) > 0 {
			if f.Parents[0] == rootFolderId {
				// Found the folder whose parent is the root (do not include root itself)
				break
			}
			currentFolderId = f.Parents[0]
		} else {
			// No parent found before hitting root
			break
		}
	}

	if len(folderNames) == 0 {
		folderNames = []string{"UnknownFolder"}
	}

	// 2. Generate new file name
	baseName := strings.Join(folderNames, "_")
	if suffix != "" {
		baseName = fmt.Sprintf("%s_%s", baseName, suffix)
	}

	// Determine accurate MimeType
	mimeType := providedMimeType
	if mimeType == "" || mimeType == "application/octet-stream" {
		mimeType = mime.TypeByExtension(originalExt)
		if mimeType == "" {
			if strings.EqualFold(originalExt, ".pdf") {
				mimeType = "application/pdf"
			} else if strings.EqualFold(originalExt, ".jpg") || strings.EqualFold(originalExt, ".jpeg") {
				mimeType = "image/jpeg"
			} else if strings.EqualFold(originalExt, ".png") {
				mimeType = "image/png"
			} else {
				mimeType = "application/octet-stream"
			}
		}
	}

	fileName := baseName + originalExt

	// 3. Always create a new Drive file. Drive permits duplicate names, and a
	// ContractMenuDriveFile must never share a mutable body with another row.
	fileMeta := &drive.File{
		Name:     fileName,
		Parents:  []string{folderId},
		MimeType: mimeType,
	}
	uploadedFile, err := srv.Files.Create(fileMeta).Media(fileContent, googleapi.ContentType(mimeType)).Fields("id, webViewLink, name").SupportsAllDrives(true).Do()
	if err != nil {
		return nil, fmt.Errorf("failed to upload file to drive: %w", err)
	}

	return uploadedFile, nil
}

// TrashFile moves a Drive file to trash as the dedicated Google account. It
// deliberately refuses folders and never calls Files.Delete (permanent delete).
func (s *DriveService) TrashFile(ctx context.Context, fileID string) error {
	fileID = strings.TrimSpace(fileID)
	if !driveFileIDPattern.MatchString(fileID) {
		return ErrDriveFileIDMissing
	}
	srv, err := s.driveClient(ctx)
	if err != nil {
		return err
	}
	file, err := srv.Files.Get(fileID).
		Fields("id,mimeType,trashed").
		SupportsAllDrives(true).
		Do()
	if err != nil {
		return fmt.Errorf("read Drive file before trash: %w", err)
	}
	if file.MimeType == "application/vnd.google-apps.folder" {
		return ErrDriveFolderTarget
	}
	if file.Trashed {
		return nil
	}
	_, err = srv.Files.Update(fileID, &drive.File{Trashed: true}).
		Fields("id,trashed").
		SupportsAllDrives(true).
		Do()
	if err != nil {
		return fmt.Errorf("move Drive file to trash: %w", err)
	}
	return nil
}

// ExtractDriveFileID recovers IDs from the Drive URL formats AdAdd has stored
// historically. It rejects arbitrary URLs and never treats a whole URL as an ID.
func ExtractDriveFileID(rawURL string) (string, error) {
	u, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || u.Host == "" || !strings.EqualFold(u.Host, "drive.google.com") {
		return "", ErrDriveFileIDMissing
	}
	if id := strings.TrimSpace(u.Query().Get("id")); driveFileIDPattern.MatchString(id) {
		return id, nil
	}
	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	for i, part := range parts[:max(0, len(parts)-1)] {
		if part == "d" && driveFileIDPattern.MatchString(parts[i+1]) {
			return parts[i+1], nil
		}
	}
	return "", ErrDriveFileIDMissing
}
