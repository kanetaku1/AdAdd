package handler

import (
	"github.com/labstack/echo/v4"
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

func ValidateCompanyStatus(c echo.Context, status string) error {
	if !validateStatus(status, ValidCompanyStatuses) {
		return respondBadRequest(c, "invalid companyStatus")
	}
	return nil
}

func ValidatePhase(c echo.Context, phase string) error {
	if !validateStatus(phase, ValidPhases) {
		return respondBadRequest(c, "invalid phase")
	}
	return nil
}

func ValidateProgress(c echo.Context, progress string) error {
	if !validateStatus(progress, ValidProgresses) {
		return respondBadRequest(c, "invalid progress")
	}
	return nil
}

func ValidateProductionType(c echo.Context, pt string) error {
	if !validateStatus(pt, ValidProductionTypes) {
		return respondBadRequest(c, "invalid productionType")
	}
	return nil
}

func ValidateContractMenuStatus(c echo.Context, status string) error {
	if !validateStatus(status, ValidContractMenuStatuses) {
		return respondBadRequest(c, "invalid status")
	}
	return nil
}

func ValidatePaymentStatus(c echo.Context, status string) error {
	if !validateStatus(status, ValidPaymentStatuses) {
		return respondBadRequest(c, "invalid status")
	}
	return nil
}
