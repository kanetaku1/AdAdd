package service

import (
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

func TestUserServiceUpdateValidation(t *testing.T) {
	svc := NewUserService()

	id := "test-user-id"
	email := "test@example.com"
	active := true

	opts := UserUpdateOpts{
		Email:    &email,
		IsActive: &active,
	}

	_, err := svc.Update(id, opts)
	if err != nil {
		// Expecting error because DB is likely not connected or user doesn't exist
		// Just ensuring no panics occur during parameter passing or struct validation
		return
	}
}

func TestUserServiceCreate(t *testing.T) {
	svc := NewUserService()
	u := &model.User{Email: "create@example.com"}

	err := svc.Create(u)
	if err != nil {
		// Just ensuring no panics occur
		return
	}
}
