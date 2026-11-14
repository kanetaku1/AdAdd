package integration

import (
	"encoding/json"
	"net/http"
	"testing"
)

const unknownID = "00000000-0000-0000-0000-000000000000"

// A missing resource is 404 and a business-rule violation is 400 / 409, each
// with a Japanese message — never a 500 "server error" (Issue #165).
func TestNotFoundAndBusinessRuleErrorsAreNotServerErrors(t *testing.T) {
	actor := newActors(t)
	member := actor.sponsorshipMember

	companyID := createCompany(t, actor.administrator, "エラー確認株式会社")
	previousYearID := createYear(t, actor.administrator, "2025", festivalDate(2025, 4, 1), festivalDate(2025, 11, 30))
	previousMenuID := createSponsorshipMenu(t, actor.administrator, previousYearID, "前年度メニュー", 50000)
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	pamphletMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "パンフレット広告", 80000)
	contract := createContract(t, member, loadYearlyCompany(t, yearID, companyID).ID,
		map[string]any{"sponsorshipMenuId": pamphletMenuID, "quantity": 1})

	cases := []struct {
		name    string
		client  *apiClient
		method  string
		path    string
		body    any
		status  int
		message string
	}{
		{
			"add Contract Menu to an unknown contract", member,
			http.MethodPost, "/contracts/" + unknownID + "/menus",
			map[string]any{"sponsorshipMenuId": pamphletMenuID, "quantity": 1},
			http.StatusNotFound, "契約が見つかりません",
		},
		{
			"add an unknown Sponsorship Menu", member,
			http.MethodPost, "/contracts/" + contract.ID + "/menus",
			map[string]any{"sponsorshipMenuId": unknownID, "quantity": 1},
			http.StatusBadRequest, "協賛メニューが見つかりません: sponsorship menu not found",
		},
		{
			"add another Year's Sponsorship Menu", member,
			http.MethodPost, "/contracts/" + contract.ID + "/menus",
			map[string]any{"sponsorshipMenuId": previousMenuID, "quantity": 1},
			http.StatusBadRequest, "契約と異なる年度の協賛メニューは追加できません: sponsorship menu year does not match contract year",
		},
		{
			"update an unknown Payment's status", actor.finance,
			http.MethodPatch, "/payments/" + unknownID,
			map[string]any{"status": "CONFIRMED"},
			http.StatusNotFound, "入金が見つかりません",
		},
		{
			"create a contract for an unknown Yearly Company", member,
			http.MethodPost, "/yearly-companies/" + unknownID + "/contract",
			map[string]any{"contractMenus": []map[string]any{{"sponsorshipMenuId": pamphletMenuID, "quantity": 1}}},
			http.StatusNotFound, "年度別企業が見つかりません",
		},
	}
	for _, c := range cases {
		response := c.client.do(c.method, c.path, c.body)
		if response.Code != c.status {
			t.Fatalf("%s: status = %d, want %d (%s)", c.name, response.Code, c.status, response.Body.String())
		}
		var body struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
			t.Fatalf("%s: decode error body: %v (%s)", c.name, err, response.Body.String())
		}
		if body.Error.Message != c.message {
			t.Fatalf("%s: message = %q, want %q", c.name, body.Error.Message, c.message)
		}
	}
}
