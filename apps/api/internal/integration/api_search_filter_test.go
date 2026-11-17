package integration

import (
	"net/http"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

// Issue #174: Test GET /contracts/{contractId}/payment returns confirmedByName according to spec
func TestPaymentConfirmedByName(t *testing.T) {
	actor := newActors(t)
	member := actor.sponsorshipMember

	companyID := createCompany(t, actor.administrator, "入金確認テスト株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	menuID := createSponsorshipMenu(t, actor.administrator, yearID, "広告枠", 50000)
	yearlyCompanyID := loadYearlyCompany(t, yearID, companyID).ID

	contract := createContract(t, member, yearlyCompanyID)
	addMenuPath := "/contracts/" + contract.ID + "/menus"
	expectStatus(t, member.do(http.MethodPost, addMenuPath, map[string]any{
		"sponsorshipMenuId": menuID,
		"quantity":          1,
		"productionType":    "COMPANY",
	}), http.StatusCreated)

	paymentPath := "/contracts/" + contract.ID + "/payment"
	expectStatus(t, member.do(http.MethodPost, paymentPath, nil), http.StatusCreated)

	// 1. When WAITING: confirmedByName should be null
	resp := member.do(http.MethodGet, paymentPath, nil)
	expectStatus(t, resp, http.StatusOK)
	detail := decodeData[model.PaymentDetailResponse](t, resp)
	if detail.Status != "WAITING" {
		t.Fatalf("payment status = %s, want WAITING", detail.Status)
	}
	if detail.ConfirmedByName != nil {
		t.Fatalf("confirmedByName when WAITING = %v, want nil", *detail.ConfirmedByName)
	}

	// 2. When CONFIRMED: confirmedByName should be the confirming user's name
	paymentStatusPath := "/payments/" + detail.ID
	confirmBody := map[string]any{
		"status":         "CONFIRMED",
		"receivedAmount": 50000,
	}
	expectStatus(t, actor.finance.do(http.MethodPatch, paymentStatusPath, confirmBody), http.StatusOK)

	respConfirmed := member.do(http.MethodGet, paymentPath, nil)
	expectStatus(t, respConfirmed, http.StatusOK)
	detailConfirmed := decodeData[model.PaymentDetailResponse](t, respConfirmed)
	if detailConfirmed.Status != "CONFIRMED" {
		t.Fatalf("payment status = %s, want CONFIRMED", detailConfirmed.Status)
	}
	if detailConfirmed.ConfirmedByName == nil {
		t.Fatalf("confirmedByName when CONFIRMED = nil, want %q", financeID)
	}
	if *detailConfirmed.ConfirmedByName != financeID {
		t.Fatalf("confirmedByName when CONFIRMED = %q, want %q", *detailConfirmed.ConfirmedByName, financeID)
	}
}

// Issue #174: Test GET /companies keyword search
func TestCompaniesKeywordFilter(t *testing.T) {
	actor := newActors(t)
	admin := actor.administrator

	// Create companies with names and kanas
	respA := admin.do(http.MethodPost, "/companies", map[string]any{
		"companyName":     "株式会社長岡テクノ",
		"companyNameKana": "ナガオカテクノ",
	})
	expectStatus(t, respA, http.StatusCreated)
	compA := decodeData[model.Company](t, respA)

	respB := admin.do(http.MethodPost, "/companies", map[string]any{
		"companyName":     "越後電機株式会社",
		"companyNameKana": "エチゴデンキ",
	})
	expectStatus(t, respB, http.StatusCreated)
	compB := decodeData[model.Company](t, respB)

	// Search by kanji keyword
	resp := admin.do(http.MethodGet, "/companies?keyword=長岡", nil)
	expectStatus(t, resp, http.StatusOK)
	list := decodeData[[]model.Company](t, resp)
	if len(list) != 1 || list[0].ID != compA.ID {
		t.Fatalf("search '長岡': got %d companies, want [compA]", len(list))
	}

	// Search by kana keyword
	resp = admin.do(http.MethodGet, "/companies?keyword=エチゴ", nil)
	expectStatus(t, resp, http.StatusOK)
	list = decodeData[[]model.Company](t, resp)
	if len(list) != 1 || list[0].ID != compB.ID {
		t.Fatalf("search 'エチゴ': got %d companies, want [compB]", len(list))
	}

	// Search with non-matching keyword
	resp = admin.do(http.MethodGet, "/companies?keyword=存在しない", nil)
	expectStatus(t, resp, http.StatusOK)
	list = decodeData[[]model.Company](t, resp)
	if len(list) != 0 {
		t.Fatalf("search '存在しない': got %d companies, want 0", len(list))
	}

	// Search without keyword (all companies)
	resp = admin.do(http.MethodGet, "/companies", nil)
	expectStatus(t, resp, http.StatusOK)
	list = decodeData[[]model.Company](t, resp)
	if len(list) < 2 {
		t.Fatalf("list without keyword: got %d companies, want >= 2", len(list))
	}
}

// Issue #174: Test GET /years/{yearId}/companies filter parameters
func TestYearlyCompaniesFilters(t *testing.T) {
	actor := newActors(t)
	admin := actor.administrator
	member1 := actor.sponsorshipMember

	// Setup companies
	respA := admin.do(http.MethodPost, "/companies", map[string]any{
		"companyName":     "株式会社長岡テクノ",
		"companyNameKana": "ナガオカテクノ",
	})
	expectStatus(t, respA, http.StatusCreated)
	compA := decodeData[model.Company](t, respA)

	respB := admin.do(http.MethodPost, "/companies", map[string]any{
		"companyName":     "越後電機株式会社",
		"companyNameKana": "エチゴデンキ",
	})
	expectStatus(t, respB, http.StatusCreated)
	compB := decodeData[model.Company](t, respB)

	yearID := createYear(t, admin, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	menuID := createSponsorshipMenu(t, admin, yearID, "バナー広告", 30000)

	// Create company C mid-cycle
	respC := admin.do(http.MethodPost, "/companies", map[string]any{
		"companyName":     "新潟ソリューション",
		"companyNameKana": "ニイガタソリューション",
	})
	expectStatus(t, respC, http.StatusCreated)
	compC := decodeData[model.Company](t, respC)

	regC := admin.do(http.MethodPost, "/years/"+yearID+"/companies", map[string]any{"companyId": compC.ID})
	expectStatus(t, regC, http.StatusCreated)

	ycA := loadYearlyCompany(t, yearID, compA.ID)
	ycB := loadYearlyCompany(t, yearID, compB.ID)
	ycC := loadYearlyCompany(t, yearID, compC.ID)

	// Configure YC-A: companyStatus=CONTINUING, phase=PHASE_1, assignee=member1, contract=yes (progress automatically becomes CONFIRMED)
	expectStatus(t, member1.do(http.MethodPatch, "/yearly-companies/"+ycA.ID+"/company-status", map[string]any{"companyStatus": "CONTINUING"}), http.StatusOK)
	expectStatus(t, member1.do(http.MethodPatch, "/yearly-companies/"+ycA.ID+"/phase", map[string]any{"phase": "PHASE_1"}), http.StatusOK)
	expectStatus(t, admin.do(http.MethodPost, "/yearly-companies/"+ycA.ID+"/assignments", map[string]any{"userId": sponsorshipMemberID}), http.StatusCreated)

	contractA := createContract(t, member1, ycA.ID)
	expectStatus(t, member1.do(http.MethodPost, "/contracts/"+contractA.ID+"/menus", map[string]any{
		"sponsorshipMenuId": menuID,
		"quantity":          1,
		"productionType":    "COMPANY",
	}), http.StatusCreated)

	// Configure YC-B: companyStatus=NEW, phase=PHASE_2, assignee=member2, progress=MATERIALS_SENT, contract=no
	expectStatus(t, member1.do(http.MethodPatch, "/yearly-companies/"+ycB.ID+"/company-status", map[string]any{"companyStatus": "NEW"}), http.StatusOK)
	expectStatus(t, member1.do(http.MethodPatch, "/yearly-companies/"+ycB.ID+"/phase", map[string]any{"phase": "PHASE_2"}), http.StatusOK)
	expectStatus(t, member1.do(http.MethodPatch, "/yearly-companies/"+ycB.ID+"/progress", map[string]any{"progress": "MATERIALS_SENT"}), http.StatusOK)
	expectStatus(t, admin.do(http.MethodPost, "/yearly-companies/"+ycB.ID+"/assignments", map[string]any{"userId": sponsorshipMember2ID}), http.StatusCreated)

	// Configure YC-C: companyStatus=DORMANT, phase=PHASE_3, assignee=none, progress=NOT_CONTACTED, contract=no
	expectStatus(t, member1.do(http.MethodPatch, "/yearly-companies/"+ycC.ID+"/company-status", map[string]any{"companyStatus": "DORMANT"}), http.StatusOK)
	expectStatus(t, member1.do(http.MethodPatch, "/yearly-companies/"+ycC.ID+"/phase", map[string]any{"phase": "PHASE_3"}), http.StatusOK)

	// Setup advisor assignment: advisor -> member1 in yearID
	expectStatus(t, admin.do(http.MethodPost, "/advisor-assignments", map[string]any{
		"yearId":        yearID,
		"advisorUserId": advisorID,
		"memberUserId":  sponsorshipMemberID,
	}), http.StatusCreated)

	basePath := "/years/" + yearID + "/companies"

	// 1. keyword filter (kanji and kana)
	t.Run("keyword filter", func(t *testing.T) {
		r := member1.do(http.MethodGet, basePath+"?keyword=テクノ", nil)
		expectStatus(t, r, http.StatusOK)
		items := decodeData[[]model.YearlyCompanyResponse](t, r)
		if len(items) != 1 || items[0].CompanyID != compA.ID {
			t.Fatalf("keyword 'テクノ': got %d items, want [compA]", len(items))
		}

		r = member1.do(http.MethodGet, basePath+"?keyword=デンキ", nil)
		expectStatus(t, r, http.StatusOK)
		items = decodeData[[]model.YearlyCompanyResponse](t, r)
		if len(items) != 1 || items[0].CompanyID != compB.ID {
			t.Fatalf("keyword 'デンキ': got %d items, want [compB]", len(items))
		}
	})

	// 2. companyStatus filter
	t.Run("companyStatus filter", func(t *testing.T) {
		r := member1.do(http.MethodGet, basePath+"?companyStatus=CONTINUING", nil)
		expectStatus(t, r, http.StatusOK)
		items := decodeData[[]model.YearlyCompanyResponse](t, r)
		if len(items) != 1 || items[0].CompanyID != compA.ID {
			t.Fatalf("companyStatus 'CONTINUING': got %d items, want [compA]", len(items))
		}

		r = member1.do(http.MethodGet, basePath+"?companyStatus=NEW", nil)
		expectStatus(t, r, http.StatusOK)
		items = decodeData[[]model.YearlyCompanyResponse](t, r)
		if len(items) != 1 || items[0].CompanyID != compB.ID {
			t.Fatalf("companyStatus 'NEW': got %d items, want [compB]", len(items))
		}
	})

	// 3. phase filter
	t.Run("phase filter", func(t *testing.T) {
		r := member1.do(http.MethodGet, basePath+"?phase=PHASE_1", nil)
		expectStatus(t, r, http.StatusOK)
		items := decodeData[[]model.YearlyCompanyResponse](t, r)
		if len(items) != 1 || items[0].CompanyID != compA.ID {
			t.Fatalf("phase 'PHASE_1': got %d items, want [compA]", len(items))
		}

		r = member1.do(http.MethodGet, basePath+"?phase=PHASE_3", nil)
		expectStatus(t, r, http.StatusOK)
		items = decodeData[[]model.YearlyCompanyResponse](t, r)
		if len(items) != 1 || items[0].CompanyID != compC.ID {
			t.Fatalf("phase 'PHASE_3': got %d items, want [compC]", len(items))
		}
	})

	// 4. assigneeUserId filter
	t.Run("assigneeUserId filter", func(t *testing.T) {
		r := member1.do(http.MethodGet, basePath+"?assigneeUserId="+sponsorshipMemberID, nil)
		expectStatus(t, r, http.StatusOK)
		items := decodeData[[]model.YearlyCompanyResponse](t, r)
		if len(items) != 1 || items[0].CompanyID != compA.ID {
			t.Fatalf("assigneeUserId '%s': got %d items, want [compA]", sponsorshipMemberID, len(items))
		}

		r = member1.do(http.MethodGet, basePath+"?assigneeUserId="+sponsorshipMember2ID, nil)
		expectStatus(t, r, http.StatusOK)
		items = decodeData[[]model.YearlyCompanyResponse](t, r)
		if len(items) != 1 || items[0].CompanyID != compB.ID {
			t.Fatalf("assigneeUserId '%s': got %d items, want [compB]", sponsorshipMember2ID, len(items))
		}
	})

	// 5. advisorUserId filter
	t.Run("advisorUserId filter", func(t *testing.T) {
		r := member1.do(http.MethodGet, basePath+"?advisorUserId="+advisorID, nil)
		expectStatus(t, r, http.StatusOK)
		items := decodeData[[]model.YearlyCompanyResponse](t, r)
		if len(items) != 1 || items[0].CompanyID != compA.ID {
			t.Fatalf("advisorUserId '%s': got %d items, want [compA]", advisorID, len(items))
		}

		// A different advisor with no members should match 0 companies
		r = member1.do(http.MethodGet, basePath+"?advisorUserId="+advisor2ID, nil)
		expectStatus(t, r, http.StatusOK)
		items = decodeData[[]model.YearlyCompanyResponse](t, r)
		if len(items) != 0 {
			t.Fatalf("advisorUserId '%s': got %d items, want 0", advisor2ID, len(items))
		}
	})

	// 6. progress filter
	t.Run("progress filter", func(t *testing.T) {
		// When contract was created for compA, progress became CONFIRMED (per contract creation flow)
		ycACurrent := loadYearlyCompany(t, yearID, compA.ID)
		r := member1.do(http.MethodGet, basePath+"?progress="+ycACurrent.Progress, nil)
		expectStatus(t, r, http.StatusOK)
		items := decodeData[[]model.YearlyCompanyResponse](t, r)
		if len(items) != 1 || items[0].CompanyID != compA.ID {
			t.Fatalf("progress '%s': got %d items, want [compA]", ycACurrent.Progress, len(items))
		}

		r = member1.do(http.MethodGet, basePath+"?progress=MATERIALS_SENT", nil)
		expectStatus(t, r, http.StatusOK)
		items = decodeData[[]model.YearlyCompanyResponse](t, r)
		if len(items) != 1 || items[0].CompanyID != compB.ID {
			t.Fatalf("progress 'MATERIALS_SENT': got %d items, want [compB]", len(items))
		}
	})

	// 7. hasContract filter
	t.Run("hasContract filter", func(t *testing.T) {
		r := member1.do(http.MethodGet, basePath+"?hasContract=true", nil)
		expectStatus(t, r, http.StatusOK)
		items := decodeData[[]model.YearlyCompanyResponse](t, r)
		if len(items) != 1 || items[0].CompanyID != compA.ID {
			t.Fatalf("hasContract 'true': got %d items, want [compA]", len(items))
		}

		r = member1.do(http.MethodGet, basePath+"?hasContract=false", nil)
		expectStatus(t, r, http.StatusOK)
		items = decodeData[[]model.YearlyCompanyResponse](t, r)
		if len(items) != 2 {
			t.Fatalf("hasContract 'false': got %d items, want 2 (compB, compC)", len(items))
		}
	})
}
