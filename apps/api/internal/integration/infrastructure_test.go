package integration

import (
	"net/http"
	"sort"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

// TestMigrationsSeedCanonicalRoles checks that all migrations apply to an
// empty MySQL and leave exactly the canonical Roles (spec/domain.md#Role).
func TestMigrationsSeedCanonicalRoles(t *testing.T) {
	newAPI(t)

	var codes []string
	if err := db.DB.Model(&model.Role{}).Pluck("code", &codes).Error; err != nil {
		t.Fatalf("load roles: %v", err)
	}
	sort.Strings(codes)

	want := []string{"ADMINISTRATOR", "ADVISOR", "FINANCE_DEPARTMENT", "SPONSORSHIP_MEMBER"}
	if len(codes) != len(want) {
		t.Fatalf("role codes = %v, want %v", codes, want)
	}
	for i := range want {
		if codes[i] != want[i] {
			t.Fatalf("role codes = %v, want %v", codes, want)
		}
	}
}

// TestEachTestStartsFromEmptyDatabase checks that data written by one test is
// not visible to the next one.
func TestEachTestStartsFromEmptyDatabase(t *testing.T) {
	for _, name := range []string{"first", "second"} {
		t.Run(name, func(t *testing.T) {
			server := newAPI(t)
			administrator := asUser(t, server, "test-administrator", "ADMINISTRATOR")

			response := administrator.do(http.MethodGet, "/years", nil)
			expectStatus(t, response, http.StatusOK)
			if years := decodeData[[]model.Year](t, response); len(years) != 0 {
				t.Fatalf("years before insert = %d, want 0", len(years))
			}

			if err := db.DB.Exec(
				"INSERT INTO years (id, name, start_date, end_date, is_active, created_at, updated_at) VALUES (?, ?, NOW(), NOW(), false, NOW(), NOW())",
				"year-"+name, "isolation-"+name,
			).Error; err != nil {
				t.Fatalf("insert year: %v", err)
			}
		})
	}
}
