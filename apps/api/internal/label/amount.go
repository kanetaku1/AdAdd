package label

import (
	"strings"

	"github.com/shopspring/decimal"
)

// Yen formats an amount for 活動記録 messages, e.g. ¥80,000.
// Amounts are whole yen; a fractional part, if any, is rounded.
func Yen(amount decimal.Decimal) string {
	digits := amount.Abs().Round(0).String()
	var grouped strings.Builder
	for i, digit := range digits {
		if i > 0 && (len(digits)-i)%3 == 0 {
			grouped.WriteByte(',')
		}
		grouped.WriteRune(digit)
	}
	if amount.Round(0).IsNegative() {
		return "-¥" + grouped.String()
	}
	return "¥" + grouped.String()
}
