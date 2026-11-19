package integration

import (
	"net/http"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

// --- #205: Year creation validation ---

func TestCreateYear_NameRequired(t *testing.T) {
	actor := newActors(t)
	for _, name := range []string{"", "   "} {
		resp := actor.administrator.do(http.MethodPost, "/years", map[string]any{
			"name": name, "startDate": "2027-04-01", "endDate": "2027-11-30",
		})
		expectStatus(t, resp, http.StatusBadRequest)
	}
}

func TestCreateYear_InvalidDates(t *testing.T) {
	actor := newActors(t)
	resp := actor.administrator.do(http.MethodPost, "/years", map[string]any{
		"name": "2027", "startDate": "not-a-date", "endDate": "2027-11-30",
	})
	expectStatus(t, resp, http.StatusBadRequest)

	resp = actor.administrator.do(http.MethodPost, "/years", map[string]any{
		"name": "2027", "startDate": "2027-04-01", "endDate": "bad",
	})
	expectStatus(t, resp, http.StatusBadRequest)
}

func TestCreateYear_StartAfterEnd(t *testing.T) {
	actor := newActors(t)
	resp := actor.administrator.do(http.MethodPost, "/years", map[string]any{
		"name": "2027", "startDate": "2027-12-01", "endDate": "2027-04-01",
	})
	expectStatus(t, resp, http.StatusBadRequest)
}

func TestCreateYear_DuplicateName(t *testing.T) {
	actor := newActors(t)
	createYear(t, actor.administrator, "2027", festivalDate(2027, 4, 1), festivalDate(2027, 11, 30))

	resp := actor.administrator.do(http.MethodPost, "/years", map[string]any{
		"name": "2027", "startDate": "2028-04-01", "endDate": "2028-11-30",
	})
	expectStatus(t, resp, http.StatusConflict)
}

func TestCreateYear_ServerFieldsIgnored(t *testing.T) {
	actor := newActors(t)
	resp := actor.administrator.do(http.MethodPost, "/years", map[string]any{
		"id": "injected-id", "name": "2027", "startDate": "2027-04-01", "endDate": "2027-11-30", "isActive": false,
	})
	expectStatus(t, resp, http.StatusCreated)
	year := decodeData[model.Year](t, resp)
	if year.ID == "injected-id" {
		t.Fatal("client-supplied id was accepted")
	}
	if !year.IsActive {
		t.Fatal("isActive should be true (server-managed)")
	}
}

// --- #206: Yearly company creation validation ---

func TestCreateYearlyCompany_CompanyIDRequired(t *testing.T) {
	actor := newActors(t)
	yearID := createYear(t, actor.administrator, "2027", festivalDate(2027, 4, 1), festivalDate(2027, 11, 30))
	resp := actor.sponsorshipMember.do(http.MethodPost, "/years/"+yearID+"/companies", map[string]any{})
	expectStatus(t, resp, http.StatusBadRequest)
}

func TestCreateYearlyCompany_YearNotFound(t *testing.T) {
	actor := newActors(t)
	companyID := createCompany(t, actor.administrator, "年度なし企業")
	resp := actor.sponsorshipMember.do(http.MethodPost, "/years/nonexistent/companies", map[string]any{
		"companyId": companyID,
	})
	expectStatus(t, resp, http.StatusNotFound)
}

func TestCreateYearlyCompany_CompanyNotFound(t *testing.T) {
	actor := newActors(t)
	yearID := createYear(t, actor.administrator, "2027", festivalDate(2027, 4, 1), festivalDate(2027, 11, 30))
	resp := actor.sponsorshipMember.do(http.MethodPost, "/years/"+yearID+"/companies", map[string]any{
		"companyId": "nonexistent",
	})
	expectStatus(t, resp, http.StatusNotFound)
}

func TestCreateYearlyCompany_ServerFieldsIgnored(t *testing.T) {
	actor := newActors(t)
	// Create year first (no companies yet), then create a company, then
	// register it manually so the auto-generation side effect does not
	// create a duplicate.
	yearID := createYear(t, actor.administrator, "2027", festivalDate(2027, 4, 1), festivalDate(2027, 11, 30))
	companyID := createCompany(t, actor.administrator, "サーバ管理テスト企業")

	resp := actor.sponsorshipMember.do(http.MethodPost, "/years/"+yearID+"/companies", map[string]any{
		"companyId": companyID, "progress": "CONFIRMED", "phase": "PHASE_1",
	})
	expectStatus(t, resp, http.StatusCreated)
	yc := decodeData[model.YearlyCompany](t, resp)
	if yc.Progress != "NOT_CONTACTED" {
		t.Fatalf("progress = %s, want NOT_CONTACTED", yc.Progress)
	}
	if yc.Phase != "PHASE_3" {
		t.Fatalf("phase = %s, want PHASE_3", yc.Phase)
	}
}

// --- #207: Company create/update validation ---

func TestCreateCompany_NameRequired(t *testing.T) {
	actor := newActors(t)
	for _, name := range []string{"", "   "} {
		resp := actor.sponsorshipMember.do(http.MethodPost, "/companies", map[string]any{"companyName": name})
		expectStatus(t, resp, http.StatusBadRequest)
	}
}

func TestCreateCompany_ServerFieldsIgnored(t *testing.T) {
	actor := newActors(t)
	resp := actor.sponsorshipMember.do(http.MethodPost, "/companies", map[string]any{
		"id": "injected-id", "companyName": "テスト企業",
	})
	expectStatus(t, resp, http.StatusCreated)
	company := decodeData[model.Company](t, resp)
	if company.ID == "injected-id" {
		t.Fatal("client-supplied id was accepted")
	}
}

func TestUpdateCompany_PartialUpdate(t *testing.T) {
	actor := newActors(t)
	companyID := createCompany(t, actor.sponsorshipMember, "部分更新テスト企業")

	resp := actor.sponsorshipMember.do(http.MethodPatch, "/companies/"+companyID, map[string]any{
		"phoneNumber": "03-1234-5678",
	})
	expectStatus(t, resp, http.StatusOK)
	updated := decodeData[model.Company](t, resp)
	if updated.PhoneNumber != "03-1234-5678" {
		t.Fatalf("phoneNumber = %q, want 03-1234-5678", updated.PhoneNumber)
	}
	if updated.CompanyName != "部分更新テスト企業" {
		t.Fatalf("companyName changed to %q unexpectedly", updated.CompanyName)
	}
}

func TestUpdateCompany_EmptyNameRejected(t *testing.T) {
	actor := newActors(t)
	companyID := createCompany(t, actor.sponsorshipMember, "名前チェック企業")
	resp := actor.sponsorshipMember.do(http.MethodPatch, "/companies/"+companyID, map[string]any{
		"companyName": "",
	})
	expectStatus(t, resp, http.StatusBadRequest)
}

func TestUpdateCompany_NotFound(t *testing.T) {
	actor := newActors(t)
	resp := actor.sponsorshipMember.do(http.MethodPatch, "/companies/nonexistent", map[string]any{
		"phoneNumber": "000",
	})
	expectStatus(t, resp, http.StatusNotFound)
}

// --- #208: Sponsorship menu update validation ---

func TestUpdateSponsorshipMenu_NameRequired(t *testing.T) {
	actor := newActors(t)
	yearID := createYear(t, actor.administrator, "2027", festivalDate(2027, 4, 1), festivalDate(2027, 11, 30))
	menuID := createSponsorshipMenu(t, actor.sponsorshipMember, yearID, "テストメニュー", 10000)

	resp := actor.sponsorshipMember.do(http.MethodPatch, "/sponsorship-menus/"+menuID, map[string]any{
		"name": "", "defaultPrice": 10000, "requiresSubmission": true, "isActive": true,
	})
	expectStatus(t, resp, http.StatusBadRequest)
}

func TestUpdateSponsorshipMenu_NegativePrice(t *testing.T) {
	actor := newActors(t)
	yearID := createYear(t, actor.administrator, "2027", festivalDate(2027, 4, 1), festivalDate(2027, 11, 30))
	menuID := createSponsorshipMenu(t, actor.sponsorshipMember, yearID, "テストメニュー", 10000)

	resp := actor.sponsorshipMember.do(http.MethodPatch, "/sponsorship-menus/"+menuID, map[string]any{
		"name": "テストメニュー", "defaultPrice": -100, "requiresSubmission": true, "isActive": true,
	})
	expectStatus(t, resp, http.StatusBadRequest)
}

func TestUpdateSponsorshipMenu_NotFound(t *testing.T) {
	actor := newActors(t)
	resp := actor.sponsorshipMember.do(http.MethodPatch, "/sponsorship-menus/nonexistent", map[string]any{
		"name": "foo", "defaultPrice": 100, "requiresSubmission": false, "isActive": true,
	})
	expectStatus(t, resp, http.StatusNotFound)
}

// --- #209: Assignment / Advisor validation ---

func TestAssignment_YearlyCompanyNotFound(t *testing.T) {
	actor := newActors(t)
	resp := actor.administrator.do(http.MethodPost, "/yearly-companies/nonexistent/assignments", map[string]any{
		"userId": sponsorshipMemberID,
	})
	expectStatus(t, resp, http.StatusNotFound)
}

func TestAssignment_UserNotFound(t *testing.T) {
	actor := newActors(t)
	companyID := createCompany(t, actor.administrator, "割当テスト企業")
	yearID := createYear(t, actor.administrator, "2027", festivalDate(2027, 4, 1), festivalDate(2027, 11, 30))
	ycID := loadYearlyCompany(t, yearID, companyID).ID

	resp := actor.administrator.do(http.MethodPost, "/yearly-companies/"+ycID+"/assignments", map[string]any{
		"userId": "nonexistent-user",
	})
	expectStatus(t, resp, http.StatusNotFound)
}

func TestAssignment_InactiveUserRejected(t *testing.T) {
	actor := newActors(t)
	companyID := createCompany(t, actor.administrator, "無効ユーザー割当テスト")
	yearID := createYear(t, actor.administrator, "2027", festivalDate(2027, 4, 1), festivalDate(2027, 11, 30))
	ycID := loadYearlyCompany(t, yearID, companyID).ID

	inactiveUserID := "user-inactive"
	createUserWithRoles(t, inactiveUserID, "SPONSORSHIP_MEMBER")
	db.DB.Model(&model.User{}).Where("id = ?", inactiveUserID).Update("is_active", false)

	resp := actor.administrator.do(http.MethodPost, "/yearly-companies/"+ycID+"/assignments", map[string]any{
		"userId": inactiveUserID,
	})
	expectStatus(t, resp, http.StatusBadRequest)
}

func TestAdvisor_YearNotFound(t *testing.T) {
	actor := newActors(t)
	resp := actor.administrator.do(http.MethodPost, "/advisor-assignments", map[string]any{
		"yearId": "nonexistent", "advisorUserId": advisorID, "memberUserId": sponsorshipMemberID,
	})
	expectStatus(t, resp, http.StatusNotFound)
}

func TestAdvisor_UserNotFound(t *testing.T) {
	actor := newActors(t)
	yearID := createYear(t, actor.administrator, "2027", festivalDate(2027, 4, 1), festivalDate(2027, 11, 30))

	resp := actor.administrator.do(http.MethodPost, "/advisor-assignments", map[string]any{
		"yearId": yearID, "advisorUserId": "nonexistent", "memberUserId": sponsorshipMemberID,
	})
	expectStatus(t, resp, http.StatusNotFound)

	resp = actor.administrator.do(http.MethodPost, "/advisor-assignments", map[string]any{
		"yearId": yearID, "advisorUserId": advisorID, "memberUserId": "nonexistent",
	})
	expectStatus(t, resp, http.StatusNotFound)
}

func TestAdvisor_InactiveUserRejected(t *testing.T) {
	actor := newActors(t)
	yearID := createYear(t, actor.administrator, "2027", festivalDate(2027, 4, 1), festivalDate(2027, 11, 30))

	inactiveAdvisor := "user-inactive-advisor"
	createUserWithRoles(t, inactiveAdvisor, "ADVISOR")
	db.DB.Model(&model.User{}).Where("id = ?", inactiveAdvisor).Update("is_active", false)

	resp := actor.administrator.do(http.MethodPost, "/advisor-assignments", map[string]any{
		"yearId": yearID, "advisorUserId": inactiveAdvisor, "memberUserId": sponsorshipMemberID,
	})
	expectStatus(t, resp, http.StatusBadRequest)
}

// --- #210: User creation validation ---

func TestCreateUser_NameRequired(t *testing.T) {
	actor := newActors(t)
	resp := actor.administrator.do(http.MethodPost, "/users", map[string]any{
		"name": "", "email": "test@example.com",
	})
	expectStatus(t, resp, http.StatusBadRequest)
}

func TestCreateUser_EmailRequired(t *testing.T) {
	actor := newActors(t)
	resp := actor.administrator.do(http.MethodPost, "/users", map[string]any{
		"name": "テスト", "email": "",
	})
	expectStatus(t, resp, http.StatusBadRequest)
}

func TestCreateUser_ServerFieldsIgnored(t *testing.T) {
	actor := newActors(t)
	resp := actor.administrator.do(http.MethodPost, "/users", map[string]any{
		"id": "injected-id", "name": "テストユーザー", "email": "new-user@example.com", "isActive": false,
	})
	expectStatus(t, resp, http.StatusCreated)
	user := decodeData[model.User](t, resp)
	if user.ID == "injected-id" {
		t.Fatal("client-supplied id was accepted")
	}
	if !user.IsActive {
		t.Fatal("isActive should be true (server-managed)")
	}
}

func TestCreateUser_DuplicateEmail(t *testing.T) {
	actor := newActors(t)
	actor.administrator.do(http.MethodPost, "/users", map[string]any{
		"name": "ユーザーA", "email": "dup@example.com",
	})
	resp := actor.administrator.do(http.MethodPost, "/users", map[string]any{
		"name": "ユーザーB", "email": "dup@example.com",
	})
	expectStatus(t, resp, http.StatusConflict)
}
