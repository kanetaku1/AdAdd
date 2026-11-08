package service

import (
	"errors"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/testdb"
	"github.com/shopspring/decimal"
)

func TestContractMenuStatusLogMessage(t *testing.T) {
	got := contractMenuStatusLogMessage("ホームページ広告", "WAITING", "PRODUCING")
	want := "ホームページ広告のステータスを「広告データ提出待ち」から「制作中」に更新"
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
	if contractMenuStatusLogMessage("", "WAITING", "SUBMITTED") !=
		"協賛メニューのステータスを「広告データ提出待ち」から「提出済み」に更新" {
		t.Fatal("empty menu name should fall back")
	}
}

// seedStatusLogContractMenu creates one WAITING Contract Menu without files.
func seedStatusLogContractMenu(t *testing.T) *model.ContractMenu {
	t.Helper()
	contractID, menuMasterID, _ := seedPaymentSyncContract(t, "WAITING", decimal.Zero)
	cm := &model.ContractMenu{
		ID:                "test-contract-menu",
		ContractID:        contractID,
		SponsorshipMenuID: menuMasterID,
		Quantity:          1,
		UnitPrice:         decimal.NewFromInt(100),
		Status:            "WAITING",
	}
	if err := db.DB.Create(cm).Error; err != nil {
		t.Fatalf("seed contract menu: %v", err)
	}
	return cm
}

func activityLogActions(t *testing.T) []string {
	t.Helper()
	var actions []string
	if err := db.DB.Model(&model.ActivityLog{}).
		Where("yearly_company_id = ?", testYearlyCompanyID).
		Order("created_at, id").
		Pluck("action", &actions).Error; err != nil {
		t.Fatalf("list logs: %v", err)
	}
	return actions
}

// Each status change through UpdateWithUser writes one
// CONTRACT_MENU_STATUS_UPDATED entry; the same status writes nothing. Only
// transitions allowed without files are used here: SUBMITTED is derived from
// active files (see TestAddFilesSubmitsAndLogsUpload).
func TestUpdateWithUserLogsAnyStatusChangeOnce(t *testing.T) {
	testdb.Open(t)
	cm := seedStatusLogContractMenu(t)
	svc := NewContractMenuService()

	steps := []struct {
		status   string
		wantLogs int
	}{
		{"PRODUCING", 1},
		{"PRODUCING", 1}, // same status: no new entry
		{"COMPLETED", 2},
	}
	for _, step := range steps {
		cm.Status = step.status
		if err := svc.UpdateWithUser(cm, "user-test"); err != nil {
			t.Fatalf("update to %s: %v", step.status, err)
		}
		actions := activityLogActions(t)
		if len(actions) != step.wantLogs {
			t.Fatalf("after %s: got %d logs, want %d", step.status, len(actions), step.wantLogs)
		}
		for _, action := range actions {
			if action != model.EventContractMenuStatusUpdated {
				t.Fatalf("action = %q, want %q", action, model.EventContractMenuStatusUpdated)
			}
		}
	}
}

// SUBMITTED cannot be set through UpdateWithUser while no file is
// registered, and the rejected change writes no log.
func TestUpdateWithUserRejectsSubmittedWithoutFiles(t *testing.T) {
	testdb.Open(t)
	cm := seedStatusLogContractMenu(t)

	cm.Status = "SUBMITTED"
	if err := NewContractMenuService().UpdateWithUser(cm, "user-test"); !errors.Is(err, ErrSubmittedStateConflict) {
		t.Fatalf("err = %v, want ErrSubmittedStateConflict", err)
	}
	if actions := activityLogActions(t); len(actions) != 0 {
		t.Fatalf("got logs %q, want none", actions)
	}
}

// Registering a file makes the Contract Menu SUBMITTED and writes one
// AD_MATERIAL_UPLOADED entry per file, not CONTRACT_MENU_STATUS_UPDATED.
func TestAddFilesSubmitsAndLogsUpload(t *testing.T) {
	testdb.Open(t)
	cm := seedStatusLogContractMenu(t)
	// addFiles accepts only the active Year.
	if err := db.DB.Model(&model.Year{}).Where("id = ?", testYearID).Update("is_active", true).Error; err != nil {
		t.Fatalf("activate year: %v", err)
	}

	updated, err := NewContractMenuService().AddFiles(cm.ID, []ContractMenuDriveFileInput{{
		DriveURL:      "https://drive.google.com/file/d/test-file/view",
		DriveFileName: "ad.pdf",
	}}, "user-test")
	if err != nil {
		t.Fatalf("add files: %v", err)
	}
	if updated.Status != "SUBMITTED" {
		t.Fatalf("status = %q, want SUBMITTED", updated.Status)
	}
	actions := activityLogActions(t)
	if len(actions) != 1 || actions[0] != model.EventAdMaterialUploaded {
		t.Fatalf("logs = %q, want one %q", actions, model.EventAdMaterialUploaded)
	}
}
