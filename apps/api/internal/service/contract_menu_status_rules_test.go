package service

import (
	"errors"
	"testing"
)

func TestValidateManualContractMenuStatus(t *testing.T) {
	cases := []struct {
		name                 string
		productionType       *string
		productionDepartment *string
		status               string
		activeFiles          int64
		wantErr              error
	}{
		{name: "obsolete producing cannot be written", status: "PRODUCING", wantErr: ErrInvalidContractMenuStatus},
		{name: "company waiting", productionType: stringPointer("COMPANY"), status: "WAITING"},
		{name: "manual recovery may request", productionType: stringPointer("COMPANY"), status: "REQUESTED"},
		{name: "provisional submission is valid", productionType: stringPointer(ProductionTypeContinued), status: "PROVISIONAL_SUBMITTED"},
		{name: "material completion is valid", productionType: stringPointer("INTERNAL"), status: "MATERIAL_COMPLETED"},
		{name: "company reviewing is valid", productionType: stringPointer("INTERNAL"), status: "COMPANY_REVIEWING"},
		{name: "files do not block recovery", productionType: stringPointer("INTERNAL"), status: "REQUESTED", activeFiles: 1},
		{name: "legacy submitted cannot be written", status: "SUBMITTED", wantErr: ErrInvalidContractMenuStatus},
		{name: "unknown status", status: "UNKNOWN", wantErr: ErrInvalidContractMenuStatus},
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
