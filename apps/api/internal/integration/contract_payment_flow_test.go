package integration

import (
	"net/http"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

// The core sponsorship flow (UC-06, UC-07, UC-09):
// contract → Contract Menus → Payment → confirmation by Finance.
// spec/domain.md#Sponsorship Contract, #Contract Menu, #Payment.
func TestContractToPaymentConfirmationFlow(t *testing.T) {
	actor := newActors(t)
	member := actor.sponsorshipMember

	companyID := createCompany(t, actor.administrator, "フロー株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	pamphletMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "パンフレット広告", 80000)
	homepageMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "ホームページ広告", 15000)
	boothMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "企業ブース", 50000)
	yearlyCompanyID := loadYearlyCompany(t, yearID, companyID).ID

	// Contract: creating it confirms the sponsorship.
	contract := createContract(t, member, yearlyCompanyID)
	if got := loadYearlyCompany(t, yearID, companyID).Progress; got != "CONFIRMED" {
		t.Fatalf("progress after contract = %s, want CONFIRMED", got)
	}
	if got := countActivityLogs(t, yearlyCompanyID, model.EventContractCreated); got != 1 {
		t.Fatalf("contract activity logs = %d, want 1", got)
	}
	// A Yearly Company has at most one contract.
	expectStatus(t, member.do(http.MethodPost, "/yearly-companies/"+yearlyCompanyID+"/contract", map[string]any{}), http.StatusConflict)

	// No Payment while the total is 0.
	paymentPath := "/contracts/" + contract.ID + "/payment"
	expectStatus(t, member.do(http.MethodPost, paymentPath, nil), http.StatusBadRequest)

	// Contract Menus: total = Σ quantity × unitPrice.
	menusPath := "/contracts/" + contract.ID + "/menus"
	pamphlet := member.do(http.MethodPost, menusPath, map[string]any{"sponsorshipMenuId": pamphletMenuID, "quantity": 2, "productionType": "COMPANY"})
	expectStatus(t, pamphlet, http.StatusCreated)
	pamphletID := decodeData[model.ContractMenu](t, pamphlet).ID
	homepage := member.do(http.MethodPost, menusPath, map[string]any{"sponsorshipMenuId": homepageMenuID, "quantity": 1, "unitPrice": "10000", "productionType": "COMPANY"})
	expectStatus(t, homepage, http.StatusCreated)
	homepageID := decodeData[model.ContractMenu](t, homepage).ID
	// Goods sponsorship lines are always unitPrice 0, whatever is sent.
	booth := member.do(http.MethodPost, menusPath, map[string]any{"sponsorshipMenuId": boothMenuID, "quantity": 1, "unitPrice": "50000", "isGoodsSponsorship": true})
	expectStatus(t, booth, http.StatusCreated)
	expectAmount(t, "goods sponsorship unitPrice", decodeData[model.ContractMenu](t, booth).UnitPrice, 0)
	// 2 × 80,000 (default price) + 10,000 (given price) + 0
	expectAmount(t, "totalAmount", loadContract(t, contract.ID).TotalAmount, 170000)

	expectStatus(t, member.do(http.MethodPatch, "/contract-menus/"+pamphletID, map[string]any{"quantity": 1}), http.StatusOK)
	expectAmount(t, "totalAmount after quantity change", loadContract(t, contract.ID).TotalAmount, 90000)

	// Deleting a Contract Menu is Administrator-only.
	expectStatus(t, member.do(http.MethodDelete, "/contract-menus/"+homepageID, nil), http.StatusForbidden)
	expectStatus(t, actor.administrator.do(http.MethodDelete, "/contract-menus/"+homepageID, nil), http.StatusOK)
	expectAmount(t, "totalAmount after delete", loadContract(t, contract.ID).TotalAmount, 80000)

	// Payment: one per contract, created for the current total.
	created := member.do(http.MethodPost, paymentPath, nil)
	expectStatus(t, created, http.StatusCreated)
	payment := decodeData[model.Payment](t, created)
	if payment.Status != "WAITING" {
		t.Fatalf("new payment status = %s, want WAITING", payment.Status)
	}
	expectAmount(t, "payment amount", payment.Amount, 80000)
	expectStatus(t, member.do(http.MethodPost, paymentPath, nil), http.StatusConflict)

	// While waiting, Contract Menu changes keep the Payment amount in sync.
	expectStatus(t, member.do(http.MethodPatch, "/contract-menus/"+pamphletID, map[string]any{"quantity": 2}), http.StatusOK)
	expectAmount(t, "waiting payment amount after change", loadPayment(t, contract.ID).Amount, 160000)

	// Confirmation is performed by Finance only.
	paymentStatusPath := "/payments/" + payment.ID
	confirm := map[string]any{"status": "CONFIRMED"}
	expectStatus(t, member.do(http.MethodPatch, paymentStatusPath, confirm), http.StatusForbidden)
	expectStatus(t, actor.advisor.do(http.MethodPatch, paymentStatusPath, confirm), http.StatusForbidden)
	expectStatus(t, actor.finance.do(http.MethodPatch, paymentStatusPath, confirm), http.StatusOK)

	confirmed := loadPayment(t, contract.ID)
	if confirmed.Status != "CONFIRMED" || confirmed.ConfirmedAt == nil || confirmed.ConfirmedByID != financeID {
		t.Fatalf("confirmed payment = status %s, confirmedAt %v, confirmedById %q; want CONFIRMED, set, %q",
			confirmed.Status, confirmed.ConfirmedAt, confirmed.ConfirmedByID, financeID)
	}
	if got := countActivityLogs(t, yearlyCompanyID, model.EventPaymentStatusUpdated); got != 1 {
		t.Fatalf("payment activity logs = %d, want 1", got)
	}

	// After confirmation, a change that would alter the total is rejected
	// and nothing changes.
	expectStatus(t, member.do(http.MethodPatch, "/contract-menus/"+pamphletID, map[string]any{"quantity": 3}), http.StatusConflict)
	expectAmount(t, "totalAmount after rejected change", loadContract(t, contract.ID).TotalAmount, 160000)
	expectAmount(t, "confirmed payment amount after rejected change", loadPayment(t, contract.ID).Amount, 160000)

	// Finance sees the Payment in the Year's list.
	list := actor.finance.do(http.MethodGet, "/years/"+yearID+"/payments", nil)
	expectStatus(t, list, http.StatusOK)
	if payments := decodeData[[]model.PaymentResponse](t, list); len(payments) != 1 {
		t.Fatalf("payments in year = %d, want 1", len(payments))
	}
}

