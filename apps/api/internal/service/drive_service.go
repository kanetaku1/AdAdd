package service

import (
	"context"
	"fmt"
	"io"
	"strings"

	"mime"

	"golang.org/x/oauth2"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
)

type DriveService struct{}

func NewDriveService() *DriveService {
	return &DriveService{}
}

// UploadFile uploads a file to the specified Google Drive folder, renaming it
// based on the folder hierarchy and a suffix (e.g. from ContractMenu.ProductionType).
func (s *DriveService) UploadFile(ctx context.Context, accessToken, folderId, rootFolderId, suffix, originalExt, providedMimeType string, fileContent io.Reader) (*drive.File, error) {
	token := &oauth2.Token{AccessToken: accessToken}
	tokenSource := oauth2.StaticTokenSource(token)
	client := oauth2.NewClient(ctx, tokenSource)

	srv, err := drive.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		return nil, fmt.Errorf("failed to create drive client: %w", err)
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

	// 3. Check if file with same name already exists in the folder
	query := fmt.Sprintf("name='%s' and '%s' in parents and trashed=false", fileName, folderId)
	fileList, err := srv.Files.List().Q(query).Fields("files(id)").SupportsAllDrives(true).IncludeItemsFromAllDrives(true).Do()
	if err != nil {
		return nil, fmt.Errorf("failed to check existing files: %w", err)
	}

	var uploadedFile *drive.File
	if len(fileList.Files) > 0 {
		// Update existing file
		existingFileId := fileList.Files[0].Id
		f := &drive.File{
			MimeType: mimeType,
		} // keep existing metadata, update mimeType and media
		uploadedFile, err = srv.Files.Update(existingFileId, f).Media(fileContent, googleapi.ContentType(mimeType)).Fields("id, webViewLink, name").SupportsAllDrives(true).Do()
		if err != nil {
			return nil, fmt.Errorf("failed to update existing file in drive: %w", err)
		}
	} else {
		// Create new file
		fileMeta := &drive.File{
			Name:     fileName,
			Parents:  []string{folderId},
			MimeType: mimeType,
		}
		uploadedFile, err = srv.Files.Create(fileMeta).Media(fileContent, googleapi.ContentType(mimeType)).Fields("id, webViewLink, name").SupportsAllDrives(true).Do()
		if err != nil {
			return nil, fmt.Errorf("failed to upload file to drive: %w", err)
		}
	}

	return uploadedFile, nil
}
