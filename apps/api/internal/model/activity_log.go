package model

// ActivityEventType values returned as eventType (spec/api.md#List Activity Logs).
// Persistence still stores them in activity_logs.action.
const (
	EventProgressUpdated           = "PROGRESS_UPDATED"
	EventCompanyStatusUpdated      = "COMPANY_STATUS_UPDATED"
	EventPhaseUpdated              = "PHASE_UPDATED"
	EventAssignmentUpdated         = "ASSIGNMENT_UPDATED"
	EventContractCreated           = "CONTRACT_CREATED"
	EventContractMenuStatusUpdated = "CONTRACT_MENU_STATUS_UPDATED"
	EventPaymentStatusUpdated      = "PAYMENT_STATUS_UPDATED"
	EventManualNote                = "MANUAL_NOTE"
)

// NormalizeEventType maps legacy action values written before spec/api.md
// alignment onto the current eventType set. Unknown values are returned as-is
// so a badge can still show the raw token.
func NormalizeEventType(action string) string {
	switch action {
	case "UPDATE_PROGRESS":
		return EventProgressUpdated
	case "UPDATE_COMPANY_STATUS":
		return EventCompanyStatusUpdated
	case "UPDATE_PHASE":
		return EventPhaseUpdated
	case "ASSIGNED_MEMBER", "CLEARED_MEMBER":
		return EventAssignmentUpdated
	case "CONTRACT_MENU_SUBMITTED":
		return EventContractMenuStatusUpdated
	case "PAYMENT_CONFIRMED":
		return EventPaymentStatusUpdated
	default:
		return action
	}
}
