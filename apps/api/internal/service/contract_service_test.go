package service

import (
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

func TestContractServiceCreateSetsDefaultDate(t *testing.T) {
	svc := NewContractService()
	contract := &model.SponsorshipContract{ID: "test-contract", YearlyCompanyID: "yearly-1"}
	if err := svc.Create(contract); err != nil {
		// DB may be unavailable in unit test environment; this path is just to ensure the
		// service does not panic and that the date is initialized before repository call.
		if contract.ContractDate == nil {
			t.Fatalf("expected contract date to be set before repository call")
		}
		return
	}
	if contract.ContractDate == nil {
		t.Fatalf("expected contract date to be set")
	}
}
