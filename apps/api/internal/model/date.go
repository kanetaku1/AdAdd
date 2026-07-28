package model

import (
	"database/sql/driver"
	"fmt"
	"time"
)

const dateLayout = "2006-01-02"

// Date is a date-only value (no time-of-day/timezone component). Used for
// fields whose wire format is a plain "YYYY-MM-DD" string per spec/api.md
// (e.g. SponsorshipContract.contractDate), rather than RFC3339 — which is
// what encoding/json requires for a bare time.Time.
type Date time.Time

func (d Date) MarshalJSON() ([]byte, error) {
	return []byte(fmt.Sprintf("%q", time.Time(d).Format(dateLayout))), nil
}

func (d *Date) UnmarshalJSON(data []byte) error {
	s := string(data)
	if s == "null" {
		return nil
	}
	if len(s) < 2 || s[0] != '"' || s[len(s)-1] != '"' {
		return fmt.Errorf("model.Date: invalid JSON value %s", s)
	}
	t, err := time.Parse(dateLayout, s[1:len(s)-1])
	if err != nil {
		return fmt.Errorf("model.Date: %w (expected YYYY-MM-DD)", err)
	}
	*d = Date(t)
	return nil
}

// Value implements driver.Valuer so GORM/database-sql can store this as a
// DATE column.
func (d Date) Value() (driver.Value, error) {
	return time.Time(d), nil
}

// Scan implements sql.Scanner so GORM/database-sql can read a DATE column
// back into this type.
func (d *Date) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	t, ok := value.(time.Time)
	if !ok {
		return fmt.Errorf("model.Date: cannot scan %T", value)
	}
	*d = Date(t)
	return nil
}
