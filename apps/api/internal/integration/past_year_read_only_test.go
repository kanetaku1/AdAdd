package integration

import (
	"net/http"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/shopspring/decimal"
)

func TestPastYearWritesAreRejectedExceptPaymentConfirmation(t *testing.T) {
	actor := newActors(t)
	companyID := createCompany(t, actor.administrator, "過去年度読み取り専用株式会社")
	uncontractedCompanyID := createCompany(t, actor.administrator, "過去年度契約未作成株式会社")
	pastYearID := createYear(t, actor.administrator, "2025", festivalDate(2025, 4, 1), festivalDate(2025, 11, 30))
	pastYearlyCompanyID := loadYearlyCompany(t, pastYearID, companyID).ID
	uncontractedYearlyCompanyID := loadYearlyCompany(t, pastYearID, uncontractedCompanyID).ID
	menuID := createSponsorshipMenu(t, actor.administrator, pastYearID, "過去年度メニュー", 50000)
	unusedMenuID := createSponsorshipMenu(t, actor.administrator, pastYearID, "過去年度未使用メニュー", 30000)
	contract := createContract(t, actor.sponsorshipMember, pastYearlyCompanyID, map[string]any{
		"sponsorshipMenuId": menuID,
		"quantity":          1,
		"productionType":    "COMPANY",
	})
	contractMenus := actor.sponsorshipMember.do(http.MethodGet, "/contracts/"+contract.ID+"/menus", nil)
	expectStatus(t, contractMenus, http.StatusOK)
	contractMenuList := decodeData[[]model.ContractMenu](t, contractMenus)
	if len(contractMenuList) != 1 {
		t.Fatalf("contract menu count = %d, want 1", len(contractMenuList))
	}
	contractMenuID := contractMenuList[0].ID
	paymentResponse := actor.sponsorshipMember.do(http.MethodPost, "/contracts/"+contract.ID+"/payment", nil)
	expectStatus(t, paymentResponse, http.StatusCreated)
	payment := decodeData[model.Payment](t, paymentResponse)
	lateCompanyID := createCompany(t, actor.administrator, "過去年度追加拒否株式会社")

	advisorAssignmentResponse := actor.administrator.do(http.MethodPost, "/advisor-assignments", map[string]any{
		"yearId": pastYearID, "advisorUserId": advisorID, "memberUserId": sponsorshipMemberID,
	})
	expectStatus(t, advisorAssignmentResponse, http.StatusCreated)
	advisorAssignment := decodeData[model.AdvisorAssignment](t, advisorAssignmentResponse)

	activeYearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	activeYearlyCompanyID := loadYearlyCompany(t, activeYearID, companyID).ID

	requests := []struct {
		name   string
		client *apiClient
		method string
		path   string
		body   any
	}{
		{"yearly company registration", actor.administrator, http.MethodPost, "/years/" + pastYearID + "/companies", map[string]any{"companyId": lateCompanyID}},
		{"company status", actor.sponsorshipMember, http.MethodPatch, "/yearly-companies/" + pastYearlyCompanyID + "/company-status", map[string]any{"companyStatus": "NEW"}},
		{"phase", actor.administrator, http.MethodPatch, "/yearly-companies/" + pastYearlyCompanyID + "/phase", map[string]any{"phase": "PHASE_1"}},
		{"progress", actor.sponsorshipMember, http.MethodPatch, "/yearly-companies/" + pastYearlyCompanyID + "/progress", map[string]any{"progress": "CONTACTED"}},
		{"contact snapshot", actor.sponsorshipMember, http.MethodPatch, "/yearly-companies/" + pastYearlyCompanyID + "/company-contact", map[string]any{"memo": "not allowed"}},
		{"assignment", actor.administrator, http.MethodPost, "/yearly-companies/" + pastYearlyCompanyID + "/assignments", map[string]any{"userId": sponsorshipMemberID}},
		{"contract creation", actor.sponsorshipMember, http.MethodPost, "/yearly-companies/" + uncontractedYearlyCompanyID + "/contract", map[string]any{
			"contractMenus": []map[string]any{{"sponsorshipMenuId": menuID, "quantity": 1, "productionType": "COMPANY"}},
		}},
		{"contract", actor.sponsorshipMember, http.MethodPatch, "/contracts/" + contract.ID, map[string]any{"remarks": "not allowed"}},
		{"add contract menu", actor.sponsorshipMember, http.MethodPost, "/contracts/" + contract.ID + "/menus", map[string]any{"sponsorshipMenuId": unusedMenuID, "quantity": 1, "productionType": "COMPANY"}},
		{"create payment", actor.sponsorshipMember, http.MethodPost, "/contracts/" + contract.ID + "/payment", nil},
		{"contract menu details", actor.sponsorshipMember, http.MethodPatch, "/contract-menus/" + contractMenuID, map[string]any{"quantity": 2}},
		{"contract menu status", actor.sponsorshipMember, http.MethodPatch, "/contract-menus/" + contractMenuID + "/status", map[string]any{"status": "REQUESTED"}},
		{"contract menu production", actor.sponsorshipMember, http.MethodPatch, "/contract-menus/" + contractMenuID + "/production", map[string]any{"remarks": "not allowed"}},
		{"contract menu drive upload", actor.sponsorshipMember, http.MethodPost, "/contract-menus/" + contractMenuID + "/drive-upload", map[string]any{}},
		{"add contract menu file", actor.sponsorshipMember, http.MethodPost, "/contract-menus/" + contractMenuID + "/production/files", map[string]any{}},
		{"delete contract menu", actor.administrator, http.MethodDelete, "/contract-menus/" + contractMenuID, nil},
		{"sponsorship menu", actor.sponsorshipMember, http.MethodPatch, "/sponsorship-menus/" + menuID, map[string]any{"name": "not allowed"}},
		{"delete sponsorship menu", actor.administrator, http.MethodDelete, "/sponsorship-menus/" + menuID, nil},
		{"create sponsorship menu", actor.administrator, http.MethodPost, "/years/" + pastYearID + "/sponsorship-menus", map[string]any{"name": "追加不可", "defaultPrice": 1}},
		{"advisor assignment creation", actor.administrator, http.MethodPost, "/advisor-assignments", map[string]any{"yearId": pastYearID, "advisorUserId": advisor2ID, "memberUserId": sponsorshipMemberID}},
		{"advisor assignment deletion", actor.administrator, http.MethodDelete, "/advisor-assignments/" + advisorAssignment.ID, nil},
	}
	for _, request := range requests {
		t.Run(request.name, func(t *testing.T) {
			response := request.client.do(request.method, request.path, request.body)
			expectStatus(t, response, http.StatusConflict)
		})
	}

	// Payment confirmation and reverting it are the sole past-Year write
	// exception, including when requested by Finance rather than Administrator.
	expectStatus(t, actor.finance.do(http.MethodPatch, "/payments/"+payment.ID, map[string]any{
		"status": "CONFIRMED",
	}), http.StatusBadRequest)
	expectStatus(t, actor.finance.do(http.MethodPatch, "/payments/"+payment.ID, map[string]any{
		"status": "CONFIRMED", "receivedAmount": 50000, "remarks": "振込手数料を差し引き",
	}), http.StatusOK)
	expectStatus(t, actor.finance.do(http.MethodPatch, "/payments/"+payment.ID, map[string]any{
		"receivedAmount": 49500, "remarks": "手数料修正",
	}), http.StatusOK)
	updatedPayment := loadPayment(t, contract.ID)
	if updatedPayment.Status != "CONFIRMED" || updatedPayment.ReceivedAmount == nil ||
		!updatedPayment.ReceivedAmount.Equal(decimal.NewFromInt(49500)) || updatedPayment.Remarks != "手数料修正" {
		t.Fatalf("updated payment = %#v; want confirmed with received amount 49500 and revised remarks", updatedPayment)
	}
	expectStatus(t, actor.finance.do(http.MethodPatch, "/payments/"+payment.ID, map[string]any{"status": "WAITING"}), http.StatusOK)
	revertedPayment := loadPayment(t, contract.ID)
	if revertedPayment.Status != "WAITING" || revertedPayment.ReceivedAmount == nil ||
		!revertedPayment.ReceivedAmount.Equal(decimal.NewFromInt(49500)) {
		t.Fatalf("reverted payment = %#v; want waiting with received amount preserved", revertedPayment)
	}
	if got := countActivityLogs(t, pastYearlyCompanyID, model.EventPaymentDetailsUpdated); got != 2 {
		t.Fatalf("payment detail activity logs = %d, want 2", got)
	}
	expectStatus(t, actor.administrator.do(http.MethodPatch, "/payments/"+payment.ID, map[string]any{
		"status": "CONFIRMED", "receivedAmount": 49500,
	}), http.StatusOK)
	expectStatus(t, actor.administrator.do(http.MethodPatch, "/payments/"+payment.ID, map[string]any{
		"status": "WAITING",
	}), http.StatusOK)

	expectStatus(t, actor.sponsorshipMember.do(http.MethodPatch, "/yearly-companies/"+activeYearlyCompanyID+"/phase", map[string]any{"phase": "PHASE_1"}), http.StatusOK)
}
