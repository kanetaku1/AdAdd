package integration

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-sql-driver/mysql"
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/shopspring/decimal"
)

const (
	mysqlErrorNoReferencedRow = 1452 // ER_NO_REFERENCED_ROW_2
	mysqlErrorRowIsReferenced = 1451 // ER_ROW_IS_REFERENCED_2
	missingID                 = "00000000-0000-0000-0000-000000000000"
)

func expectMySQLError(t *testing.T, label string, err error, number uint16) {
	t.Helper()
	var mysqlError *mysql.MySQLError
	if !errors.As(err, &mysqlError) || mysqlError.Number != number {
		t.Fatalf("%s: err = %v, want MySQL error %d", label, err, number)
	}
}

// The database rejects a row whose reference points to nothing
// (spec/database.md#Referential Integrity, Issue #175).
func TestDatabaseRejectsReferencesToMissingRows(t *testing.T) {
	actor := newActors(t)
	companyID := createCompany(t, actor.administrator, "参照整合性株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	menuID := createSponsorshipMenu(t, actor.administrator, yearID, "パンフレット広告", 10000)
	yearlyCompanyID := loadYearlyCompany(t, yearID, companyID).ID
	contractID := createContract(t, actor.sponsorshipMember, yearlyCompanyID).ID

	missingUser := missingID
	cases := []struct {
		name string
		row  any
	}{
		{"yearly company without year", &model.YearlyCompany{YearID: missingID, CompanyID: companyID}},
		{"yearly company without company", &model.YearlyCompany{YearID: yearID, CompanyID: missingID}},
		{"contract without yearly company", &model.SponsorshipContract{YearlyCompanyID: missingID}},
		{"sponsorship menu without year", &model.SponsorshipMenu{YearID: missingID, Name: "存在しない年度のメニュー"}},
		{"contract menu without contract", &model.ContractMenu{ContractID: missingID, SponsorshipMenuID: menuID, Quantity: 1}},
		{"contract menu without sponsorship menu", &model.ContractMenu{ContractID: contractID, SponsorshipMenuID: missingID, Quantity: 1}},
		{"payment without contract", &model.Payment{ContractID: missingID, Status: "WAITING"}},
		{"payment confirmed by missing user", &model.Payment{ContractID: contractID, Status: "CONFIRMED", ConfirmedByID: &missingUser}},
		{"assignment without user", &model.CompanyAssignment{YearlyCompanyID: yearlyCompanyID, UserID: missingID, AssignedAt: time.Now()}},
		{"advisor assignment without member", &model.AdvisorAssignment{YearID: yearID, AdvisorID: advisorID, MemberID: missingID, AssignedAt: time.Now()}},
		{"activity log without yearly company", &model.ActivityLog{YearlyCompanyID: missingID, UserID: administratorID, Action: "TEST", CreatedAt: time.Now()}},
		{"activity log without user", &model.ActivityLog{YearlyCompanyID: yearlyCompanyID, UserID: missingID, Action: "TEST", CreatedAt: time.Now()}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			expectMySQLError(t, c.name, db.DB.Create(c.row).Error, mysqlErrorNoReferencedRow)
		})
	}

	// An unset optional reference is NULL, which is allowed.
	payment := &model.Payment{ContractID: contractID, Status: "WAITING", Amount: decimal.Zero}
	if err := db.DB.Create(payment).Error; err != nil {
		t.Fatalf("payment with NULL confirmedById: %v", err)
	}

	// A referenced row cannot be deleted (ON DELETE RESTRICT).
	expectMySQLError(t, "delete referenced year",
		db.DB.Unscoped().Delete(&model.Year{}, "id = ?", yearID).Error, mysqlErrorRowIsReferenced)
}

// Two requests on the same Yearly Company that change different columns both
// persist (spec/database.md#Concurrent Updates, Issue #175). The phase update
// reads the Yearly Company before a contract creation commits progress =
// CONFIRMED, and writes after it. Writing the whole row would put the old
// progress back.
func TestPhaseChangeKeepsProgressConfirmedByConcurrentContractCreation(t *testing.T) {
	actor := newActors(t)
	companyID := createCompany(t, actor.administrator, "同時更新株式会社")
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	yearlyCompany := loadYearlyCompany(t, yearID, companyID)
	if yearlyCompany.Progress == "CONFIRMED" {
		t.Fatal("fixture must start before CONFIRMED")
	}

	// Stand-in for the contract creation: it holds the Yearly Company row
	// with progress already CONFIRMED, not yet committed.
	contractCreation := db.DB.Begin()
	if err := contractCreation.Model(&model.YearlyCompany{}).
		Where("id = ?", yearlyCompany.ID).
		Update("progress", "CONFIRMED").Error; err != nil {
		contractCreation.Rollback()
		t.Fatalf("hold yearly company: %v", err)
	}

	// The phase update reads the committed row (progress not CONFIRMED) and
	// then waits for the row lock.
	newPhase := otherPhase(yearlyCompany.Phase)
	done := make(chan *httptest.ResponseRecorder, 1)
	go func() {
		done <- actor.sponsorshipMember.do(http.MethodPatch, "/yearly-companies/"+yearlyCompany.ID+"/phase",
			map[string]any{"phase": newPhase})
	}()
	time.Sleep(500 * time.Millisecond)

	if err := contractCreation.Commit().Error; err != nil {
		t.Fatalf("commit contract creation: %v", err)
	}
	expectStatus(t, <-done, http.StatusOK)

	got := loadYearlyCompany(t, yearID, companyID)
	if got.Progress != "CONFIRMED" || got.Phase != newPhase {
		t.Fatalf("progress = %s, phase = %s; want CONFIRMED and %s", got.Progress, got.Phase, newPhase)
	}
}
