package handler

import "testing"

func TestValidateMaxQuantity(t *testing.T) {
	t.Parallel()

	if err := validateMaxQuantity(nil); err != nil {
		t.Errorf("nil (unlimited) should be valid, got %v", err)
	}

	eight := 8
	if err := validateMaxQuantity(&eight); err != nil {
		t.Errorf("8 should be valid, got %v", err)
	}

	one := 1
	if err := validateMaxQuantity(&one); err != nil {
		t.Errorf("1 should be valid, got %v", err)
	}

	zero := 0
	if err := validateMaxQuantity(&zero); err == nil {
		t.Error("0 should be rejected")
	}

	negative := -1
	if err := validateMaxQuantity(&negative); err == nil {
		t.Error("negative should be rejected")
	}
}
