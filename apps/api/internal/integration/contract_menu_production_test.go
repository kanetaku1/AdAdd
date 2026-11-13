package integration

import (
	"net/http"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

// Updating only the production remarks (PATCH /contract-menus/{id}/production
// without a Drive file) changes neither the status nor 活動記録. Submission is
// derived from Drive files, never set by this endpoint (Issue #166,
// spec/model.md#ContractMenu).
func TestProductionRemarksOnlyKeepStatusAndActivityLog(t *testing.T) {
	actors := newActors(t)
	companyID := createCompany(t, actors.administrator, "制作備考株式会社")
	yearID := createYear(t, actors.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2027, 3, 31))
	menuID := createSponsorshipMenu(t, actors.administrator, yearID, "パンフレット広告", 80000)
	yearlyCompany := loadYearlyCompany(t, yearID, companyID)
	contract := createContract(t, actors.sponsorshipMember, yearlyCompany.ID)
	added := actors.sponsorshipMember.do(http.MethodPost, "/contracts/"+contract.ID+"/menus", map[string]any{
		"sponsorshipMenuId": menuID,
		"quantity":          1,
		"productionType":    "COMPANY",
	})
	expectStatus(t, added, http.StatusCreated)
	contractMenu := decodeData[model.ContractMenu](t, added)
	productionPath := "/contract-menus/" + contractMenu.ID + "/production"

	countAllActivityLogs := func() int64 {
		t.Helper()
		var count int64
		if err := db.DB.Model(&model.ActivityLog{}).Where("yearly_company_id = ?", yearlyCompany.ID).Count(&count).Error; err != nil {
			t.Fatalf("count activity logs: %v", err)
		}
		return count
	}
	expectStored := func(wantStatus, wantRemarks string) {
		t.Helper()
		var stored model.ContractMenu
		if err := db.DB.First(&stored, "id = ?", contractMenu.ID).Error; err != nil {
			t.Fatalf("load contract menu: %v", err)
		}
		if stored.Status != wantStatus || stored.Remarks != wantRemarks {
			t.Fatalf("stored status = %s, remarks = %q; want %s, %q", stored.Status, stored.Remarks, wantStatus, wantRemarks)
		}
	}

	// From WAITING, set explicitly so the test does not depend on the status a
	// new Contract Menu starts with.
	expectStatus(t, actors.administrator.do(http.MethodPatch, "/contract-menus/"+contractMenu.ID+"/status", map[string]any{
		"status": "WAITING",
	}), http.StatusOK)
	logsBefore := countAllActivityLogs()
	expectStatus(t, actors.sponsorshipMember.do(http.MethodPatch, productionPath, map[string]any{
		"remarks": "企業確認済み",
	}), http.StatusOK)
	expectStored("WAITING", "企業確認済み")
	if got := countAllActivityLogs(); got != logsBefore {
		t.Fatalf("activity logs after remarks-only update = %d, want %d", got, logsBefore)
	}

	// From an in-progress status: it is not reset or moved to SUBMITTED.
	expectStatus(t, actors.administrator.do(http.MethodPatch, "/contract-menus/"+contractMenu.ID+"/status", map[string]any{
		"status": "PRODUCING",
	}), http.StatusOK)
	logsBefore = countAllActivityLogs()
	expectStatus(t, actors.sponsorshipMember.do(http.MethodPatch, productionPath, map[string]any{
		"remarks": "色校正待ち",
	}), http.StatusOK)
	expectStored("PRODUCING", "色校正待ち")
	if got := countAllActivityLogs(); got != logsBefore {
		t.Fatalf("activity logs after remarks-only update = %d, want %d", got, logsBefore)
	}
}
