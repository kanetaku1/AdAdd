package integration

import (
	"net/http"
	"testing"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/shopspring/decimal"
)

// Users acting in the tests. Role checks only read the X-User-Roles header,
// but the Users also exist in MySQL as they would in operation.
const (
	administratorID      = "user-administrator"
	sponsorshipMemberID  = "user-member-1"
	sponsorshipMember2ID = "user-member-2"
	advisorID            = "user-advisor-1"
	advisor2ID           = "user-advisor-2"
	financeID            = "user-finance"
)

type actors struct {
	administrator      *apiClient
	sponsorshipMember  *apiClient
	sponsorshipMember2 *apiClient
	advisor            *apiClient
	finance            *apiClient
}

// newActors prepares an empty database, the API, and one client per Role.
func newActors(t *testing.T) actors {
	t.Helper()
	server := newAPI(t)

	for _, id := range []string{administratorID, sponsorshipMemberID, sponsorshipMember2ID, advisorID, advisor2ID, financeID} {
		if err := db.DB.Create(&model.User{ID: id, Name: id, Email: id + "@example.com", IsActive: true}).Error; err != nil {
			t.Fatalf("create user %s: %v", id, err)
		}
	}

	return actors{
		administrator:      asUser(t, server, administratorID, "ADMINISTRATOR"),
		sponsorshipMember:  asUser(t, server, sponsorshipMemberID, "SPONSORSHIP_MEMBER"),
		sponsorshipMember2: asUser(t, server, sponsorshipMember2ID, "SPONSORSHIP_MEMBER"),
		advisor:            asUser(t, server, advisorID, "ADVISOR"),
		finance:            asUser(t, server, financeID, "FINANCE_DEPARTMENT"),
	}
}

func createCompany(t *testing.T, client *apiClient, companyName string) string {
	t.Helper()
	response := client.do(http.MethodPost, "/companies", map[string]any{"companyName": companyName})
	expectStatus(t, response, http.StatusCreated)
	return decodeData[model.Company](t, response).ID
}

// createYear creates a festival Year, which generates a Yearly Company for
// every existing Company (UC-01).
func createYear(t *testing.T, client *apiClient, name string, startDate, endDate time.Time) string {
	t.Helper()
	response := client.do(http.MethodPost, "/years", map[string]any{
		"name":      name,
		"startDate": startDate.Format(time.RFC3339),
		"endDate":   endDate.Format(time.RFC3339),
	})
	expectStatus(t, response, http.StatusCreated)
	return decodeData[model.Year](t, response).ID
}

func festivalDate(year int, month time.Month, day int) time.Time {
	return time.Date(year, month, day, 0, 0, 0, 0, time.Local)
}

func createSponsorshipMenu(t *testing.T, client *apiClient, yearID, name string, defaultPrice int64) string {
	t.Helper()
	response := client.do(http.MethodPost, "/years/"+yearID+"/sponsorship-menus", map[string]any{
		"name":               name,
		"defaultPrice":       decimal.NewFromInt(defaultPrice),
		"requiresSubmission": true,
		"isActive":           true,
	})
	expectStatus(t, response, http.StatusCreated)
	return decodeData[model.SponsorshipMenu](t, response).ID
}

func createContract(t *testing.T, client *apiClient, yearlyCompanyID string) model.SponsorshipContract {
	t.Helper()
	response := client.do(http.MethodPost, "/yearly-companies/"+yearlyCompanyID+"/contract", map[string]any{})
	expectStatus(t, response, http.StatusCreated)
	return decodeData[model.SponsorshipContract](t, response)
}

func loadYearlyCompany(t *testing.T, yearID, companyID string) model.YearlyCompany {
	t.Helper()
	var yearlyCompany model.YearlyCompany
	if err := db.DB.First(&yearlyCompany, "year_id = ? AND company_id = ?", yearID, companyID).Error; err != nil {
		t.Fatalf("load yearly company (%s, %s): %v", yearID, companyID, err)
	}
	return yearlyCompany
}

func loadContract(t *testing.T, contractID string) model.SponsorshipContract {
	t.Helper()
	var contract model.SponsorshipContract
	if err := db.DB.First(&contract, "id = ?", contractID).Error; err != nil {
		t.Fatalf("load contract %s: %v", contractID, err)
	}
	return contract
}

func loadPayment(t *testing.T, contractID string) model.Payment {
	t.Helper()
	var payment model.Payment
	if err := db.DB.First(&payment, "contract_id = ?", contractID).Error; err != nil {
		t.Fatalf("load payment for %s: %v", contractID, err)
	}
	return payment
}

func countActivityLogs(t *testing.T, yearlyCompanyID, action string) int64 {
	t.Helper()
	var count int64
	if err := db.DB.Model(&model.ActivityLog{}).
		Where("yearly_company_id = ? AND action = ?", yearlyCompanyID, action).
		Count(&count).Error; err != nil {
		t.Fatalf("count activity logs: %v", err)
	}
	return count
}

func expectAmount(t *testing.T, label string, got decimal.Decimal, want int64) {
	t.Helper()
	if !got.Equal(decimal.NewFromInt(want)) {
		t.Fatalf("%s = %s, want %d", label, got, want)
	}
}
