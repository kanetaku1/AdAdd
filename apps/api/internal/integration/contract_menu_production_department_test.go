package integration

import (
	"net/http"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

func TestContractMenuProductionDepartmentAndStatusRules(t *testing.T) {
	actors := newActors(t)
	manager := asUser(t, actors.administrator.server, "user-ad-manager-department", "ADVERTISEMENT_MANAGER")
	companyID := createCompany(t, actors.administrator, "制作部門割当株式会社")
	yearID := createYear(t, actors.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2027, 3, 31))
	menuID := createSponsorshipMenu(t, actors.administrator, yearID, "制作部門割当メニュー", 80000)
	contract := createContract(t, actors.sponsorshipMember, loadYearlyCompany(t, yearID, companyID).ID,
		map[string]any{"sponsorshipMenuId": menuID, "quantity": 1, "productionType": "INTERNAL"})

	initialMenus := actors.sponsorshipMember.do(http.MethodGet, "/contracts/"+contract.ID+"/menus", nil)
	expectStatus(t, initialMenus, http.StatusOK)
	firstMenuID := decodeData[[]model.ContractMenu](t, initialMenus)[0].ID
	added := actors.sponsorshipMember.do(http.MethodPost, "/contracts/"+contract.ID+"/menus", map[string]any{
		"sponsorshipMenuId": menuID,
		"quantity":          1,
		"productionType":    "INTERNAL",
	})
	expectStatus(t, added, http.StatusCreated)
	secondMenuID := decodeData[model.ContractMenu](t, added).ID
	added = actors.sponsorshipMember.do(http.MethodPost, "/contracts/"+contract.ID+"/menus", map[string]any{
		"sponsorshipMenuId": menuID,
		"quantity":          1,
		"productionType":    "COMPANY",
	})
	expectStatus(t, added, http.StatusCreated)
	companyMenuID := decodeData[model.ContractMenu](t, added).ID
	added = actors.sponsorshipMember.do(http.MethodPost, "/contracts/"+contract.ID+"/menus", map[string]any{
		"sponsorshipMenuId": menuID,
		"quantity":          1,
		"productionType":    "CONTINUED",
	})
	expectStatus(t, added, http.StatusCreated)
	continuedMenuID := decodeData[model.ContractMenu](t, added).ID

	departmentPath := "/contract-menus/" + firstMenuID + "/production-department"
	for _, actor := range []struct {
		name   string
		client *apiClient
	}{
		{name: "sponsorship member", client: actors.sponsorshipMember},
		{name: "advisor", client: actors.advisor},
		{name: "finance", client: actors.finance},
		{name: "no role", client: actors.noRole},
	} {
		t.Run(actor.name+" cannot assign department", func(t *testing.T) {
			response := actor.client.do(http.MethodPatch, departmentPath, map[string]any{
				"productionDepartment": "PRODUCTION_BUREAU",
			})
			expectStatus(t, response, http.StatusForbidden)
		})
	}

	for _, assignment := range []struct {
		menuID     string
		department string
	}{
		{firstMenuID, "PRODUCTION_BUREAU"},
		{secondMenuID, "SOCIAL_MEDIA_DEPARTMENT"},
	} {
		response := manager.do(http.MethodPatch, "/contract-menus/"+assignment.menuID+"/production-department", map[string]any{
			"productionDepartment": assignment.department,
		})
		expectStatus(t, response, http.StatusOK)
		menu := decodeData[model.ContractMenu](t, response)
		if menu.ProductionDepartment == nil || *menu.ProductionDepartment != assignment.department {
			t.Fatalf("productionDepartment = %v, want %s", menu.ProductionDepartment, assignment.department)
		}
	}

	expectStatus(t, manager.do(http.MethodPatch, "/contract-menus/"+firstMenuID+"/production-department", map[string]any{
		"productionDepartment": "DOCUMENT_CREATION_DEPARTMENT",
	}), http.StatusOK)
	expectStatus(t, actors.administrator.do(http.MethodPatch, "/contract-menus/"+firstMenuID+"/production-department", map[string]any{
		"productionDepartment": nil,
	}), http.StatusOK)
	expectStatus(t, manager.do(http.MethodPatch, "/contract-menus/"+firstMenuID+"/production-department", map[string]any{
		"productionDepartment": "PRODUCTION_BUREAU",
	}), http.StatusOK)

	expectStatus(t, manager.do(http.MethodPatch, "/contract-menus/"+companyMenuID+"/production-department", map[string]any{
		"productionDepartment": "PRODUCTION_BUREAU",
	}), http.StatusBadRequest)
	expectStatus(t, manager.do(http.MethodPatch, "/contract-menus/"+companyMenuID+"/production-department", map[string]any{
		"productionDepartment": nil,
	}), http.StatusBadRequest)
	expectStatus(t, manager.do(http.MethodPatch, "/contract-menus/"+firstMenuID+"/production-department", map[string]any{
		"productionDepartment": "UNKNOWN",
	}), http.StatusBadRequest)
	expectStatus(t, manager.do(http.MethodPatch, "/contract-menus/"+firstMenuID+"/production-department", map[string]any{}), http.StatusBadRequest)

	filtered := actors.sponsorshipMember.do(http.MethodGet, "/years/"+yearID+"/contract-menus?productionDepartment=PRODUCTION_BUREAU", nil)
	expectStatus(t, filtered, http.StatusOK)
	filteredMenus := decodeData[[]model.ContractMenuResponse](t, filtered)
	if len(filteredMenus) != 1 || filteredMenus[0].ID != firstMenuID {
		t.Fatalf("department filter returned %d rows, want only %s", len(filteredMenus), firstMenuID)
	}
	expectStatus(t, actors.sponsorshipMember.do(http.MethodGet, "/years/"+yearID+"/contract-menus?productionDepartment=UNKNOWN", nil), http.StatusBadRequest)
	internal := actors.sponsorshipMember.do(http.MethodGet, "/years/"+yearID+"/contract-menus?productionType=INTERNAL", nil)
	expectStatus(t, internal, http.StatusOK)
	if got := len(decodeData[[]model.ContractMenuResponse](t, internal)); got != 2 {
		t.Fatalf("INTERNAL filter returned %d rows, want 2", got)
	}

	statusPath := "/contract-menus/" + firstMenuID + "/status"
	expectStatus(t, manager.do(http.MethodPatch, statusPath, map[string]any{"status": "REQUESTED"}), http.StatusOK)
	expectStatus(t, manager.do(http.MethodPatch, statusPath, map[string]any{"status": "COMPANY_REVIEWING"}), http.StatusOK)
	expectStatus(t, manager.do(http.MethodPatch, statusPath, map[string]any{"status": "SUBMITTED"}), http.StatusConflict)

	secondStatusPath := "/contract-menus/" + secondMenuID + "/status"
	expectStatus(t, actors.administrator.do(http.MethodPatch, "/contract-menus/"+secondMenuID+"/production-department", map[string]any{
		"productionDepartment": nil,
	}), http.StatusOK)
	expectStatus(t, manager.do(http.MethodPatch, secondStatusPath, map[string]any{"status": "WAITING"}), http.StatusOK)

	companyStatusPath := "/contract-menus/" + companyMenuID + "/status"
	expectStatus(t, manager.do(http.MethodPatch, companyStatusPath, map[string]any{"status": "REQUESTED"}), http.StatusOK)
	expectStatus(t, manager.do(http.MethodPatch, companyStatusPath, map[string]any{"status": "COMPLETED"}), http.StatusConflict)
	expectStatus(t, manager.do(http.MethodPatch, companyStatusPath, map[string]any{
		"status": "COMPLETED", "acknowledgeAutomaticState": true,
	}), http.StatusOK)
	expectStatus(t, manager.do(http.MethodPatch, companyStatusPath, map[string]any{"status": "WAITING"}), http.StatusOK)
	expectStatus(t, manager.do(http.MethodPatch, "/contract-menus/"+continuedMenuID+"/status", map[string]any{"status": "REQUESTED"}), http.StatusOK)

	filesPath := "/contract-menus/" + firstMenuID + "/production/files"
	fileResponse := actors.sponsorshipMember.do(http.MethodPost, filesPath, map[string]any{
		"files": []map[string]string{{
			"driveUrl":      "https://drive.google.com/file/d/department-rule/view",
			"driveFileName": "広告資料.pdf",
		}},
	})
	expectStatus(t, fileResponse, http.StatusCreated)
	file := decodeData[model.ContractMenu](t, fileResponse).Files[0]
	expectStatus(t, manager.do(http.MethodPatch, statusPath, map[string]any{"status": "WAITING"}), http.StatusOK)
	expectStatus(t, actors.sponsorshipMember.do(http.MethodDelete, filesPath+"/"+file.ID, nil), http.StatusOK)
	expectStatus(t, manager.do(http.MethodPatch, statusPath, map[string]any{"status": "WAITING"}), http.StatusOK)

	if err := db.DB.Model(&model.Year{}).Where("id = ?", yearID).Update("is_active", false).Error; err != nil {
		t.Fatalf("deactivate year: %v", err)
	}
	expectStatus(t, manager.do(http.MethodPatch, departmentPath, map[string]any{
		"productionDepartment": "SOCIAL_MEDIA_DEPARTMENT",
	}), http.StatusConflict)
	expectStatus(t, manager.do(http.MethodPatch, statusPath, map[string]any{"status": "WAITING"}), http.StatusConflict)
	expectStatus(t, actors.sponsorshipMember.do(http.MethodPatch, "/contract-menus/"+firstMenuID, map[string]any{
		"productionType": "COMPANY",
	}), http.StatusConflict)
}
