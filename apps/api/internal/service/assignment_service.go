package service

import (
	"errors"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
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
// Empty userId clears any existing assignment.
func (s *AssignmentService) AssignOrClear(yearlyCompanyID, userID, actorUserID string) (*model.CompanyAssignment, error) {
	var result *model.CompanyAssignment
	err := db.WithTx(func(tx *gorm.DB) error {
		if err := s.repo.DeleteByYearlyCompany(tx, yearlyCompanyID); err != nil {
			return err
		}
		if userID == "" {
			al := &model.ActivityLog{
				YearlyCompanyID: yearlyCompanyID,
				UserID:          actorUserID,
				Action:          model.EventAssignmentUpdated,
				Description:     "担当メンバーを解除",
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
			Description:     "担当メンバーを設定",
			CreatedAt:       time.Now(),
		}
		return tx.Create(al).Error
	})
	return result, err
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
