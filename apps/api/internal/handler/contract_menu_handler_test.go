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

func (*cleanupDriveOperator) UploadFileWithName(_ context.Context, _, fullName, ext, _ string, _ io.Reader) (*drive.File, error) {
	return &drive.File{Id: "test", Name: fullName + ext}, nil
}

func (o *cleanupDriveOperator) TrashFile(_ context.Context, fileID string) error {
	o.trashed = append(o.trashed, fileID)
	return nil
}

func (*cleanupDriveOperator) CountFilesWithName(context.Context, string, string) (int, error) {
	return 0, nil
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

func TestBuildDriveFileName(t *testing.T) {
	code := func(value string) *string { return &value }
	intPtr := func(v int) *int { return &v }
	cases := []struct {
		editionNumber      *int
		companyName        string
		sponsorshipMenu    string
		productionType     *string
		want               string
	}{
		{intPtr(45), "長岡テクノ", "パンフレット広告", code("COMPANY"), "45th_長岡テクノ_パンフレット広告_企業"},
		{intPtr(45), "長岡テクノ", "パンフレット広告", code("INTERNAL"), "45th_長岡テクノ_パンフレット広告_委員"},
		{intPtr(45), "長岡テクノ", "パンフレット広告", nil, "45th_長岡テクノ_パンフレット広告"},
		{nil, "長岡テクノ", "パンフレット広告", code("COMPANY"), "長岡テクノ_パンフレット広告_企業"},
		{nil, "長岡テクノ", "パンフレット広告", nil, "長岡テクノ_パンフレット広告"},
	}
	for _, c := range cases {
		if got := buildDriveFileName(c.editionNumber, c.companyName, c.sponsorshipMenu, c.productionType); got != c.want {
			t.Fatalf("buildDriveFileName(%v, %q, %q, %v) = %q, want %q",
				c.editionNumber, c.companyName, c.sponsorshipMenu, c.productionType, got, c.want)
		}
	}
}
