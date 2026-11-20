package integration

import (
	"net/http"
	"sort"
	"strings"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

// Create Contract makes the contract and its Contract Menus in one
// transaction, and the server alone decides totalAmount
// (spec/api.md#Create Contract, Issue #161).
func TestCreateContractWithContractMenus(t *testing.T) {
	actor := newActors(t)
	member := actor.sponsorshipMember

	companyID := createCompany(t, actor.administrator, "一括作成株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	pamphletMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "パンフレット広告1P", 80000)
	bannerMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "ホームページバナー広告", 15000)
	yearlyCompanyID := loadYearlyCompany(t, yearID, companyID).ID

	response := member.do(http.MethodPost, "/yearly-companies/"+yearlyCompanyID+"/contract", map[string]any{
		"contractDate": "2026-06-01",
		// Ignored: the total is calculated from the Contract Menus.
		"totalAmount": 1,
		"contractMenus": []map[string]any{
			{"sponsorshipMenuId": pamphletMenuID, "quantity": 2, "productionType": "COMPANY"},
			{"sponsorshipMenuId": bannerMenuID, "quantity": 1, "unitPrice": "10000", "productionType": "COMPANY"},
			{"sponsorshipMenuId": bannerMenuID, "quantity": 1, "unitPrice": "10000", "isGoodsSponsorship": true, "productionType": "COMPANY"},
		},
	})
	expectStatus(t, response, http.StatusCreated)
	contract := decodeData[model.SponsorshipContract](t, response)
	// 2 × 80,000 (default price) + 10,000 + 0 (goods sponsorship)
	expectAmount(t, "response totalAmount", contract.TotalAmount, 170000)
	expectAmount(t, "stored totalAmount", loadContract(t, contract.ID).TotalAmount, 170000)
	if got := countContractMenus(t, contract.ID); got != 3 {
		t.Fatalf("contract menus = %d, want 3", got)
	}

	if got := loadYearlyCompany(t, yearID, companyID).Progress; got != "CONFIRMED" {
		t.Fatalf("progress = %s, want CONFIRMED", got)
	}
	expectActivityLog(t, yearlyCompanyID, model.EventContractCreated,
		"契約を作成（パンフレット広告1P ×2、ホームページバナー広告 ×1、ホームページバナー広告 ×1（物品協賛）、合計 ¥170,000）")
	expectActivityLog(t, yearlyCompanyID, model.EventProgressUpdated, "進捗を「未連絡」から「協賛確定」に更新")
	// The lines created with the contract are part of CONTRACT_CREATED.
	if got := countActivityLogs(t, yearlyCompanyID, model.EventContractMenuAdded); got != 0 {
		t.Fatalf("CONTRACT_MENU_ADDED logs = %d, want 0", got)
	}
}

// If one Contract Menu is rejected, no contract is left behind, and the same
// request can be sent again once corrected.
func TestCreateContractIsAllOrNothing(t *testing.T) {
	actor := newActors(t)
	member := actor.sponsorshipMember

	companyID := createCompany(t, actor.administrator, "全件失敗株式会社")
	previousYearID := createYear(t, actor.administrator, "2025", festivalDate(2025, 4, 1), festivalDate(2025, 11, 30))
	previousMenuID := createSponsorshipMenu(t, actor.administrator, previousYearID, "前年度メニュー", 50000)
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	pamphletMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "パンフレット広告", 80000)
	inactiveMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "販売終了メニュー", 30000)
	expectStatus(t, actor.administrator.do(http.MethodPatch, "/sponsorship-menus/"+inactiveMenuID, map[string]any{
		"name": "販売終了メニュー", "defaultPrice": "30000", "requiresSubmission": true, "isActive": false,
	}), http.StatusOK)
	yearlyCompanyID := loadYearlyCompany(t, yearID, companyID).ID
	path := "/yearly-companies/" + yearlyCompanyID + "/contract"
	valid := map[string]any{"sponsorshipMenuId": pamphletMenuID, "quantity": 1, "productionType": "COMPANY"}

	cases := []struct {
		name   string
		body   map[string]any
		status int
	}{
		{"no contractMenus", map[string]any{}, http.StatusBadRequest},
		{"empty contractMenus", map[string]any{"contractMenus": []map[string]any{}}, http.StatusBadRequest},
		{"quantity 0", map[string]any{"contractMenus": []map[string]any{valid, {"sponsorshipMenuId": pamphletMenuID, "quantity": 0, "productionType": "COMPANY"}}}, http.StatusBadRequest},
		{"negative unitPrice", map[string]any{"contractMenus": []map[string]any{valid, {"sponsorshipMenuId": pamphletMenuID, "quantity": 1, "unitPrice": "-1", "productionType": "COMPANY"}}}, http.StatusBadRequest},
		{"unknown menu", map[string]any{"contractMenus": []map[string]any{valid, {"sponsorshipMenuId": "00000000-0000-0000-0000-000000000000", "quantity": 1, "productionType": "COMPANY"}}}, http.StatusBadRequest},
		{"other Year's menu", map[string]any{"contractMenus": []map[string]any{valid, {"sponsorshipMenuId": previousMenuID, "quantity": 1, "productionType": "COMPANY"}}}, http.StatusBadRequest},
		{"inactive menu", map[string]any{"contractMenus": []map[string]any{valid, {"sponsorshipMenuId": inactiveMenuID, "quantity": 1, "productionType": "COMPANY"}}}, http.StatusConflict},
	}
	for _, c := range cases {
		response := member.do(http.MethodPost, path, c.body)
		if response.Code != c.status {
			t.Fatalf("%s: status = %d, want %d (%s)", c.name, response.Code, c.status, response.Body.String())
		}
	}

	var contracts int64
	if err := db.DB.Model(&model.SponsorshipContract{}).Where("yearly_company_id = ?", yearlyCompanyID).Count(&contracts).Error; err != nil {
		t.Fatalf("count contracts: %v", err)
	}
	if contracts != 0 {
		t.Fatalf("contracts after rejected requests = %d, want 0", contracts)
	}
	var menus int64
	if err := db.DB.Model(&model.ContractMenu{}).Count(&menus).Error; err != nil {
		t.Fatalf("count contract menus: %v", err)
	}
	if menus != 0 {
		t.Fatalf("contract menus after rejected requests = %d, want 0", menus)
	}
	if got := loadYearlyCompany(t, yearID, companyID).Progress; got != "NOT_CONTACTED" {
		t.Fatalf("progress after rejected requests = %s, want NOT_CONTACTED", got)
	}
	if got := countActivityLogs(t, yearlyCompanyID, model.EventContractCreated); got != 0 {
		t.Fatalf("CONTRACT_CREATED logs after rejected requests = %d, want 0", got)
	}

	// Sending again succeeds: a failed attempt does not leave a contract
	// that would make the retry a 409.
	expectStatus(t, member.do(http.MethodPost, path, map[string]any{"contractMenus": []map[string]any{valid}}), http.StatusCreated)

	expectStatus(t, member.do(http.MethodPost, "/yearly-companies/00000000-0000-0000-0000-000000000000/contract",
		map[string]any{"contractMenus": []map[string]any{valid}}), http.StatusNotFound)
}