// A goods-sponsorship-only contract has totalAmount 0 and gets no Payment,
// since no money changes hands (spec/domain.md#Sponsorship Contract).
func TestGoodsSponsorshipOnlyContractHasNoPayment(t *testing.T) {
	actor := newActors(t)
	member := actor.sponsorshipMember

	companyID := createCompany(t, actor.administrator, "物品協賛株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	boothMenuID := createSponsorshipMenu(t, actor.administrator, yearID, "企業ブース", 50000)
	contract := createContract(t, member, loadYearlyCompany(t, yearID, companyID).ID)

	expectStatus(t, member.do(http.MethodPost, "/contracts/"+contract.ID+"/menus", map[string]any{
		"sponsorshipMenuId": boothMenuID, "quantity": 1, "isGoodsSponsorship": true,
	}), http.StatusCreated)
	expectAmount(t, "totalAmount", loadContract(t, contract.ID).TotalAmount, 0)

	expectStatus(t, member.do(http.MethodPost, "/contracts/"+contract.ID+"/payment", nil), http.StatusBadRequest)
}

// A Sponsorship Menu belongs to one Year (Rule 10), so a contract cannot use
// another Year's menu.
func TestContractMenuRejectsOtherYearsSponsorshipMenu(t *testing.T) {
	actor := newActors(t)
	member := actor.sponsorshipMember

	companyID := createCompany(t, actor.administrator, "年度違い株式会社")
	previousYearID := createYear(t, actor.administrator, "2025", festivalDate(2025, 4, 1), festivalDate(2025, 11, 30))
	previousMenuID := createSponsorshipMenu(t, actor.administrator, previousYearID, "パンフレット広告", 80000)
	currentYearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	contract := createContract(t, member, loadYearlyCompany(t, currentYearID, companyID).ID)

	response := member.do(http.MethodPost, "/contracts/"+contract.ID+"/menus", map[string]any{
		"sponsorshipMenuId": previousMenuID, "quantity": 1,
	})
	if response.Code < 400 {
		t.Fatalf("status = %d, want an error", response.Code)
	}
	expectAmount(t, "totalAmount", loadContract(t, contract.ID).TotalAmount, 0)
}
