package service

import (
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/shopspring/decimal"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func openPaymentSyncTestDB(t *testing.T) {
	t.Helper()

	dsn := os.Getenv("ADADD_API_TEST_DSN")
	if dsn == "" {
		t.Skip("ADADD_API_TEST_DSN is not set; skipping DB integration test")
	}

	gormDB, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	db.DB = gormDB
}

func seedPaymentSyncContract(t *testing.T, suffix string, paymentStatus string, paymentAmount decimal.Decimal) (string, string, string) {
	t.Helper()

	yearID := "test-year-" + suffix
	companyID := "test-company-" + suffix
	yearlyCompanyID := "test-yearly-company-" + suffix
	contractID := "test-contract-" + suffix
	menuID := "test-menu-" + suffix
	paymentID := "test-payment-" + suffix
	now := time.Now()

	t.Cleanup(func() {
		db.DB.Unscoped().Delete(&model.ContractMenu{}, "contract_id = ?", contractID)
		db.DB.Unscoped().Delete(&model.Payment{}, "id = ?", paymentID)
		db.DB.Unscoped().Delete(&model.SponsorshipContract{}, "id = ?", contractID)
		db.DB.Unscoped().Delete(&model.SponsorshipMenu{}, "id = ?", menuID)
		db.DB.Unscoped().Delete(&model.YearlyCompany{}, "id = ?", yearlyCompanyID)
		db.DB.Unscoped().Delete(&model.Company{}, "id = ?", companyID)
		db.DB.Unscoped().Delete(&model.Year{}, "id = ?", yearID)
	})

	if err := db.DB.Create(&model.Year{
		ID:        yearID,
		Name:      "payment-sync-" + suffix,
		StartDate: now,
		EndDate:   now.AddDate(0, 1, 0),
		IsActive:  false,
	}).Error; err != nil {
		t.Fatalf("seed year: %v", err)
	}
	if err := db.DB.Create(&model.Company{
		ID:          companyID,
		CompanyName: "Payment Sync Test " + suffix,
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
		Name:               "Test Menu " + suffix,
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
	openPaymentSyncTestDB(t)

	suffix := fmt.Sprintf("waiting-%d", time.Now().UnixNano())
	contractID, menuID, paymentID := seedPaymentSyncContract(t, suffix, "WAITING", decimal.Zero)
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
	openPaymentSyncTestDB(t)

	suffix := fmt.Sprintf("confirmed-%d", time.Now().UnixNano())
	contractID, menuID, paymentID := seedPaymentSyncContract(t, suffix, "CONFIRMED", decimal.NewFromInt(100))
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
