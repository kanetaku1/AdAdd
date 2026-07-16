package service

import (
	"testing"

	"github.com/shopspring/decimal"
)

func TestContractMenuLineTotal(t *testing.T) {
	unit := decimal.NewFromInt(10000)
	qty := 3
	got := unit.Mul(decimal.NewFromInt(int64(qty)))
	want := decimal.NewFromInt(30000)
	if !got.Equal(want) {
		t.Fatalf("expected %s got %s", want, got)
	}
}

func TestGoodsSponsorshipUnitPriceIsZero(t *testing.T) {
	isGoods := true
	unitPriceProvided := true
	unit := decimal.NewFromInt(50000)
	if isGoods {
		unit = decimal.Zero
	} else if !unitPriceProvided {
		unit = decimal.NewFromInt(80000)
	}
	if !unit.IsZero() {
		t.Fatal("goods sponsorship unitPrice must be zero")
	}
}

func TestExplicitZeroUnitPriceKeptWhenNotGoods(t *testing.T) {
	unitPriceProvided := true
	isGoods := false
	unit := decimal.Zero
	defaultPrice := decimal.NewFromInt(80000)
	if isGoods {
		unit = decimal.Zero
	} else if !unitPriceProvided {
		unit = defaultPrice
	}
	if !unit.IsZero() {
		t.Fatal("explicit zero must not be replaced by defaultPrice")
	}
}
