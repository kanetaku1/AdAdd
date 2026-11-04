package model

import (
	"encoding/json"
	"testing"
	"time"
)

func TestDateMarshalJSON(t *testing.T) {
	d := Date(time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC))
	b, err := json.Marshal(d)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got, want := string(b), `"2026-06-01"`; got != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}

func TestDateUnmarshalJSON(t *testing.T) {
	var d Date
	if err := json.Unmarshal([]byte(`"2026-06-01"`), &d); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	if !time.Time(d).Equal(want) {
		t.Fatalf("got %v, want %v", time.Time(d), want)
	}
}

func TestDateUnmarshalJSONRejectsRFC3339(t *testing.T) {
	var d Date
	if err := json.Unmarshal([]byte(`"2026-06-01T00:00:00Z"`), &d); err == nil {
		t.Fatalf("expected error for RFC3339 input, got nil")
	}
}

func TestSponsorshipContractContractDateRoundTrip(t *testing.T) {
	body := []byte(`{"contractDate":"2026-06-01","totalAmount":"1000"}`)
	var c SponsorshipContract
	if err := json.Unmarshal(body, &c); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if c.ContractDate == nil {
		t.Fatalf("expected ContractDate to be set")
	}

	out, err := json.Marshal(c)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	var roundTripped map[string]interface{}
	if err := json.Unmarshal(out, &roundTripped); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got, want := roundTripped["contractDate"], "2026-06-01"; got != want {
		t.Fatalf("got %v, want %v", got, want)
	}
}

func TestBusinessDateOfUsesJapanTime(t *testing.T) {
	cases := []struct {
		name    string
		instant time.Time
		want    string
	}{
		// 00:30 JST on 11/4 is still 11/3 in UTC (Issue #160).
		{"JST 0-9 o'clock", time.Date(2026, 11, 3, 15, 30, 0, 0, time.UTC), "2026-11-04"},
		{"JST afternoon", time.Date(2026, 11, 4, 5, 0, 0, 0, time.UTC), "2026-11-04"},
		{"JST 23:59", time.Date(2026, 11, 4, 14, 59, 0, 0, time.UTC), "2026-11-04"},
		// The instant's own location does not matter.
		{"instant in another zone", time.Date(2026, 11, 3, 22, 30, 0, 0, time.FixedZone("WIB", 7*60*60)), "2026-11-04"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := BusinessDateOf(c.instant)
			if formatted := time.Time(got).Format(dateLayout); formatted != c.want {
				t.Fatalf("got %s, want %s", formatted, c.want)
			}
			if location := time.Time(got).Location(); location != time.UTC {
				t.Fatalf("got location %s, want UTC so a DATE column keeps the day", location)
			}
		})
	}
}
