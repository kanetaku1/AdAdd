package service

import (
	"errors"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
)

var ErrEmailAlreadyExists = errors.New("email already exists")

type UserService struct {
	repo *repository.UserRepository
}

func NewUserService() *UserService {
	return &UserService{
		repo: repository.NewUserRepository(),
	}
}

func (s *UserService) ListAll() ([]model.User, error) {
	return s.repo.ListAll()
}

func (s *UserService) Create(user *model.User) error {
	// Check for duplicate email
	existing, _ := s.repo.FindByEmail(user.Email)
	if existing != nil {
		return ErrEmailAlreadyExists
	}
	return s.repo.Create(user)
}

func (s *UserService) GetByID(id string) (*model.User, error) {
	return s.repo.GetByID(id)
}

type UserUpdateOpts struct {
	StudentID *string
	Name      *string
	Email     *string
	SlackID   *string
	IsActive  *bool
}

func (s *UserService) Update(id string, opts UserUpdateOpts) (*model.User, error) {
	user, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if opts.Email != nil && *opts.Email != user.Email {
		existing, _ := s.repo.FindByEmail(*opts.Email)
		if existing != nil {
			return nil, ErrEmailAlreadyExists
		}
		user.Email = *opts.Email
	}

	if opts.StudentID != nil {
		user.StudentID = *opts.StudentID
	}
	if opts.Name != nil {
		user.Name = *opts.Name
	}
	if opts.SlackID != nil {
		user.SlackID = *opts.SlackID
	}
	if opts.IsActive != nil {
		user.IsActive = *opts.IsActive
	}

	if err := s.repo.Update(user); err != nil {
		return nil, err
	}
	return user, nil
}
