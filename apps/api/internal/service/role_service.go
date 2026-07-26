package service

import (
	"errors"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
)

var ErrRoleAlreadyGranted = errors.New("role already granted")

type RoleService struct {
	repo *repository.RoleRepository
}

func NewRoleService() *RoleService {
	return &RoleService{repo: repository.NewRoleRepository()}
}

func (s *RoleService) ListAll() ([]model.Role, error) {
	return s.repo.ListAll()
}

func (s *RoleService) GrantToUser(userID, roleID string) (*model.UserRole, error) {
	exists, err := s.repo.HasGrant(userID, roleID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrRoleAlreadyGranted
	}
	return s.repo.GrantToUser(userID, roleID)
}

func (s *RoleService) RevokeFromUser(userID, roleID string) error {
	return s.repo.RevokeFromUser(userID, roleID)
}

func (s *RoleService) ListCodesByUserID(userID string) ([]string, error) {
	return s.repo.ListCodesByUserID(userID)
}

func (s *RoleService) ListCodesByUserIDs(userIDs []string) (map[string][]string, error) {
	return s.repo.ListCodesByUserIDs(userIDs)
}
