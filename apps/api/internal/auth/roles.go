package auth

// Roles matrix for reference and programmatic checks.
// This file lists recommended roles for resources. Use as canonical source when reviewing RBAC.

var RoleMatrix = map[string][]string{
	"manage_companies":         {"company_manager", "admin"},
	"manage_years":             {"company_manager", "admin"},
	"manage_sponsorship_menus": {"menu_manager", "admin"},
	"manage_contracts":         {"staff", "admin"},
	"manage_contract_menus":    {"staff", "admin"},
	"manage_payments":          {"finance", "admin"},
	"manage_assignments":       {"admin"},
	"manage_advisors":          {"company_manager", "admin"},
}
