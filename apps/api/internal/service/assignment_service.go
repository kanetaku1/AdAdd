package service

import (
	"errors"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/label"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"gorm.io/gorm"
)

type AssignmentService struct {
	repo *repository.AssignmentRepository
}

func NewAssignmentService() *AssignmentService {
	return &AssignmentService{repo: repository.NewAssignmentRepository()}
}

// AssignOrClear replaces the CompanyAssignment for a YearlyCompany (0..1).
// Empty userId clears any existing assignment. Saving the current assignee
// again changes nothing, writes no Activity Log, and returns changed = false
// (Issue #167).
func (s *AssignmentService) AssignOrClear(yearlyCompanyID, userID, actorUserID string) (result *model.CompanyAssignment, changed bool, err error) {
	err = db.WithTx(func(tx *gorm.DB) error {
		var current model.CompanyAssignment
		currentUserID := ""
		if err := tx.Where("yearly_company_id = ?", yearlyCompanyID).First(&current).Error; err == nil {
			currentUserID = current.UserID
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if currentUserID == userID {
			if userID != "" {
				result = &current
			}
			return nil
		}
		changed = true

		fromName, err := assigneeName(tx, currentUserID)
		if err != nil {
			return err
		}
		toName, err := assigneeName(tx, userID)
		if err != nil {
			return err
		}
		description := label.AssignmentChange(fromName, toName)

		if err := s.repo.DeleteByYearlyCompany(tx, yearlyCompanyID); err != nil {
			return err
		}
		if userID == "" {
			al := &model.ActivityLog{
				YearlyCompanyID: yearlyCompanyID,
				UserID:          actorUserID,
				Action:          model.EventAssignmentUpdated,
				Description:     description,
				CreatedAt:       time.Now(),
			}
			return tx.Create(al).Error
		}
		a := &model.CompanyAssignment{
			YearlyCompanyID: yearlyCompanyID,
			UserID:          userID,
			AssignedAt:      time.Now(),
		}
		if err := tx.Create(a).Error; err != nil {
			return err
		}
		result = a
		logUser := actorUserID
		if logUser == "" {
			logUser = userID
		}
		al := &model.ActivityLog{
			YearlyCompanyID: yearlyCompanyID,
			UserID:          logUser,
			Action:          model.EventAssignmentUpdated,
			Description:     description,
			CreatedAt:       time.Now(),
		}
		return tx.Create(al).Error
	})
	return result, changed, err
}

// assigneeName is the name recorded in 活動記録 for an assignee; "" for none.
// An unknown User ID falls back to the ID itself, so the entry still says who.
func assigneeName(tx *gorm.DB, userID string) (string, error) {
	if userID == "" {
		return "", nil
	}
	var user model.User
	if err := tx.Select("name").First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return userID, nil
		}
		return "", err
	}
	return user.Name, nil
}

func (s *AssignmentService) GetByYearlyCompany(yearlyCompanyId string) (*model.CompanyAssignment, error) {
	a, err := s.repo.GetByYearlyCompany(yearlyCompanyId)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return a, nil
}
