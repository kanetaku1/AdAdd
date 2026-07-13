package service

import (
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

func (s *AssignmentService) Create(a *model.Assignment) error {
	return db.WithTx(func(tx *gorm.DB) error {
		if err := tx.Create(a).Error; err != nil {
			return err
		}
		al := &model.ActivityLog{
			YearlyCompanyID: a.YearlyCompanyID,
			UserID:          a.UserID,
			Action:          "ASSIGNED_MEMBER",
			Description:     "Member assigned to YearlyCompany",
			CreatedAt:       time.Now(),
		}
		if err := tx.Create(al).Error; err != nil {
			return err
		}
		return nil
	})
}

func (s *AssignmentService) ListByYearlyCompany(yearlyCompanyId string) ([]model.Assignment, error) {
	return s.repo.ListByYearlyCompany(yearlyCompanyId)
}

func (s *AssignmentService) ListByUser(userId string) ([]model.Assignment, error) {
	return s.repo.ListByUser(userId)
}
