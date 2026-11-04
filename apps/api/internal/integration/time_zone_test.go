package integration

import (
	"testing"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/testdb"
)

// Timestamps are stored in JST (spec/architecture.md#Time Zone): MySQL's
// CURRENT_TIMESTAMP defaults and the values Go reads are JST, whatever the
// time zone of the machine running the API (Issue #160).
func TestDatabaseConnectionUsesJapanTime(t *testing.T) {
	database := testdb.Open(t)

	var sessionTimeZone string
	var currentTimestamp, utcTimestamp time.Time
	row := database.Raw("SELECT @@session.time_zone, CURRENT_TIMESTAMP, UTC_TIMESTAMP").Row()
	if err := row.Scan(&sessionTimeZone, &currentTimestamp, &utcTimestamp); err != nil {
		t.Fatalf("query time zone: %v", err)
	}

	if sessionTimeZone != "+09:00" {
		t.Errorf("session time_zone = %q, want +09:00", sessionTimeZone)
	}
	if location := currentTimestamp.Location().String(); location != model.JapanTimeZone.String() {
		t.Errorf("read location = %s, want %s", location, model.JapanTimeZone)
	}
	// MySQL writes the JST wall clock, 9 hours ahead of UTC.
	if difference := currentTimestamp.Sub(utcTimestamp); difference < 9*time.Hour-time.Second || difference > 9*time.Hour+time.Second {
		t.Errorf("CURRENT_TIMESTAMP %s is not 9 hours ahead of UTC_TIMESTAMP %s", currentTimestamp, utcTimestamp)
	}
	// Read back as JST, the wall clock is the current instant.
	if difference := time.Since(currentTimestamp); difference < -time.Minute || difference > time.Minute {
		t.Errorf("CURRENT_TIMESTAMP read back as %s, %s away from now", currentTimestamp, difference)
	}
}
