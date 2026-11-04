package integration

import (
	"testing"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/testdb"
)

// Timestamps are UTC on both sides (spec/architecture.md#Time Zone): MySQL's
// CURRENT_TIMESTAMP defaults and the values Go reads are UTC, whatever the
// time zone of the machine running the API (Issue #160).
func TestDatabaseConnectionUsesUTC(t *testing.T) {
	database := testdb.Open(t)

	var sessionTimeZone string
	var currentTimestamp, utcTimestamp time.Time
	row := database.Raw("SELECT @@session.time_zone, CURRENT_TIMESTAMP, UTC_TIMESTAMP").Row()
	if err := row.Scan(&sessionTimeZone, &currentTimestamp, &utcTimestamp); err != nil {
		t.Fatalf("query time zone: %v", err)
	}

	if sessionTimeZone != "+00:00" {
		t.Errorf("session time_zone = %q, want +00:00", sessionTimeZone)
	}
	if difference := currentTimestamp.Sub(utcTimestamp); difference < -time.Second || difference > time.Second {
		t.Errorf("CURRENT_TIMESTAMP %s differs from UTC_TIMESTAMP %s", currentTimestamp, utcTimestamp)
	}
	if currentTimestamp.Location() != time.UTC {
		t.Errorf("read location = %s, want UTC", currentTimestamp.Location())
	}
	if difference := time.Since(currentTimestamp); difference < -time.Minute || difference > time.Minute {
		t.Errorf("CURRENT_TIMESTAMP read back as %s, %s away from now", currentTimestamp, difference)
	}
}
