package handler

import (
	"context"
	"io"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"google.golang.org/api/drive/v3"
)

type cleanupDriveOperator struct {
	trashed []string
}

func (*cleanupDriveOperator) UploadFile(context.Context, string, string, string, string, string, io.Reader) (*drive.File, error) {
	return nil, nil
}

func (o *cleanupDriveOperator) TrashFile(_ context.Context, fileID string) error {
	o.trashed = append(o.trashed, fileID)
	return nil
}

func TestCleanupUploadedDriveFilesOnlyTrashesPersistableIDs(t *testing.T) {
	operator := &cleanupDriveOperator{}
	firstID := "file-1"
	blankID := " "
	cleanupUploadedDriveFiles(context.Background(), operator, []service.ContractMenuDriveFileInput{
		{DriveFileID: &firstID},
		{DriveFileID: nil},
		{DriveFileID: &blankID},
	})
	if len(operator.trashed) != 1 || operator.trashed[0] != firstID {
		t.Fatalf("trashed = %v, want [%s]", operator.trashed, firstID)
	}
}
