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
