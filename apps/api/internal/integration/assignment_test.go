package integration

import (
	"net/http"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

// spec/domain.md#Company Assignment: a Yearly Company has at most one
// Company Assignment, decided by an Administrator, and the assignee is
// carried forward to the Sponsorship Contract.
func TestCompanyAssignmentIsZeroOrOne(t *testing.T) {
	actor := newActors(t)
	companyID := createCompany(t, actor.administrator, "担当テスト株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	yearlyCompanyID := loadYearlyCompany(t, yearID, companyID).ID
	path := "/yearly-companies/" + yearlyCompanyID + "/assignments"

	expectAssignees(t, yearlyCompanyID)

	expectStatus(t, actor.sponsorshipMember.do(http.MethodPost, path, map[string]any{"userId": sponsorshipMemberID}), http.StatusForbidden)
	expectAssignees(t, yearlyCompanyID)

	expectStatus(t, actor.administrator.do(http.MethodPost, path, map[string]any{"userId": sponsorshipMemberID}), http.StatusCreated)
	expectAssignees(t, yearlyCompanyID, sponsorshipMemberID)

	expectStatus(t, actor.administrator.do(http.MethodPost, path, map[string]any{"userId": sponsorshipMember2ID}), http.StatusCreated)
	expectAssignees(t, yearlyCompanyID, sponsorshipMember2ID)

	contract := createContract(t, actor.sponsorshipMember2, yearlyCompanyID)
	if contract.AssigneeID != sponsorshipMember2ID {
		t.Fatalf("contract assigneeId = %q, want %q", contract.AssigneeID, sponsorshipMember2ID)
	}

	expectStatus(t, actor.administrator.do(http.MethodPost, path, map[string]any{"userId": nil}), http.StatusOK)
	expectAssignees(t, yearlyCompanyID)

	if got := countActivityLogs(t, yearlyCompanyID, model.EventAssignmentUpdated); got != 3 {
		t.Fatalf("assignment activity logs = %d, want 3", got)
	}
}

func expectAssignees(t *testing.T, yearlyCompanyID string, want ...string) {
	t.Helper()
	var assignments []model.CompanyAssignment
	if err := db.DB.Where("yearly_company_id = ?", yearlyCompanyID).Find(&assignments).Error; err != nil {
		t.Fatalf("load assignments: %v", err)
	}
	if len(assignments) != len(want) {
		t.Fatalf("assignments = %d, want %d", len(assignments), len(want))
	}
	for i, assignment := range assignments {
		if assignment.UserID != want[i] {
			t.Fatalf("assignee = %s, want %s", assignment.UserID, want[i])
		}
	}
}

// spec/domain.md#Advisor Assignment: a Member may have multiple Advisors and
// an Advisor may supervise multiple Members, per Year.
func TestAdvisorAssignmentAllowsMany(t *testing.T) {
	actor := newActors(t)
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))

	assign := func(client *apiClient, advisor, member string) int {
		return client.do(http.MethodPost, "/advisor-assignments", map[string]any{
			"yearId": yearID, "advisorUserId": advisor, "memberUserId": member,
		}).Code
	}

	if code := assign(actor.sponsorshipMember, advisorID, sponsorshipMemberID); code != http.StatusForbidden {
		t.Fatalf("Sponsorship Member assigning an Advisor: status = %d, want 403", code)
	}

	for _, pair := range [][2]string{
		{advisorID, sponsorshipMemberID},  // first Advisor of member 1
		{advisor2ID, sponsorshipMemberID}, // second Advisor of the same member
		{advisorID, sponsorshipMember2ID}, // same Advisor, another member
	} {
		if code := assign(actor.administrator, pair[0], pair[1]); code != http.StatusCreated {
			t.Fatalf("assign %s -> %s: status = %d, want 201", pair[0], pair[1], code)
		}
	}

	if code := assign(actor.administrator, advisorID, sponsorshipMemberID); code != http.StatusConflict {
		t.Fatalf("duplicate assignment: status = %d, want 409", code)
	}

	var advisorsOfMember int64
	if err := db.DB.Model(&model.AdvisorAssignment{}).
		Where("year_id = ? AND member_id = ?", yearID, sponsorshipMemberID).
		Count(&advisorsOfMember).Error; err != nil {
		t.Fatalf("count advisors: %v", err)
	}
	if advisorsOfMember != 2 {
		t.Fatalf("advisors of member 1 = %d, want 2", advisorsOfMember)
	}
}
