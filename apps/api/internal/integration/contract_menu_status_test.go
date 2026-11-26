package integration

import (
	"net/http"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

func TestUpdateContractMenuStatusRequiresAdvertisementManagerOrAdministrator(t *testing.T) {
	actors := newActors(t)
	advertisementManager := asUser(t, actors.administrator.server, "user-advertisement-manager", "ADVERTISEMENT_MANAGER")

	companyID := createCompany(t, actors.administrator, "ステータス権限株式会社")
	yearID := createYear(t, actors.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2027, 3, 31))
	menuID := createSponsorshipMenuWithoutSubmission(t, actors.administrator, yearID, "ステータス権限メニュー", 80000)
	yearlyCompany := loadYearlyCompany(t, yearID, companyID)
	contract := createContract(t, actors.sponsorshipMember, yearlyCompany.ID, map[string]any{
		"sponsorshipMenuId": menuID,
		"quantity":          1,
		"productionType":    nil,
	})
	contractMenusResponse := actors.sponsorshipMember.do(http.MethodGet, "/contracts/"+contract.ID+"/menus", nil)
	expectStatus(t, contractMenusResponse, http.StatusOK)
	contractMenu := decodeData[[]model.ContractMenu](t, contractMenusResponse)[0]
	statusPath := "/contract-menus/" + contractMenu.ID + "/status"

	for _, actor := range []struct {
		name   string
		client *apiClient
	}{
		{name: "sponsorship member", client: actors.sponsorshipMember},
		{name: "advisor", client: actors.advisor},
		{name: "finance", client: actors.finance},
		{name: "no role", client: actors.noRole},
	} {
		t.Run(actor.name, func(t *testing.T) {
			response := actor.client.do(http.MethodPatch, statusPath, map[string]any{"status": "REQUESTED"})
			expectStatus(t, response, http.StatusForbidden)
		})
	}

	managerUpdate := advertisementManager.do(http.MethodPatch, statusPath, map[string]any{"status": "REQUESTED"})
	expectStatus(t, managerUpdate, http.StatusOK)
	expectStatus(t, advertisementManager.do(http.MethodPatch, statusPath, map[string]any{"status": "PRODUCING"}), http.StatusBadRequest)

	administratorUpdate := actors.administrator.do(http.MethodPatch, statusPath, map[string]any{
		"status":                    "COMPLETED",
		"acknowledgeAutomaticState": true,
	})
	expectStatus(t, administratorUpdate, http.StatusOK)
}
