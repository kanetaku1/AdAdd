package integration

import (
	"net/http"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

// spec/api.md#Authorization Matrix: deletion is Administrator-only
// system-wide. Every other Role's "manage" access is create/update only.
func TestDeletionIsAdministratorOnly(t *testing.T) {
	actor := newActors(t)

	contractCompanyID := createCompany(t, actor.administrator, "契約削除テスト株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	// Created after the Year, so no Yearly Company references it.
	companyID := createCompany(t, actor.administrator, "削除テスト株式会社")
	sponsorshipMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "パンフレット広告", 50000)
	contractMenuSourceID := createSponsorshipMenu(t, actor.administrator, yearID, "HPバナー広告", 10000)
	contract := createContract(t, actor.sponsorshipMember, loadYearlyCompany(t, yearID, contractCompanyID).ID)
	added := actor.sponsorshipMember.do(http.MethodPost, "/contracts/"+contract.ID+"/menus", map[string]any{
		"sponsorshipMenuId": contractMenuSourceID, "quantity": 1, "productionType": "COMPANY",
	})
	expectStatus(t, added, http.StatusCreated)
	contractMenuID := decodeData[model.ContractMenu](t, added).ID

	targets := []struct {
		name   string
		path   string
		exists func() bool
	}{
		{"Company", "/companies/" + companyID, func() bool { return recordExists(t, &model.Company{}, companyID) }},
		{"Sponsorship Menu", "/sponsorship-menus/" + sponsorshipMenuID, func() bool { return recordExists(t, &model.SponsorshipMenu{}, sponsorshipMenuID) }},
		{"Contract Menu", "/contract-menus/" + contractMenuID, func() bool { return recordExists(t, &model.ContractMenu{}, contractMenuID) }},
	}

	for _, target := range targets {
		t.Run(target.name, func(t *testing.T) {
			for role, client := range map[string]*apiClient{
				"Sponsorship Member": actor.sponsorshipMember,
				"Advisor":            actor.advisor,
				"Finance Department": actor.finance,
			} {
				if code := client.do(http.MethodDelete, target.path, nil).Code; code != http.StatusForbidden {
					t.Fatalf("%s deleting: status = %d, want 403", role, code)
				}
				if !target.exists() {
					t.Fatalf("%s deleted by %s", target.name, role)
				}
			}

			expectStatus(t, actor.administrator.do(http.MethodDelete, target.path, nil), http.StatusOK)
			if target.exists() {
				t.Fatalf("%s still exists after Administrator deleted it", target.name)
			}
		})
	}
}

// spec/api.md#Delete Company / #Delete Sponsorship Menu: master data that is
// already in use is not deleted, so sponsorship history is never lost.
func TestDeletingMasterDataInUseIsRejected(t *testing.T) {
	actor := newActors(t)

	companyID := createCompany(t, actor.administrator, "使用中テスト株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	sponsorshipMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "パンフレット広告", 50000)
	contract := createContract(t, actor.sponsorshipMember, loadYearlyCompany(t, yearID, companyID).ID)
	expectStatus(t, actor.sponsorshipMember.do(http.MethodPost, "/contracts/"+contract.ID+"/menus", map[string]any{
		"sponsorshipMenuId": sponsorshipMenuID, "quantity": 1, "productionType": "COMPANY",
	}), http.StatusCreated)

	expectStatus(t, actor.administrator.do(http.MethodDelete, "/companies/"+companyID, nil), http.StatusConflict)
	if !recordExists(t, &model.Company{}, companyID) {
		t.Fatal("Company with a Yearly Company was deleted")
	}

	expectStatus(t, actor.administrator.do(http.MethodDelete, "/sponsorship-menus/"+sponsorshipMenuID, nil), http.StatusConflict)
	if !recordExists(t, &model.SponsorshipMenu{}, sponsorshipMenuID) {
		t.Fatal("Sponsorship Menu used by a Contract Menu was deleted")
	}

	expectStatus(t, actor.administrator.do(http.MethodDelete, "/companies/missing-company", nil), http.StatusNotFound)
	expectStatus(t, actor.administrator.do(http.MethodDelete, "/sponsorship-menus/missing-menu", nil), http.StatusNotFound)
}

// recordExists reports whether a non-deleted row with the id exists.
func recordExists(t *testing.T, record any, id string) bool {
	t.Helper()
	var count int64
	if err := db.DB.Model(record).Where("id = ?", id).Count(&count).Error; err != nil {
		t.Fatalf("count %T %s: %v", record, id, err)
	}
	return count > 0
}
