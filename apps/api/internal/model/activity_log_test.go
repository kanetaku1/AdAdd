package model

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestNormalizeEventType(t *testing.T) {
	cases := map[string]string{
		"UPDATE_PROGRESS":          EventProgressUpdated,
		"UPDATE_COMPANY_STATUS":    EventCompanyStatusUpdated,
		"UPDATE_PHASE":             EventPhaseUpdated,
		"ASSIGNED_MEMBER":          EventAssignmentUpdated,
		"CLEARED_MEMBER":           EventAssignmentUpdated,
		"CONTRACT_MENU_SUBMITTED":  EventContractMenuStatusUpdated,
		"PAYMENT_CONFIRMED":        EventPaymentStatusUpdated,
		EventProgressUpdated:       EventProgressUpdated,
		EventContractCreated:       EventContractCreated,
		"UNKNOWN_CUSTOM":           "UNKNOWN_CUSTOM",
	}
	for in, want := range cases {
		if got := NormalizeEventType(in); got != want {
			t.Errorf("NormalizeEventType(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestActivityLogResponse_JSONUsesSpecFieldNames(t *testing.T) {
	name := "田中"
	dto := ActivityLogResponse{
		ID:              "al-1",
		YearlyCompanyID: "yc-1",
		EventType:       EventProgressUpdated,
		Message:         "進捗を「資料送付」から「請求書送付」に更新",
		CreatedByID:     "u-1",
		CreatedByName:   &name,
	}

	b, err := json.Marshal(dto)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	jsonStr := string(b)

	for _, must := range []string{
		`"eventType":"PROGRESS_UPDATED"`,
		`"message":"進捗を「資料送付」から「請求書送付」に更新"`,
		`"createdById":"u-1"`,
		`"createdByName":"田中"`,
	} {
		if !strings.Contains(jsonStr, must) {
			t.Errorf("expected %s in JSON, got %s", must, jsonStr)
		}
	}
	for _, mustNot := range []string{`"action"`, `"description"`, `"userId"`, `"userName"`} {
		if strings.Contains(jsonStr, mustNot) {
			t.Errorf("legacy field %s must not appear, got %s", mustNot, jsonStr)
		}
	}
}
