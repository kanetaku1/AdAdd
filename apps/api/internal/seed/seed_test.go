package seed

import (
	"io"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/testdb"
	"github.com/shopspring/decimal"
)

var seededTables = []any{
	&model.User{}, &model.UserRole{}, &model.Company{}, &model.Year{},
	&model.YearlyCompany{}, &model.SponsorshipMenu{}, &model.SponsorshipContract{},
	&model.ContractMenu{}, &model.Payment{}, &model.CompanyAssignment{},
	&model.AdvisorAssignment{}, &model.ActivityLog{},
}

func countRows(t *testing.T) map[string]int64 {
	t.Helper()
	counts := map[string]int64{}
	for _, table := range seededTables {
		var count int64
		statement := db.DB.Model(table)
		if err := statement.Count(&count).Error; err != nil {
			t.Fatalf("count %T: %v", table, err)
		}
		counts[statement.Statement.Table] = count
	}
	return counts
}

func TestRunTwiceLeavesDatabaseUnchanged(t *testing.T) {
	testdb.Open(t)

	if err := Run(io.Discard); err != nil {
		t.Fatalf("first run: %v", err)
	}
	first := countRows(t)
	if err := Run(io.Discard); err != nil {
		t.Fatalf("second run: %v", err)
	}
	second := countRows(t)

	for table, count := range first {
		if count == 0 {
			t.Errorf("%s has no seeded rows", table)
		}
		if second[table] != count {
			t.Errorf("%s rows = %d after second run, want %d", table, second[table], count)
		}
	}
}

func TestSeedFollowsBusinessRules(t *testing.T) {
	testdb.Open(t)
	if err := Run(io.Discard); err != nil {
		t.Fatalf("run: %v", err)
	}

	var activeYears []model.Year
	if err := db.DB.Where("is_active = ?", true).Find(&activeYears).Error; err != nil {
		t.Fatalf("load active years: %v", err)
	}
	if len(activeYears) != 1 || activeYears[0].ID != CurrentYearID {
		t.Fatalf("active years = %+v, want only %s", activeYears, CurrentYearID)
	}

	// spec/domain.md#Company Status: Continuing only with a contract in the
	// immediately preceding Year.
	wantStatus := map[string]string{
		"c_001": "CONTINUING", // contract in 2025
		"c_002": "CONTINUING", // contract in 2025
		"c_003": "NEW",        // contacted in 2025 without a contract
		"c_004": "NEW",        // no 2025 Yearly Company
		"c_005": "NEW",        // no 2025 Yearly Company
	}
	for companyID, want := range wantStatus {
		var yearlyCompany model.YearlyCompany
		if err := db.DB.First(&yearlyCompany, "year_id = ? AND company_id = ?", CurrentYearID, companyID).Error; err != nil {
			t.Fatalf("load 2026 yearly company for %s: %v", companyID, err)
		}
		if yearlyCompany.CompanyStatus != want {
			t.Errorf("%s companyStatus = %s, want %s", companyID, yearlyCompany.CompanyStatus, want)
		}
	}

	// 80,000 + 15,000 + goods sponsorship 0.
	var contract model.SponsorshipContract
	if err := db.DB.First(&contract, "id = ?", "contract_2026_c_001").Error; err != nil {
		t.Fatalf("load 2026 contract: %v", err)
	}
	if want := decimal.NewFromInt(95000); !contract.TotalAmount.Equal(want) {
		t.Errorf("2026 contract totalAmount = %s, want %s", contract.TotalAmount, want)
	}
	var payment model.Payment
	if err := db.DB.First(&payment, "contract_id = ?", contract.ID).Error; err != nil {
		t.Fatalf("load 2026 payment: %v", err)
	}
	if payment.Status != "WAITING" || !payment.Amount.Equal(contract.TotalAmount) {
		t.Errorf("2026 payment = %s %s, want WAITING %s", payment.Status, payment.Amount, contract.TotalAmount)
	}

	var inactive model.User
	if err := db.DB.First(&inactive, "id = ?", InactiveUserID).Error; err != nil {
		t.Fatalf("load inactive user: %v", err)
	}
	if inactive.IsActive {
		t.Errorf("%s isActive = true, want false", InactiveUserID)
	}
}
