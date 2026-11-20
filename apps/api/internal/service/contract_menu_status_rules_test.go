package service

import (
	"errors"
	"testing"
)

func TestValidateManualContractMenuStatus(t *testing.T) {
	department := "PRODUCTION_BUREAU"
	cases := []struct {
		name                 string
		productionType       *string
		productionDepartment *string
		status               string
		activeFiles          int64
		wantErr              error
	}{
		{name: "non-submission lifecycle", status: "PRODUCING"},
		{name: "company waiting", productionType: stringPointer("COMPANY"), status: "WAITING"},
		{name: "company cannot request", productionType: stringPointer("COMPANY"), status: "REQUESTED", wantErr: ErrInvalidContractMenuStatus},
		{name: "continued waiting", productionType: stringPointer(ProductionTypeContinued), status: "WAITING"},
		{name: "continued cannot complete", productionType: stringPointer(ProductionTypeContinued), status: "COMPLETED", wantErr: ErrInvalidContractMenuStatus},
		{name: "internal unassigned is read-only", productionType: stringPointer("INTERNAL"), status: "WAITING", wantErr: ErrInvalidContractMenuStatus},
		{name: "internal assigned waiting", productionType: stringPointer("INTERNAL"), productionDepartment: &department, status: "WAITING"},
		{name: "internal assigned requested", productionType: stringPointer("INTERNAL"), productionDepartment: &department, status: "REQUESTED"},
		{name: "internal cannot produce", productionType: stringPointer("INTERNAL"), productionDepartment: &department, status: "PRODUCING", wantErr: ErrInvalidContractMenuStatus},
		{name: "submitted is derived", status: "SUBMITTED", wantErr: ErrSubmittedStateConflict},
		{name: "files prevent manual progress", productionType: stringPointer("INTERNAL"), productionDepartment: &department, status: "REQUESTED", activeFiles: 1, wantErr: ErrSubmittedStateConflict},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			err := validateManualContractMenuStatus(
				testCase.productionType,
				testCase.productionDepartment,
				testCase.status,
				testCase.activeFiles,
			)
			if !errors.Is(err, testCase.wantErr) {
				t.Fatalf("error = %v, want %v", err, testCase.wantErr)
			}
		})
	}
}
