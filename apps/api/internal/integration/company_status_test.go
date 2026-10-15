package integration

import (
	"net/http"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

// spec/domain.md#Company Status: when a Yearly Company is generated,
// companyStatus is Continuing only if the Company had a Yearly Company in the
// immediately preceding Year with a Sponsorship Contract; New otherwise.
// Dormant is never auto-assigned.

func TestCompanyStatusOnYearGeneration(t *testing.T) {
	actor := newActors(t)
	administrator := actor.administrator

	contracted := createCompany(t, administrator, "契約あり株式会社")
	contactedOnly := createCompany(t, administrator, "接触のみ株式会社")
	previousYearID := createYear(t, administrator, "2025", festivalDate(2025, 4, 1), festivalDate(2025, 11, 30))
	createContract(t, actor.sponsorshipMember, loadYearlyCompany(t, previousYearID, contracted).ID)

	registeredLater := createCompany(t, administrator, "新規登録株式会社")
	currentYearID := createYear(t, administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))

	want := map[string]string{
		contracted:      "CONTINUING",
		contactedOnly:   "NEW",
		registeredLater: "NEW",
	}
	for companyID, status := range want {
		if got := loadYearlyCompany(t, currentYearID, companyID).CompanyStatus; got != status {
			t.Errorf("company %s companyStatus = %s, want %s", companyID, got, status)
		}
	}
	expectNoDormant(t)
}

// Only the immediately preceding Year counts: a contract two Years ago does
// not make a Company Continuing.
func TestCompanyStatusIgnoresOlderYears(t *testing.T) {
	actor := newActors(t)
	administrator := actor.administrator

	companyID := createCompany(t, administrator, "二年前契約株式会社")
	twoYearsAgoID := createYear(t, administrator, "2024", festivalDate(2024, 4, 1), festivalDate(2024, 11, 30))
	createContract(t, actor.sponsorshipMember, loadYearlyCompany(t, twoYearsAgoID, companyID).ID)
	createYear(t, administrator, "2025", festivalDate(2025, 4, 1), festivalDate(2025, 11, 30))
	currentYearID := createYear(t, administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))

	if got := loadYearlyCompany(t, currentYearID, companyID).CompanyStatus; got != "NEW" {
		t.Fatalf("companyStatus = %s, want NEW", got)
	}
}

// Mid-cycle registration of a single Company follows the same rule.
func TestCompanyStatusOnIndividualRegistration(t *testing.T) {
	actor := newActors(t)
	administrator := actor.administrator

	// The current Year is created first, while no Company exists, so both
	// Companies can be registered into it individually afterward.
	// The preceding Year is decided by dates, not by creation order.
	currentYearID := createYear(t, administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	contracted := createCompany(t, administrator, "契約あり株式会社")
	contactedOnly := createCompany(t, administrator, "接触のみ株式会社")
	previousYearID := createYear(t, administrator, "2025", festivalDate(2025, 4, 1), festivalDate(2025, 11, 30))
	createContract(t, actor.sponsorshipMember, loadYearlyCompany(t, previousYearID, contracted).ID)

	want := map[string]string{contracted: "CONTINUING", contactedOnly: "NEW"}
	for companyID, status := range want {
		response := actor.sponsorshipMember.do(http.MethodPost, "/years/"+currentYearID+"/companies", map[string]any{
			"companyId":     companyID,
			"companyStatus": "DORMANT", // client input must not override the computed status
		})
		expectStatus(t, response, http.StatusCreated)
		if got := decodeData[model.YearlyCompany](t, response).CompanyStatus; got != status {
			t.Errorf("company %s companyStatus = %s, want %s", companyID, got, status)
		}
	}
	expectNoDormant(t)
}

func expectNoDormant(t *testing.T) {
	t.Helper()
	var count int64
	if err := db.DB.Model(&model.YearlyCompany{}).Where("company_status = ?", "DORMANT").Count(&count).Error; err != nil {
		t.Fatalf("count dormant: %v", err)
	}
	if count != 0 {
		t.Fatalf("Dormant must never be auto-assigned, found %d", count)
	}
}
