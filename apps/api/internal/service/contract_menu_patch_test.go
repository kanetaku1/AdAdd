package service

import (
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/testdb"
	"github.com/shopspring/decimal"
)

func TestPatchContractMenuDetailsFallback(t *testing.T) {
	testdb.Open(t)

	contractID, menuID, paymentID := seedPaymentSyncContract(t, "WAITING", decimal.Zero)
	svc := NewContractMenuService()

	// 1. Create a Goods Sponsorship (unitPrice = 0). The total stays 0, so
	// the WAITING Payment is removed (a goods-only contract has no Payment).
	menu, err := svc.Add(contractID, ContractMenuInput{
		SponsorshipMenuID:  menuID,
		Quantity:           1,
		IsGoodsSponsorship: true,
		ProductionType:     stringPointer("COMPANY"),
	}, "user-test")
	if err != nil {
		t.Fatalf("create contract menu: %v", err)
	}
	assertContractTotal(t, contractID, decimal.Zero)
	assertPaymentRemoved(t, paymentID)

	// 2. Patch: change IsGoodsSponsorship to false, leaving unitPrice nil.
	// Expectation: it falls back to the DefaultPrice (100) from the SponsorshipMenu
	falseVal := false
	updated, err := svc.PatchDetails(menu.ID, nil, nil, &falseVal, ProductionTypeChange{}, "user-test")
	if err != nil {
		t.Fatalf("patch details failed: %v", err)
	}

	if updated.UnitPrice.String() != "100" {
		t.Fatalf("expected patched unit price to fallback to 100, got %s", updated.UnitPrice.String())
	}

	assertContractTotal(t, contractID, decimal.NewFromInt(100))

	// 3. Patch: change IsGoodsSponsorship back to true, leaving unitPrice nil.
	// Expectation: it should force unitPrice to 0.
	trueVal := true
	updated2, err2 := svc.PatchDetails(menu.ID, nil, nil, &trueVal, ProductionTypeChange{}, "user-test")
	if err2 != nil {
		t.Fatalf("patch details failed: %v", err2)
	}

	if updated2.UnitPrice.String() != "0" {
		t.Fatalf("expected patched unit price to become 0, got %s", updated2.UnitPrice.String())
	}

	assertContractTotal(t, contractID, decimal.Zero)
}

func stringPointer(value string) *string { return &value }
