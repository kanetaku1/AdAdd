package model

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestPaymentResponse_JoinedFields(t *testing.T) {
	t.Run("unassigned member serializes as null", func(t *testing.T) {
		dto := PaymentResponse{
			CompanyName:        "株式会社長岡テクノ",
			CompanyNameKana:    "ナガオカテクノ",
			YearlyCompanyID:    "yc-1",
			AssignedMemberName: nil,
		}

		b, err := json.Marshal(dto)
		if err != nil {
			t.Fatalf("failed to marshal: %v", err)
		}

		jsonStr := string(b)
		if !strings.Contains(jsonStr, `"companyNameKana":"ナガオカテクノ"`) {
			t.Errorf("expected companyNameKana in JSON, got: %s", jsonStr)
		}
		if !strings.Contains(jsonStr, `"assignedMemberName":null`) {
			t.Errorf("expected assignedMemberName null when unassigned, got: %s", jsonStr)
		}
	})

	t.Run("assigned member serializes as name", func(t *testing.T) {
		name := "田中"
		dto := PaymentResponse{
			CompanyName:        "越後電機株式会社",
			CompanyNameKana:    "",
			YearlyCompanyID:    "yc-2",
			AssignedMemberName: &name,
		}

		b, err := json.Marshal(dto)
		if err != nil {
			t.Fatalf("failed to marshal: %v", err)
		}

		jsonStr := string(b)
		if !strings.Contains(jsonStr, `"companyNameKana":""`) {
			t.Errorf("expected empty companyNameKana to remain a string, got: %s", jsonStr)
		}
		if !strings.Contains(jsonStr, `"assignedMemberName":"田中"`) {
			t.Errorf("expected assignedMemberName value, got: %s", jsonStr)
		}
	})
}

func TestPaymentDetailResponse_ConfirmedByName(t *testing.T) {
	t.Run("unconfirmed payment serializes confirmedByName as null", func(t *testing.T) {
		dto := PaymentDetailResponse{
			Payment: Payment{
				ID:         "pay-1",
				ContractID: "con-1",
				Status:     "WAITING",
			},
			ConfirmedByName: nil,
		}

		b, err := json.Marshal(dto)
		if err != nil {
			t.Fatalf("failed to marshal: %v", err)
		}

		jsonStr := string(b)
		if !strings.Contains(jsonStr, `"confirmedByName":null`) {
			t.Errorf("expected confirmedByName null in JSON, got: %s", jsonStr)
		}
	})

	t.Run("confirmed payment serializes confirmedByName with user name", func(t *testing.T) {
		name := "佐藤"
		confirmedBy := "user-1"
		dto := PaymentDetailResponse{
			Payment: Payment{
				ID:            "pay-1",
				ContractID:    "con-1",
				Status:        "CONFIRMED",
				ConfirmedByID: &confirmedBy,
			},
			ConfirmedByName: &name,
		}

		b, err := json.Marshal(dto)
		if err != nil {
			t.Fatalf("failed to marshal: %v", err)
		}

		jsonStr := string(b)
		if !strings.Contains(jsonStr, `"confirmedByName":"佐藤"`) {
			t.Errorf("expected confirmedByName in JSON, got: %s", jsonStr)
		}
	})
}
