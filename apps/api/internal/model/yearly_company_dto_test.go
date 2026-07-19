package model

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestYearlyCompanyResponse_AssignmentConstraint(t *testing.T) {
	// 0..1 constraint test: when there is no assigned member, it should serialize to null
	t.Run("No Assigned Member (0)", func(t *testing.T) {
		dto := YearlyCompanyResponse{
			CompanyName:        "Test Company",
			AssignedMemberID:   nil,
			AssignedMemberName: nil,
		}

		b, err := json.Marshal(dto)
		if err != nil {
			t.Fatalf("failed to marshal: %v", err)
		}

		jsonStr := string(b)
		if !strings.Contains(jsonStr, `"assignedMemberId":null`) || !strings.Contains(jsonStr, `"assignedMemberName":null`) {
			t.Errorf("Expected null for unassigned member fields, got: %s", jsonStr)
		}
	})

	// 0..1 constraint test: when there is an assigned member, it should serialize to the value
	t.Run("Assigned Member (1)", func(t *testing.T) {
		memberID := "u123"
		memberName := "Member Taro"
		dto := YearlyCompanyResponse{
			CompanyName:        "Test Company 2",
			AssignedMemberID:   &memberID,
			AssignedMemberName: &memberName,
		}

		b, err := json.Marshal(dto)
		if err != nil {
			t.Fatalf("failed to marshal: %v", err)
		}

		jsonStr := string(b)
		if !strings.Contains(jsonStr, `"assignedMemberId":"u123"`) || !strings.Contains(jsonStr, `"assignedMemberName":"Member Taro"`) {
			t.Errorf("Expected value for assigned member fields, got: %s", jsonStr)
		}
	})
}