// A goods-sponsorship-only contract has no Payment: when the total falls to 0,
// the WAITING Payment is removed and recorded (Issue #164).
func TestWaitingPaymentIsRemovedWhenTotalBecomesZero(t *testing.T) {
	actor := newActors(t)
	member := actor.sponsorshipMember

	companyID := createCompany(t, actor.administrator, "入金削除株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	pamphletMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "パンフレット広告", 80000)
	yearlyCompanyID := loadYearlyCompany(t, yearID, companyID).ID
	contract := createContract(t, member, yearlyCompanyID, map[string]any{"sponsorshipMenuId": pamphletMenuID, "quantity": 1, "productionType": "COMPANY"})
	contractMenuID := listContractMenuIDs(t, contract.ID)[0]
	paymentPath := "/contracts/" + contract.ID + "/payment"

	expectStatus(t, member.do(http.MethodPost, paymentPath, nil), http.StatusCreated)

	// The line becomes goods sponsorship: total 0 → the Payment is removed.
	expectStatus(t, member.do(http.MethodPatch, "/contract-menus/"+contractMenuID, map[string]any{"isGoodsSponsorship": true}), http.StatusOK)
	expectAmount(t, "totalAmount", loadContract(t, contract.ID).TotalAmount, 0)
	expectNoPayment(t, contract.ID)
	expectActivityLog(t, yearlyCompanyID, model.EventPaymentRemoved, "契約金額が0円になったため入金を削除（請求額 ¥80,000）")
	expectStatus(t, member.do(http.MethodGet, paymentPath, nil), http.StatusNotFound)
	expectStatus(t, member.do(http.MethodPost, paymentPath, nil), http.StatusConflict)

	// Paid again: a Payment can be registered again for the same contract.
	expectStatus(t, member.do(http.MethodPatch, "/contract-menus/"+contractMenuID, map[string]any{"isGoodsSponsorship": false}), http.StatusOK)
	expectStatus(t, member.do(http.MethodPost, paymentPath, nil), http.StatusCreated)
	expectAmount(t, "payment amount", loadPayment(t, contract.ID).Amount, 80000)

	// Every line deleted: total 0 → removed; no Contract Menu → no Payment.
	expectStatus(t, actor.administrator.do(http.MethodDelete, "/contract-menus/"+contractMenuID, nil), http.StatusOK)
	expectNoPayment(t, contract.ID)
	if got := countActivityLogs(t, yearlyCompanyID, model.EventPaymentRemoved); got != 2 {
		t.Fatalf("PAYMENT_REMOVED logs = %d, want 2", got)
	}
	expectStatus(t, member.do(http.MethodPost, paymentPath, nil), http.StatusConflict)
}

// A CONFIRMED Payment is never removed: the change that would make the total
// 0 is rejected instead.
func TestConfirmedPaymentBlocksZeroTotal(t *testing.T) {
	actor := newActors(t)
	member := actor.sponsorshipMember

	companyID := createCompany(t, actor.administrator, "入金確認済株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	pamphletMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "パンフレット広告", 80000)
	contract := createContract(t, member, loadYearlyCompany(t, yearID, companyID).ID, map[string]any{"sponsorshipMenuId": pamphletMenuID, "quantity": 1, "productionType": "COMPANY"})
	contractMenuID := listContractMenuIDs(t, contract.ID)[0]

	created := member.do(http.MethodPost, "/contracts/"+contract.ID+"/payment", nil)
	expectStatus(t, created, http.StatusCreated)
	payment := decodeData[model.Payment](t, created)
	expectStatus(t, actor.finance.do(http.MethodPatch, "/payments/"+payment.ID, map[string]any{
		"status": "CONFIRMED", "receivedAmount": 80000,
	}), http.StatusOK)

	expectStatus(t, member.do(http.MethodPatch, "/contract-menus/"+contractMenuID, map[string]any{"isGoodsSponsorship": true}), http.StatusConflict)
	expectStatus(t, actor.administrator.do(http.MethodDelete, "/contract-menus/"+contractMenuID, nil), http.StatusConflict)
	expectAmount(t, "payment amount", loadPayment(t, contract.ID).Amount, 80000)
}

// Contract and Contract Menu edits are recorded in 活動記録, and only when a
// value actually changes (spec/api.md#List Activity Logs for a Yearly Company).
func TestContractAndContractMenuChangesAreRecorded(t *testing.T) {
	actor := newActors(t)
	member := actor.sponsorshipMember

	companyID := createCompany(t, actor.administrator, "活動記録株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	pamphletMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "パンフレット広告1P", 80000)
	bannerMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "ホームページバナー広告", 15000)
	yearlyCompanyID := loadYearlyCompany(t, yearID, companyID).ID
	contract := createContract(t, member, yearlyCompanyID, map[string]any{"sponsorshipMenuId": pamphletMenuID, "quantity": 1, "productionType": "COMPANY"})
	pamphletID := listContractMenuIDs(t, contract.ID)[0]

	// Update Contract
	contractPath := "/contracts/" + contract.ID
	expectStatus(t, member.do(http.MethodPatch, contractPath, map[string]any{"contractDate": "2026-06-10"}), http.StatusOK)
	expectStatus(t, member.do(http.MethodPatch, contractPath, map[string]any{"remarks": "請求書は経理担当宛"}), http.StatusOK)
	expectStatus(t, member.do(http.MethodPatch, contractPath, map[string]any{"contractDate": "2026-06-10", "remarks": "請求書は経理担当宛"}), http.StatusOK)
	expectActivityLogs(t, yearlyCompanyID, model.EventContractUpdated,
		contractDateChange(contract),
		"契約の備考を更新")
	expectStatus(t, member.do(http.MethodPatch, "/contracts/00000000-0000-0000-0000-000000000000", map[string]any{"remarks": "x"}), http.StatusNotFound)

	// Add Contract Menu
	expectStatus(t, member.do(http.MethodPost, "/contracts/"+contract.ID+"/menus", map[string]any{
		"sponsorshipMenuId": bannerMenuID, "quantity": 1, "productionType": "COMPANY",
	}), http.StatusCreated)
	expectStatus(t, member.do(http.MethodPost, "/contracts/"+contract.ID+"/menus", map[string]any{
		"sponsorshipMenuId": bannerMenuID, "quantity": 2, "isGoodsSponsorship": true, "productionType": "COMPANY",
	}), http.StatusCreated)
	expectActivityLogs(t, yearlyCompanyID, model.EventContractMenuAdded,
		"「ホームページバナー広告」を追加（数量 1、単価 ¥15,000）",
		"「ホームページバナー広告」を物品協賛として追加（数量 2）")

	// Update Contract Menu: productionType alone and unchanged values write nothing.
	menuPath := "/contract-menus/" + pamphletID
	expectStatus(t, member.do(http.MethodPatch, menuPath, map[string]any{"quantity": 2}), http.StatusOK)
	expectStatus(t, member.do(http.MethodPatch, menuPath, map[string]any{"quantity": 2}), http.StatusOK)
	expectStatus(t, member.do(http.MethodPatch, menuPath, map[string]any{"productionType": "INTERNAL"}), http.StatusOK)
	expectStatus(t, member.do(http.MethodPatch, menuPath, map[string]any{"quantity": 1, "unitPrice": "60000"}), http.StatusOK)
	expectActivityLogs(t, yearlyCompanyID, model.EventContractMenuUpdated,
		"「パンフレット広告1P」の数量を「1」から「2」に更新",
		"「パンフレット広告1P」の数量を「2」から「1」に、単価を「¥80,000」から「¥60,000」に更新")

	// Delete Contract Menu
	expectStatus(t, actor.administrator.do(http.MethodDelete, menuPath, nil), http.StatusOK)
	expectActivityLogs(t, yearlyCompanyID, model.EventContractMenuRemoved, "「パンフレット広告1P」を削除")
	expectStatus(t, actor.administrator.do(http.MethodDelete, menuPath, nil), http.StatusNotFound)
}

func contractDateChange(contract model.SponsorshipContract) string {
	return "契約日を「" + formatDate(contract.ContractDate) + "」から「2026-06-10」に更新"
}

func formatDate(date *model.Date) string {
	if date == nil {
		return "未設定"
	}
	value, _ := date.MarshalJSON()
	return string(value[1 : len(value)-1])
}

func countContractMenus(t *testing.T, contractID string) int64 {
	t.Helper()
	var count int64
	if err := db.DB.Model(&model.ContractMenu{}).Where("contract_id = ?", contractID).Count(&count).Error; err != nil {
		t.Fatalf("count contract menus: %v", err)
	}
	return count
}

func listContractMenuIDs(t *testing.T, contractID string) []string {
	t.Helper()
	var ids []string
	if err := db.DB.Model(&model.ContractMenu{}).Where("contract_id = ?", contractID).Order("created_at, id").Pluck("id", &ids).Error; err != nil {
		t.Fatalf("list contract menus: %v", err)
	}
	return ids
}

func expectNoPayment(t *testing.T, contractID string) {
	t.Helper()
	var count int64
	if err := db.DB.Unscoped().Model(&model.Payment{}).Where("contract_id = ?", contractID).Count(&count).Error; err != nil {
		t.Fatalf("count payments: %v", err)
	}
	if count != 0 {
		t.Fatalf("payment rows for %s = %d, want 0", contractID, count)
	}
}

func expectActivityLog(t *testing.T, yearlyCompanyID, action, message string) {
	t.Helper()
	expectActivityLogs(t, yearlyCompanyID, action, message)
}

// expectActivityLogs checks the messages of every entry of one action.
// Entries written within the same second have no reliable order, so the
// comparison ignores order.
func expectActivityLogs(t *testing.T, yearlyCompanyID, action string, messages ...string) {
	t.Helper()
	var got []string
	if err := db.DB.Model(&model.ActivityLog{}).
		Where("yearly_company_id = ? AND action = ?", yearlyCompanyID, action).
		Pluck("description", &got).Error; err != nil {
		t.Fatalf("load activity logs: %v", err)
	}
	want := append([]string(nil), messages...)
	sort.Strings(got)
	sort.Strings(want)
	if strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Fatalf("%s logs = %q, want %q", action, got, want)
	}
}
