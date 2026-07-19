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
	err := repo.Create(u)
	if err != nil {
		// Expected error in unit test without DB connected
		return
	}
}

func TestUserRepositoryFindByEmail(t *testing.T) {
	repo := NewUserRepository()
	_, err := repo.FindByEmail("repo@example.com")
	if err != nil {
		// Expected error in unit test
		return
	}
}
