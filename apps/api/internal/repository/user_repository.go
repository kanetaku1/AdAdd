package repository

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

type UserRepository struct{}

func NewUserRepository() *UserRepository { return &UserRepository{} }

func (r *UserRepository) GetByID(id string) (*model.User, error) {
	var u model.User
	if err := db.DB.First(&u, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) GetOrCreateByEmail(email string, user *model.User) (*model.User, error) {
	var u model.User
	if err := db.DB.First(&u, "email = ?", email).Error; err == nil {
		return &u, nil
	}
	if err := db.DB.Create(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) FindByEmail(email string) (*model.User, error) {
	var u model.User
	if err := db.DB.First(&u, "email = ?", email).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) ListAll() ([]model.User, error) {
	var users []model.User
	if err := db.DB.Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func (r *UserRepository) Create(user *model.User) error {
	return db.DB.Create(user).Error
}

func (r *UserRepository) Update(user *model.User) error {
	return db.DB.Save(user).Error
}
