package handler

import (
	"errors"

	"github.com/shopspring/decimal"
)

var (
	ValidCompanyStatuses      = []string{"CONTINUING", "NEW", "DORMANT"}
	ValidPhases               = []string{"PHASE_1", "PHASE_2", "PHASE_3", "PHASE_4"}
	ValidProgresses           = []string{"NOT_CONTACTED", "MATERIALS_SENT", "CONFIRMED", "INVOICE_SENT", "PAYMENT_RECEIVED", "RECEIPT_SENT", "DECLINED", "PENDING"}
	ValidProductionTypes      = []string{"COMPANY", "INTERNAL", "CONTINUED"}
	ValidContractMenuStatuses = []string{"WAITING", "REQUESTED", "PRODUCING", "COMPLETED", "SUBMITTED"}
	ValidPaymentStatuses      = []string{"WAITING", "CONFIRMED"}
)

func validateNonNegativeAmount(val decimal.Decimal) bool {
	return !val.IsNegative()
}

func validateStatus(status string, allowed []string) bool {
	if status == "" {
		return false
	}
	for _, s := range allowed {
		if s == status {
			return true
		}
	}
	return false
}

// The Validate* functions below return a plain error describing what's
// invalid — they never write the HTTP response themselves. A respond*
// helper's returned error reflects whether writing the response body
// succeeded, not whether validation passed, so callers must not treat it as
// a validation result. Callers check the returned error and call
// respondBadRequest(c, err.Error()) themselves.

func ValidateCompanyStatus(status string) error {
	if !validateStatus(status, ValidCompanyStatuses) {
		return errors.New("invalid companyStatus")
	}
	return nil
}

func ValidatePhase(phase string) error {
	if !validateStatus(phase, ValidPhases) {
		return errors.New("invalid phase")
	}
	return nil
}

func ValidateProgress(progress string) error {
	if !validateStatus(progress, ValidProgresses) {
		return errors.New("invalid progress")
	}
	return nil
}

func ValidateProductionType(pt string) error {
	if !validateStatus(pt, ValidProductionTypes) {
		return errors.New("invalid productionType")
	}
	return nil
}

func ValidateContractMenuStatus(status string) error {
	if !validateStatus(status, ValidContractMenuStatuses) {
		return errors.New("invalid status")
	}
	return nil
}

func ValidatePaymentStatus(status string) error {
	if !validateStatus(status, ValidPaymentStatuses) {
		return errors.New("invalid status")
	}
	return nil
}
