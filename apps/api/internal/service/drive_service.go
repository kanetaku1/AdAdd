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
	ErrDriveNotConfigured    = errors.New("dedicated Google Drive account is not configured")
	ErrDriveFileIDMissing    = errors.New("Google Drive file ID is unavailable")
	ErrDriveFolderTarget     = errors.New("the Drive reference points to a folder, not a file")
	ErrDriveFolderNotFound   = errors.New("folder not found or is not a folder")
	ErrDriveFolderOutsideRoot = errors.New("folder is outside the root folder")
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

// UploadFileWithName uploads a file using an explicit pre-built name (no folder hierarchy traversal).
func (s *DriveService) UploadFileWithName(ctx context.Context, folderId, fullName, originalExt, providedMimeType string, fileContent io.Reader) (*drive.File, error) {
	srv, err := s.driveClient(ctx)
	if err != nil {
		return nil, err
	}

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

	fileName := fullName + originalExt
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

type DriveFolderEntry struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	HasChildren *bool  `json:"hasChildren,omitempty"`
}

type DriveFolderListing struct {
	Current   DriveFolderEntry   `json:"current"`
	Ancestors []DriveFolderEntry `json:"ancestors"`
	Folders   []DriveFolderEntry `json:"folders"`
}

func (s *DriveService) ListFolders(ctx context.Context, parentID, rootFolderID string, includeHasChildren ...bool) (*DriveFolderListing, error) {
	srv, err := s.driveClient(ctx)
	if err != nil {
		return nil, err
	}

	targetID := parentID
	if targetID == "" {
		targetID = rootFolderID
	}

	current, err := srv.Files.Get(targetID).
		Fields("id, name, mimeType, parents").
		SupportsAllDrives(true).
		Do()
	if err != nil {
		if gErr, ok := err.(*googleapi.Error); ok && (gErr.Code == 404 || gErr.Code == 403) {
			return nil, ErrDriveFolderNotFound
		}
		return nil, fmt.Errorf("get folder: %w", err)
	}
	if current.MimeType != "application/vnd.google-apps.folder" {
		return nil, ErrDriveFolderNotFound
	}

	ancestors := make([]DriveFolderEntry, 0)
	if targetID != rootFolderID {
		// Single traversal: walk from current's parent up to rootFolderID,
		// collecting ancestors and validating the folder is inside the root.
		var chain []DriveFolderEntry
		walkID := current.Parents[0]
		if len(current.Parents) == 0 {
			return nil, ErrDriveFolderOutsideRoot
		}
		const maxDepth = 20
		for i := 0; i < maxDepth; i++ {
			if walkID == rootFolderID {
				break
			}
			f, err := srv.Files.Get(walkID).
				Fields("id, name, parents").
				SupportsAllDrives(true).
				Do()
			if err != nil {
				return nil, fmt.Errorf("traverse ancestors: %w", err)
			}
			chain = append(chain, DriveFolderEntry{ID: f.Id, Name: f.Name})
			if len(f.Parents) == 0 {
				return nil, ErrDriveFolderOutsideRoot
			}
			walkID = f.Parents[0]
		}
		if walkID != rootFolderID {
			return nil, ErrDriveFolderOutsideRoot
		}
		// chain is leaf-to-root order; reverse to root-to-leaf for the response
		for i, j := 0, len(chain)-1; i < j; i, j = i+1, j-1 {
			chain[i], chain[j] = chain[j], chain[i]
		}
		ancestors = chain
	}

	query := fmt.Sprintf("'%s' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false", targetID)
	fileList, err := srv.Files.List().
		Q(query).
		Fields("files(id, name)").
		OrderBy("name").
		PageSize(1000).
		SupportsAllDrives(true).
		IncludeItemsFromAllDrives(true).
		Do()
	if err != nil {
		return nil, fmt.Errorf("list subfolders: %w", err)
	}

	checkChildren := len(includeHasChildren) > 0 && includeHasChildren[0]
	folders := make([]DriveFolderEntry, 0, len(fileList.Files))

	parentHasChild := make(map[string]bool)
	if checkChildren && len(fileList.Files) > 0 {
		// Batch query: find any subfolder whose parent is one of our folders.
		// Drive API "in parents" only accepts one parent per clause, so we
		// build an OR of up to 50 at a time (API query length limit).
		const batchSize = 50
		for i := 0; i < len(fileList.Files); i += batchSize {
			end := i + batchSize
			if end > len(fileList.Files) {
				end = len(fileList.Files)
			}
			var clauses []string
			for _, f := range fileList.Files[i:end] {
				clauses = append(clauses, fmt.Sprintf("'%s' in parents", f.Id))
			}
			batchQuery := fmt.Sprintf("(%s) and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
				strings.Join(clauses, " or "))
			batchList, err := srv.Files.List().
				Q(batchQuery).
				Fields("files(parents)").
				PageSize(1000).
				SupportsAllDrives(true).
				IncludeItemsFromAllDrives(true).
				Do()
			if err == nil {
				for _, bf := range batchList.Files {
					for _, pid := range bf.Parents {
						parentHasChild[pid] = true
					}
				}
			}
		}
	}

	for _, f := range fileList.Files {
		entry := DriveFolderEntry{ID: f.Id, Name: f.Name}
		if checkChildren {
			has := parentHasChild[f.Id]
			entry.HasChildren = &has
		}
		folders = append(folders, entry)
	}

	return &DriveFolderListing{
		Current:   DriveFolderEntry{ID: current.Id, Name: current.Name},
		Ancestors: ancestors,
		Folders:   folders,
	}, nil
}

