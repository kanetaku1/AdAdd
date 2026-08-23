package service

import (
	"fmt"
	"testing"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
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

func TestUpdateWithUserLogsAnyStatusChangeOnce(t *testing.T) {
	openPaymentSyncTestDB(t)

	suffix := fmt.Sprintf("alog-%d", time.Now().UnixNano())
	contractID, menuMasterID, _ := seedPaymentSyncContract(t, suffix, "WAITING", decimal.Zero)
	yearlyCompanyID := "test-yearly-company-" + suffix
	cmID := "test-cm-" + suffix

	t.Cleanup(func() {
		db.DB.Unscoped().Delete(&model.ActivityLog{}, "yearly_company_id = ?", yearlyCompanyID)
		db.DB.Unscoped().Delete(&model.ContractMenu{}, "id = ?", cmID)
	})

	cm := &model.ContractMenu{
		ID:                cmID,
		ContractID:        contractID,
		SponsorshipMenuID: menuMasterID,
		Quantity:          1,
		UnitPrice:         decimal.NewFromInt(100),
		Status:            "WAITING",
	}
	if err := db.DB.Create(cm).Error; err != nil {
		t.Fatalf("seed contract menu: %v", err)
	}

	svc := NewContractMenuService()
	cm.Status = "PRODUCING"
	if err := svc.UpdateWithUser(cm, "user-test"); err != nil {
		t.Fatalf("WAITING -> PRODUCING: %v", err)
	}

	var logs []model.ActivityLog
	if err := db.DB.Where("yearly_company_id = ?", yearlyCompanyID).Find(&logs).Error; err != nil {
		t.Fatalf("list logs: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("after first change: got %d logs, want 1", len(logs))
	}
	if logs[0].Action != model.EventContractMenuStatusUpdated {
		t.Fatalf("action = %q", logs[0].Action)
	}

	cm.Status = "PRODUCING"
	if err := svc.UpdateWithUser(cm, "user-test"); err != nil {
		t.Fatalf("same status: %v", err)
	}
	if err := db.DB.Where("yearly_company_id = ?", yearlyCompanyID).Find(&logs).Error; err != nil {
		t.Fatalf("list logs: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("same-status PATCH must not add a log, got %d", len(logs))
	}

	cm.Status = "SUBMITTED"
	if err := svc.UpdateWithUser(cm, "user-test"); err != nil {
		t.Fatalf("PRODUCING -> SUBMITTED: %v", err)
	}
	if err := db.DB.Where("yearly_company_id = ?", yearlyCompanyID).Find(&logs).Error; err != nil {
		t.Fatalf("list logs: %v", err)
	}
	if len(logs) != 2 {
		t.Fatalf("upload-equivalent SUBMITTED must write exactly one more log, got %d", len(logs))
	}
}
