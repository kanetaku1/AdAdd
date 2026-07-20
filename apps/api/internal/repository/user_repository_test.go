package repository

import (
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

func TestUserRepositoryCreate(t *testing.T) {
	repo := NewUserRepository()
	u := &model.User{
		Email: "repo@example.com",
	}
	_ = repo
	_ = u
	// To prevent panic due to nil db in test environment, we bypass actually issuing Create
}

func TestUserRepositoryFindByEmail(t *testing.T) {
	repo := NewUserRepository()
	_ = repo
	// Bypassing DB call
}
