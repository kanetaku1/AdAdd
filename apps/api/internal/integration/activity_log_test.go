package integration

import (
	"net/http"
	"slices"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

// UC-14: 活動記録 is for Sponsorship Member, Advisor, Advertisement Manager,
// and Administrator. Finance-only and no-Role Users cannot view it
// (spec/api.md#Authorization Matrix, Issue #167).
func TestActivityLogViewersByRole(t *testing.T) {
	actor := newActors(t)
	companyID := createCompany(t, actor.administrator, "活動記録閲覧テスト株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	path := "/yearly-companies/" + loadYearlyCompany(t, yearID, companyID).ID + "/activity-logs"

	cases := []struct {
		name   string
		client *apiClient
		want   int
	}{
		{"Advisor", actor.advisor, http.StatusOK},
		{"Sponsorship Member", actor.sponsorshipMember, http.StatusOK},
		{"Administrator", actor.administrator, http.StatusOK},
		{"Finance", actor.finance, http.StatusForbidden},
		{"no Role", actor.noRole, http.StatusForbidden},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			expectStatus(t, c.client.do(http.MethodGet, path, nil), c.want)
		})
	}
}

// An entry is written only when the value actually changes; saving the same
// value writes nothing (spec/api.md#List Activity Logs for a Yearly Company).
func TestSavingTheSameValueWritesNoActivityLog(t *testing.T) {
	actor := newActors(t)
	companyID := createCompany(t, actor.administrator, "同値更新テスト株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	yearlyCompany := loadYearlyCompany(t, yearID, companyID)
	path := "/yearly-companies/" + yearlyCompany.ID

	cases := []struct {
		name     string
		endpoint string
		body     map[string]any
		action   string
	}{
		{"progress", "/progress", map[string]any{"progress": yearlyCompany.Progress}, model.EventProgressUpdated},
		{"company status", "/company-status", map[string]any{"companyStatus": yearlyCompany.CompanyStatus}, model.EventCompanyStatusUpdated},
		{"phase", "/phase", map[string]any{"phase": yearlyCompany.Phase}, model.EventPhaseUpdated},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			expectStatus(t, actor.sponsorshipMember.do(http.MethodPatch, path+c.endpoint, c.body), http.StatusOK)
			if got := countActivityLogs(t, yearlyCompany.ID, c.action); got != 0 {
				t.Fatalf("activity logs = %d, want 0", got)
			}
		})
	}

	// A real change is still recorded once.
	expectStatus(t, actor.sponsorshipMember.do(http.MethodPatch, path+"/phase", map[string]any{"phase": otherPhase(yearlyCompany.Phase)}), http.StatusOK)
	if got := countActivityLogs(t, yearlyCompany.ID, model.EventPhaseUpdated); got != 1 {
		t.Fatalf("phase activity logs = %d, want 1", got)
	}
}

// Assignment entries name the members. Re-assigning the current member
// changes nothing: 200, not 201, and no entry (Issue #167).
func TestAssignmentActivityLogNamesTheMembers(t *testing.T) {
	actor := newActors(t)
	companyID := createCompany(t, actor.administrator, "担当記録テスト株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	yearlyCompanyID := loadYearlyCompany(t, yearID, companyID).ID
	path := "/yearly-companies/" + yearlyCompanyID + "/assignments"

	expectStatus(t, actor.administrator.do(http.MethodPost, path, map[string]any{"userId": sponsorshipMemberID}), http.StatusCreated)
	expectStatus(t, actor.administrator.do(http.MethodPost, path, map[string]any{"userId": sponsorshipMemberID}), http.StatusOK)
	expectAssignees(t, yearlyCompanyID, sponsorshipMemberID)
	expectStatus(t, actor.administrator.do(http.MethodPost, path, map[string]any{"userId": sponsorshipMember2ID}), http.StatusCreated)
	expectStatus(t, actor.administrator.do(http.MethodPost, path, map[string]any{"userId": nil}), http.StatusOK)
	expectStatus(t, actor.administrator.do(http.MethodPost, path, map[string]any{"userId": nil}), http.StatusOK)

	// Test Users are named after their IDs (createUserWithRoles).
	want := []string{
		"担当メンバーを「" + sponsorshipMemberID + "」に設定",
		"担当メンバーを「" + sponsorshipMemberID + "」から「" + sponsorshipMember2ID + "」に更新",
		"担当メンバー「" + sponsorshipMember2ID + "」を解除",
	}
	// The entries are written within the same second, so compare them as a set.
	var got []string
	if err := db.DB.Model(&model.ActivityLog{}).
		Where("yearly_company_id = ? AND action = ?", yearlyCompanyID, model.EventAssignmentUpdated).
		Pluck("description", &got).Error; err != nil {
		t.Fatalf("load activity logs: %v", err)
	}
	slices.Sort(got)
	slices.Sort(want)
	if !slices.Equal(got, want) {
		t.Fatalf("assignment activity logs = %q, want %q", got, want)
	}
}

func otherPhase(current string) string {
	if current == "PHASE_1" {
		return "PHASE_2"
	}
	return "PHASE_1"
}
