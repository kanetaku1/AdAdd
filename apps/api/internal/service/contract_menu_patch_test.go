package service

import (
	"fmt"
	"testing"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/shopspring/decimal"
)

func TestPatchContractMenuDetailsFallback(t *testing.T) {
	openPaymentSyncTestDB(t)

	suffix := fmt.Sprintf("patch-%d", time.Now().UnixNano())
	contractID, menuID, paymentID := seedPaymentSyncContract(t, suffix, "WAITING", decimal.Zero)
	svc := NewContractMenuService()

	// 1. Create a Goods Sponsorship (unitPrice = 0)
	menu := &model.ContractMenu{
		ContractID:         contractID,
		SponsorshipMenuID:  menuID,
		Quantity:           1,
		IsGoodsSponsorship: true,
		ProductionType:     "COMPANY",
		Status:             "WAITING",
	}
	if err := svc.Create(menu, false); err != nil {
		t.Fatalf("create contract menu: %v", err)
	}
	assertContractAndPaymentAmounts(t, contractID, paymentID, decimal.Zero)

	// 2. Patch: change IsGoodsSponsorship to false, leaving unitPrice nil.
	// Expectation: it falls back to the DefaultPrice (100) from the SponsorshipMenu
	falseVal := false
	updated, err := svc.PatchDetails(menu.ID, nil, nil, &falseVal, nil)
	if err != nil {
		t.Fatalf("patch details failed: %v", err)
	}

	if updated.UnitPrice.String() != "100" {
		t.Fatalf("expected patched unit price to fallback to 100, got %s", updated.UnitPrice.String())
	}

	assertContractAndPaymentAmounts(t, contractID, paymentID, decimal.NewFromInt(100))

	// 3. Patch: change IsGoodsSponsorship back to true, leaving unitPrice nil.
	// Expectation: it should force unitPrice to 0.
	trueVal := true
	updated2, err2 := svc.PatchDetails(menu.ID, nil, nil, &trueVal, nil)
	if err2 != nil {
		t.Fatalf("patch details failed: %v", err2)
	}

	if updated2.UnitPrice.String() != "0" {
		t.Fatalf("expected patched unit price to become 0, got %s", updated2.UnitPrice.String())
	}

	assertContractAndPaymentAmounts(t, contractID, paymentID, decimal.Zero)
}
