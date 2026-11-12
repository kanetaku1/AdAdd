package integration

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/shopspring/decimal"
)

// createSponsorshipMenuWithoutSubmission creates a menu with
// requiresSubmission = false (e.g. a company booth).
func createSponsorshipMenuWithoutSubmission(t *testing.T, client *apiClient, yearID, name string, defaultPrice int64) string {
	t.Helper()
	response := client.do(http.MethodPost, "/years/"+yearID+"/sponsorship-menus", map[string]any{
		"name":               name,
		"defaultPrice":       decimal.NewFromInt(defaultPrice),
		"requiresSubmission": false,
		"isActive":           true,
	})
	expectStatus(t, response, http.StatusCreated)
	return decodeData[model.SponsorshipMenu](t, response).ID
}

func loadContractMenu(id string, contractMenu *model.ContractMenu) error {
	return db.DB.First(contractMenu, "id = ?", id).Error
}

func expectErrorMessage(t *testing.T, label string, body []byte, want string) {
	t.Helper()
	var decoded struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatalf("%s: decode error body: %v (%s)", label, err, body)
	}
	if decoded.Error.Message != want {
		t.Fatalf("%s: message = %q, want %q", label, decoded.Error.Message, want)
	}
}

// productionType is one of COMPANY / INTERNAL / CONTINUED for a menu that
// requires submission, and null for one that does not; anything else is 400
// (spec/model.md#ContractMenuProductionType, Issue #162).
func TestProductionTypeMustMatchSponsorshipMenu(t *testing.T) {
	actor := newActors(t)
	member := actor.sponsorshipMember

	companyID := createCompany(t, actor.administrator, "制作区分株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	pamphletMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "パンフレット広告", 80000)
	boothMenuID := createSponsorshipMenuWithoutSubmission(t, actor.administrator, yearID, "企業ブース", 50000)
	yearlyCompanyID := loadYearlyCompany(t, yearID, companyID).ID
	path := "/yearly-companies/" + yearlyCompanyID + "/contract"

	cases := []struct {
		name    string
		line    map[string]any
		message string
	}{
		{"missing on a submission menu", map[string]any{"sponsorshipMenuId": pamphletMenuID, "quantity": 1},
			"協賛メニュー「パンフレット広告」の制作区分（企業・委員・継続）を指定してください"},
		{"null on a submission menu", map[string]any{"sponsorshipMenuId": pamphletMenuID, "quantity": 1, "productionType": nil},
			"協賛メニュー「パンフレット広告」の制作区分（企業・委員・継続）を指定してください"},
		{"unknown value", map[string]any{"sponsorshipMenuId": pamphletMenuID, "quantity": 1, "productionType": "COMMITTEE"},
			"制作区分「COMMITTEE」は指定できません。企業・委員・継続のいずれかを指定してください"},
		{"empty string", map[string]any{"sponsorshipMenuId": pamphletMenuID, "quantity": 1, "productionType": ""},
			"制作区分「」は指定できません。企業・委員・継続のいずれかを指定してください"},
		{"value on a menu without submission", map[string]any{"sponsorshipMenuId": boothMenuID, "quantity": 1, "productionType": "COMPANY"},
			"提出不要の協賛メニュー「企業ブース」には制作区分を指定できません"},
	}
	for _, c := range cases {
		response := member.do(http.MethodPost, path, map[string]any{"contractMenus": []map[string]any{c.line}})
		if response.Code != http.StatusBadRequest {
			t.Fatalf("%s: status = %d, want 400 (%s)", c.name, response.Code, response.Body.String())
		}
		expectErrorMessage(t, c.name, response.Body.Bytes(), c.message)
	}

	// Valid: each code on a submission menu, null on a booth.
	contract := createContract(t, member, yearlyCompanyID,
		map[string]any{"sponsorshipMenuId": pamphletMenuID, "quantity": 1, "productionType": "COMPANY"},
		map[string]any{"sponsorshipMenuId": pamphletMenuID, "quantity": 1, "productionType": "INTERNAL"},
		map[string]any{"sponsorshipMenuId": pamphletMenuID, "quantity": 1, "productionType": "CONTINUED"},
		map[string]any{"sponsorshipMenuId": boothMenuID, "quantity": 1, "productionType": nil},
	)

	statusByType := map[string]string{}
	listed := member.do(http.MethodGet, "/contracts/"+contract.ID+"/menus", nil)
	expectStatus(t, listed, http.StatusOK)
	for _, contractMenu := range decodeData[[]model.ContractMenu](t, listed) {
		key := "null"
		if contractMenu.ProductionType != nil {
			key = *contractMenu.ProductionType
		}
		statusByType[key] = contractMenu.Status
	}
	// A Continued advertisement is already produced: it starts COMPLETED.
	want := map[string]string{"COMPANY": "WAITING", "INTERNAL": "WAITING", "CONTINUED": "COMPLETED", "null": "WAITING"}
	for productionType, status := range want {
		if statusByType[productionType] != status {
			t.Fatalf("status of %s = %q, want %q (all: %v)", productionType, statusByType[productionType], status, statusByType)
		}
	}

	// Add Contract Menu follows the same rule.
	added := member.do(http.MethodPost, "/contracts/"+contract.ID+"/menus", map[string]any{
		"sponsorshipMenuId": boothMenuID, "quantity": 1, "productionType": "INTERNAL",
	})
	expectStatus(t, added, http.StatusBadRequest)
	expectErrorMessage(t, "add", added.Body.Bytes(), "提出不要の協賛メニュー「企業ブース」には制作区分を指定できません")
	added = member.do(http.MethodPost, "/contracts/"+contract.ID+"/menus", map[string]any{
		"sponsorshipMenuId": pamphletMenuID, "quantity": 1, "productionType": "CONTINUED",
	})
	expectStatus(t, added, http.StatusCreated)
	if got := decodeData[model.ContractMenu](t, added).Status; got != "COMPLETED" {
		t.Fatalf("added CONTINUED status = %s, want COMPLETED", got)
	}
}

// Update Contract Menu checks productionType only when it is sent, against
// the menu's current requiresSubmission. A row left behind by a
// requiresSubmission change is kept and can still be edited otherwise.
func TestUpdateContractMenuProductionType(t *testing.T) {
	actor := newActors(t)
	member := actor.sponsorshipMember

	companyID := createCompany(t, actor.administrator, "制作区分変更株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	pamphletMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "パンフレット広告", 80000)
	contract := createContract(t, member, loadYearlyCompany(t, yearID, companyID).ID,
		map[string]any{"sponsorshipMenuId": pamphletMenuID, "quantity": 1, "productionType": "COMPANY"})
	contractMenuID := listContractMenuIDs(t, contract.ID)[0]
	menuPath := "/contract-menus/" + contractMenuID

	expectStatus(t, member.do(http.MethodPatch, menuPath, map[string]any{"productionType": "COMMITTEE"}), http.StatusBadRequest)
	expectStatus(t, member.do(http.MethodPatch, menuPath, map[string]any{"productionType": nil}), http.StatusBadRequest)

	// Changing the production type never changes the status (status is the
	// Advertisement Manager's), even to CONTINUED.
	updated := member.do(http.MethodPatch, menuPath, map[string]any{"productionType": "CONTINUED"})
	expectStatus(t, updated, http.StatusOK)
	contractMenu := decodeData[model.ContractMenu](t, updated)
	if contractMenu.ProductionType == nil || *contractMenu.ProductionType != "CONTINUED" || contractMenu.Status != "WAITING" {
		t.Fatalf("after CONTINUED: productionType = %v, status = %s; want CONTINUED, WAITING", contractMenu.ProductionType, contractMenu.Status)
	}

	// The menu stops requiring submission: the stored value stays.
	expectStatus(t, actor.administrator.do(http.MethodPatch, "/sponsorship-menus/"+pamphletMenuID, map[string]any{
		"name": "パンフレット広告", "defaultPrice": "80000", "requiresSubmission": false, "isActive": true,
	}), http.StatusOK)
	var stored model.ContractMenu
	if err := loadContractMenu(contractMenuID, &stored); err != nil {
		t.Fatalf("load contract menu: %v", err)
	}
	if stored.ProductionType == nil || *stored.ProductionType != "CONTINUED" {
		t.Fatalf("stored productionType = %v, want CONTINUED kept", stored.ProductionType)
	}
	// An update without productionType is still accepted.
	expectStatus(t, member.do(http.MethodPatch, menuPath, map[string]any{"quantity": 2}), http.StatusOK)
	// A sent value must now be null.
	expectStatus(t, member.do(http.MethodPatch, menuPath, map[string]any{"productionType": "COMPANY"}), http.StatusBadRequest)
	cleared := member.do(http.MethodPatch, menuPath, map[string]any{"productionType": nil})
	expectStatus(t, cleared, http.StatusOK)
	if got := decodeData[model.ContractMenu](t, cleared).ProductionType; got != nil {
		t.Fatalf("productionType after clearing = %v, want null", *got)
	}
}

// maxQuantity is a guide shown on the screens, not a limit the API enforces.
func TestMaxQuantityIsNotEnforced(t *testing.T) {
	actor := newActors(t)
	member := actor.sponsorshipMember

	companyID := createCompany(t, actor.administrator, "上限超過株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	response := actor.administrator.do(http.MethodPost, "/years/"+yearID+"/sponsorship-menus", map[string]any{
		"name": "企業ブース", "defaultPrice": "50000", "requiresSubmission": false, "isActive": true, "maxQuantity": 1,
	})
	expectStatus(t, response, http.StatusCreated)
	boothMenuID := decodeData[model.SponsorshipMenu](t, response).ID

	contract := createContract(t, member, loadYearlyCompany(t, yearID, companyID).ID,
		map[string]any{"sponsorshipMenuId": boothMenuID, "quantity": 2})
	expectStatus(t, member.do(http.MethodPost, "/contracts/"+contract.ID+"/menus", map[string]any{
		"sponsorshipMenuId": boothMenuID, "quantity": 1,
	}), http.StatusCreated)
}

// A CONTINUED Contract Menu starts COMPLETED (its design exists), but
// whether it is submitted follows its Drive files: registering one makes it
// SUBMITTED, and deleting the last one returns it to WAITING
// (spec/model.md#ContractMenu).
func TestContinuationSubmissionFollowsDriveFiles(t *testing.T) {
	actor := newActors(t)
	member := actor.sponsorshipMember

	companyID := createCompany(t, actor.administrator, "継続提出株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	pamphletMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "パンフレット広告", 80000)
	contract := createContract(t, member, loadYearlyCompany(t, yearID, companyID).ID,
		map[string]any{"sponsorshipMenuId": pamphletMenuID, "quantity": 1, "productionType": "CONTINUED"})
	contractMenuID := listContractMenuIDs(t, contract.ID)[0]
	filesPath := "/contract-menus/" + contractMenuID + "/production/files"

	expectContractMenuStatus := func(want string) {
		t.Helper()
		var stored model.ContractMenu
		if err := loadContractMenu(contractMenuID, &stored); err != nil {
			t.Fatalf("load contract menu: %v", err)
		}
		if stored.Status != want {
			t.Fatalf("status = %s, want %s", stored.Status, want)
		}
	}

	expectContractMenuStatus("COMPLETED")
	added := member.do(http.MethodPost, filesPath, map[string]any{
		"files": []map[string]string{{"driveUrl": "https://drive.google.com/file/d/previous/view", "driveFileName": "前年度広告.pdf"}},
	})
	expectStatus(t, added, http.StatusCreated)
	expectContractMenuStatus("SUBMITTED")

	withFiles := decodeData[model.ContractMenu](t, added)
	expectStatus(t, member.do(http.MethodDelete, filesPath+"/"+withFiles.Files[0].ID, nil), http.StatusOK)
	expectContractMenuStatus("WAITING")
}
