package auth

// Roles matrix for reference and programmatic checks.
// This file lists recommended roles for resources. Use as canonical source when reviewing RBAC.

var RoleMatrix = map[string][]string{
	// resource -> allowed roles
	"create_contract":           {"staff", "admin"},
	"update_contract":           {"staff", "admin"},
	"create_yearly_company":     {"staff", "admin"},
	"update_yearly_company":     {"staff", "admin"},
	"create_sponsorship_menu":   {"staff", "admin"},
	"update_sponsorship_menu":   {"staff", "admin"},
	"create_contract_menu":      {"staff", "admin"},
	"submit_contract_menu":      {"staff", "admin"},
	"update_payment":            {"finance", "admin"},
	"view_activity_logs":        {"staff", "admin"},
	"create_assignment":         {"admin"},
}
