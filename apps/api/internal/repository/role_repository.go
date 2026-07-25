package repository

import (
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

type RoleRepository struct{}

func NewRoleRepository() *RoleRepository { return &RoleRepository{} }

func (r *RoleRepository) ListAll() ([]model.Role, error) {
	var roles []model.Role
	if err := db.DB.Order("code").Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}

func (r *RoleRepository) GetByID(id string) (*model.Role, error) {
	var role model.Role
	if err := db.DB.First(&role, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *RoleRepository) GrantToUser(userID, roleID string) (*model.UserRole, error) {
	ur := &model.UserRole{
		UserID:     userID,
		RoleID:     roleID,
		AssignedAt: time.Now(),
	}
	if err := db.DB.Create(ur).Error; err != nil {
		return nil, err
	}
	return ur, nil
}

// RevokeFromUser hard-deletes so the unique (userId, roleId) pair doesn't
// block re-granting the same Role later — same reasoning as
// AdvisorRepository.Delete.
func (r *RoleRepository) RevokeFromUser(userID, roleID string) error {
	return db.DB.Unscoped().
		Delete(&model.UserRole{}, "user_id = ? AND role_id = ?", userID, roleID).Error
}

// ListCodesByUserID returns the Role codes currently held by one User.
func (r *RoleRepository) ListCodesByUserID(userID string) ([]string, error) {
	var codes []string
	err := db.DB.Table("user_roles").
		Select("roles.code").
		Joins("JOIN roles ON roles.id = user_roles.role_id").
		Where("user_roles.user_id = ? AND user_roles.deleted_at IS NULL", userID).
		Scan(&codes).Error
	return codes, err
}

// ListCodesByUserIDs batches ListCodesByUserID for a list of Users (avoids
// N+1 queries on GET /users).
func (r *RoleRepository) ListCodesByUserIDs(userIDs []string) (map[string][]string, error) {
	if len(userIDs) == 0 {
		return map[string][]string{}, nil
	}
	type row struct {
		UserID string
		Code   string
	}
	var rows []row
	err := db.DB.Table("user_roles").
		Select("user_roles.user_id as user_id, roles.code as code").
		Joins("JOIN roles ON roles.id = user_roles.role_id").
		Where("user_roles.user_id IN ? AND user_roles.deleted_at IS NULL", userIDs).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	result := make(map[string][]string)
	for _, row := range rows {
		result[row.UserID] = append(result[row.UserID], row.Code)
	}
	return result, nil
}
