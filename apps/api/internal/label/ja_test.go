package label

import "testing"

func TestProgress(t *testing.T) {
	if got := Progress("MATERIALS_SENT"); got != "資料送付" {
		t.Fatalf("got %q", got)
	}
	if got := Progress("UNKNOWN"); got != "UNKNOWN" {
		t.Fatalf("unknown should pass through, got %q", got)
	}
}

func TestStatusChange(t *testing.T) {
	got := StatusChange("進捗", Progress("NOT_CONTACTED"), Progress("MATERIALS_SENT"))
	want := "進捗を「未連絡」から「資料送付」に更新"
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestContractMenuStatus(t *testing.T) {
	if got := ContractMenuStatus("WAITING"); got != "広告データ提出待ち" {
		t.Fatalf("got %q", got)
	}
}

func TestNormalizeActivityMessage(t *testing.T) {
	cases := map[string]string{
		"Progress changed from PAYMENT_RECEIVED to INVOICE_SENT": "進捗を「協賛金入金」から「請求書送付」に更新",
		"Phase changed from PHASE_3 to PHASE_1":                 "フェーズを「フェーズ3」から「フェーズ1」に更新",
		"Member assigned to YearlyCompany":                      "担当メンバーを設定",
		"進捗を MATERIALS_SENT から INVOICE_SENT に更新":                "進捗を「資料送付」から「請求書送付」に更新",
		"ホームページ広告のステータスを WAITING から PRODUCING に更新":              "ホームページ広告のステータスを「広告データ提出待ち」から「制作中」に更新",
		"進捗を「資料送付」から「請求書送付」に更新":                                 "進捗を「資料送付」から「請求書送付」に更新",
		"先方よりメール返信あり。":                                          "先方よりメール返信あり。",
	}
	for in, want := range cases {
		if got := NormalizeActivityMessage(in); got != want {
			t.Errorf("NormalizeActivityMessage(%q) = %q, want %q", in, got, want)
		}
	}
}