// FindOrCreateFolder finds or creates a subfolder with the given name under parentID.
func (s *DriveService) FindOrCreateFolder(ctx context.Context, parentID, name string) (string, error) {
	srv, err := s.driveClient(ctx)
	if err != nil {
		return "", err
	}

	query := fmt.Sprintf("'%s' in parents and name = '%s' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
		parentID, strings.ReplaceAll(name, "'", "\\'"))
	list, err := srv.Files.List().Q(query).Fields("files(id)").PageSize(1).SupportsAllDrives(true).IncludeItemsFromAllDrives(true).Do()
	if err != nil {
		return "", fmt.Errorf("search folder %q under %s: %w", name, parentID, err)
	}
	if len(list.Files) > 0 {
		return list.Files[0].Id, nil
	}

	created, err := srv.Files.Create(&drive.File{
		Name:     name,
		MimeType: "application/vnd.google-apps.folder",
		Parents:  []string{parentID},
	}).Fields("id").SupportsAllDrives(true).Do()
	if err != nil {
		return "", fmt.Errorf("create folder %q under %s: %w", name, parentID, err)
	}
	return created.Id, nil
}

type FolderStructure struct {
	CompanyFolderID string            `json:"companyFolderId"`
	CategoryFolders map[string]string `json:"categoryFolders"`
}

// EnsureFolderStructure creates the Drive folder hierarchy for ad material.
// It creates root > sponsorshipMenuName > companyName > category (only the requested category).
func (s *DriveService) EnsureFolderStructure(ctx context.Context, rootFolderID, sponsorshipMenuName, companyName, category string) (*FolderStructure, error) {
	menuFolderID, err := s.FindOrCreateFolder(ctx, rootFolderID, sponsorshipMenuName)
	if err != nil {
		return nil, err
	}
	companyFolderID, err := s.FindOrCreateFolder(ctx, menuFolderID, companyName)
	if err != nil {
		return nil, err
	}

	catID, err := s.FindOrCreateFolder(ctx, companyFolderID, category)
	if err != nil {
		return nil, err
	}

	return &FolderStructure{
		CompanyFolderID: companyFolderID,
		CategoryFolders: map[string]string{category: catID},
	}, nil
}

// CountFilesWithName counts files in a folder that have exactly the given name (excluding trashed).
func (s *DriveService) CountFilesWithName(ctx context.Context, folderID, name string) (int, error) {
	srv, err := s.driveClient(ctx)
	if err != nil {
		return 0, err
	}

	query := fmt.Sprintf("'%s' in parents and name = '%s' and trashed = false",
		folderID, strings.ReplaceAll(name, "'", "\\'"))
	list, err := srv.Files.List().Q(query).Fields("files(id)").PageSize(1000).SupportsAllDrives(true).IncludeItemsFromAllDrives(true).Do()
	if err != nil {
		return 0, fmt.Errorf("count files named %q in %s: %w", name, folderID, err)
	}
	return len(list.Files), nil
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
