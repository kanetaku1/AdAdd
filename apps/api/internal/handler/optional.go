package handler

import "encoding/json"

// optionalString tells an omitted JSON field (Sent false) apart from an
// explicit null (Sent true, Value nil), for PATCH requests where null clears
// a value and omission keeps it.
type optionalString struct {
	Sent  bool
	Value *string
}

func (o *optionalString) UnmarshalJSON(data []byte) error {
	o.Sent = true
	if string(data) == "null" {
		o.Value = nil
		return nil
	}
	var value string
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	o.Value = &value
	return nil
}
