package service

import (
	"errors"
	"testing"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/testdb"
	"github.com/shopspring/decimal"
)

// Fixed IDs of the rows seeded by seedPaymentSyncContract. testdb.Open empties
// the database before every test, so they never collide.
const (
	testYearID          = "test-year"
	testCompanyID       = "test-company"
	testYearlyCompanyID = "test-yearly-company"
	testContractID      = "test-contract"
	testMenuID          = "test-sponsorship-menu"
	testPaymentID       = "test-payment"
)

func seedPaymentSyncContract(t *testing.T, paymentStatus string, paymentAmount decimal.Decimal) (string, string, string) {
	t.Helper()

	yearID := testYearID
	companyID := testCompanyID
	yearlyCompanyID := testYearlyCompanyID
	contractID := testContractID
	menuID := testMenuID
	paymentID := testPaymentID
	now := time.Now()

	if err := db.DB.Create(&model.Year{
		ID:        yearID,
		Name:      "2026",
		StartDate: now,
		EndDate:   now.AddDate(0, 1, 0),
		IsActive:  false,
	}).Error; err != nil {
		t.Fatalf("seed year: %v", err)
	}
	if err := db.DB.Create(&model.Company{
		ID:          companyID,
		CompanyName: "Payment Sync Test",
	}).Error; err != nil {
		t.Fatalf("seed company: %v", err)
	}
	if err := db.DB.Create(&model.YearlyCompany{
		ID:            yearlyCompanyID,
		YearID:        yearID,
		CompanyID:     companyID,
		CompanyStatus: "NEW",
		Phase:         "PHASE_3",
		Progress:      "CONFIRMED",
	}).Error; err != nil {
		t.Fatalf("seed yearly company: %v", err)
	}
	if err := db.DB.Create(&model.SponsorshipContract{
		ID:              contractID,
		YearlyCompanyID: yearlyCompanyID,
		TotalAmount:     paymentAmount,
	}).Error; err != nil {
		t.Fatalf("seed contract: %v", err)
	}
	if err := db.DB.Create(&model.SponsorshipMenu{
		ID:                 menuID,
		YearID:             yearID,
		Name:               "Test Menu",
		DefaultPrice:       decimal.NewFromInt(100),
		RequiresSubmission: true,
		IsActive:           true,
	}).Error; err != nil {
		t.Fatalf("seed sponsorship menu: %v", err)
	}
	if err := db.DB.Create(&model.Payment{
		ID:         paymentID,
		ContractID: contractID,
		Amount:     paymentAmount,
		Status:     paymentStatus,
	}).Error; err != nil {
		t.Fatalf("seed payment: %v", err)
	}

	return contractID, menuID, paymentID
}

func assertContractAndPaymentAmounts(t *testing.T, contractID string, paymentID string, want decimal.Decimal) {
	t.Helper()

	var contract model.SponsorshipContract
	if err := db.DB.First(&contract, "id = ?", contractID).Error; err != nil {
		t.Fatalf("load contract: %v", err)
	}
	if !contract.TotalAmount.Equal(want) {
		t.Fatalf("contract total = %s, want %s", contract.TotalAmount.String(), want.String())
	}

	var payment model.Payment
	if err := db.DB.First(&payment, "id = ?", paymentID).Error; err != nil {
		t.Fatalf("load payment: %v", err)
	}
	if !payment.Amount.Equal(want) {
		t.Fatalf("payment amount = %s, want %s", payment.Amount.String(), want.String())
	}
}

func TestContractMenuChangesSyncWaitingPaymentAmount(t *testing.T) {
	testdb.Open(t)

	contractID, menuID, paymentID := seedPaymentSyncContract(t, "WAITING", decimal.Zero)
	svc := NewContractMenuService()

	menu := &model.ContractMenu{
		ContractID:        contractID,
		SponsorshipMenuID: menuID,
		Quantity:          2,
		UnitPrice:         decimal.NewFromInt(100),
		ProductionType:    "COMPANY",
		Status:            "WAITING",
	}
	if err := svc.Create(menu, true); err != nil {
		t.Fatalf("create contract menu: %v", err)
	}
	assertContractAndPaymentAmounts(t, contractID, paymentID, decimal.NewFromInt(200))

	menu.Quantity = 3
	if err := svc.Update(menu); err != nil {
		t.Fatalf("update contract menu: %v", err)
	}
	assertContractAndPaymentAmounts(t, contractID, paymentID, decimal.NewFromInt(300))

	if err := svc.Delete(menu.ID); err != nil {
		t.Fatalf("delete contract menu: %v", err)
	}
	assertContractAndPaymentAmounts(t, contractID, paymentID, decimal.Zero)
}

func TestContractMenuChangeRejectsConfirmedPaymentAmountMismatch(t *testing.T) {
	testdb.Open(t)

	contractID, menuID, paymentID := seedPaymentSyncContract(t, "CONFIRMED", decimal.NewFromInt(100))
	svc := NewContractMenuService()

	err := svc.Create(&model.ContractMenu{
		ContractID:        contractID,
		SponsorshipMenuID: menuID,
		Quantity:          2,
		UnitPrice:         decimal.NewFromInt(100),
		ProductionType:    "COMPANY",
		Status:            "WAITING",
	}, true)
	if !errors.Is(err, ErrConfirmedPaymentAmountMismatch) {
		t.Fatalf("create contract menu error = %v, want ErrConfirmedPaymentAmountMismatch", err)
	}

	assertContractAndPaymentAmounts(t, contractID, paymentID, decimal.NewFromInt(100))

	var count int64
	if err := db.DB.Model(&model.ContractMenu{}).Where("contract_id = ?", contractID).Count(&count).Error; err != nil {
		t.Fatalf("count contract menus: %v", err)
	}
	if count != 0 {
		t.Fatalf("contract menu rows after rejected change = %d, want 0", count)
	}
}
