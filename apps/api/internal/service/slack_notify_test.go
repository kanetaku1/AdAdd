package service

import "testing"

func TestShouldNotifyConfirmed(t *testing.T) {
	cases := []struct {
		old, neu string
		want     bool
	}{
		{"NOT_CONTACTED", "CONFIRMED", true},
		{"MATERIALS_SENT", "CONFIRMED", true},
		{"", "CONFIRMED", true},
		{"CONFIRMED", "CONFIRMED", false},
		{"CONFIRMED", "INVOICE_SENT", false},
		{"NOT_CONTACTED", "MATERIALS_SENT", false},
		{"INVOICE_SENT", "PAYMENT_RECEIVED", false},
	}
	for _, tc := range cases {
		got := ShouldNotifyConfirmed(tc.old, tc.neu)
		if got != tc.want {
			t.Errorf("ShouldNotifyConfirmed(%q, %q) = %v, want %v", tc.old, tc.neu, got, tc.want)
		}
	}
}

func TestConfirmedMentionText(t *testing.T) {
	got := ConfirmedMentionText("U01TANAKA", "株式会社長岡テクノ")
	want := "<@U01TANAKA> 株式会社長岡テクノ の協賛が確定しました。"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
	got = ConfirmedMentionText("U02", "")
	if got != "<@U02> 企業 の協賛が確定しました。" {
		t.Fatalf("empty company name: %q", got)
	}
}
