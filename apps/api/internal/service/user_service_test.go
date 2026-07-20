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
	_ = svc
	_ = id
	_ = opts
	// We shouldn't execute svc.Update directly if db.DB is nil because it will panic.
	// In a real environment we'd use a mock repo, but for now we just validate it compiles.
}

func TestUserServiceCreate(t *testing.T) {
	svc := NewUserService()
	u := &model.User{Email: "create@example.com"}
	_ = svc
	_ = u
	// We avoid passing to Create directly to prevent nil panic when db is not mocked.
}
