package label

import (
	"testing"

	"github.com/shopspring/decimal"
)

func TestYen(t *testing.T) {
	cases := map[string]string{
		"0":        "¥0",
		"100":      "¥100",
		"80000":    "¥80,000",
		"80000.00": "¥80,000",
		"1234567":  "¥1,234,567",
		"-15000":   "-¥15,000",
	}
	for input, want := range cases {
		if got := Yen(decimal.RequireFromString(input)); got != want {
			t.Errorf("Yen(%s) = %s, want %s", input, got, want)
		}
	}
}
