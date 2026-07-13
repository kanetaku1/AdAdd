package repository

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

type AssignmentRepository struct{}

func NewAssignmentRepository() *AssignmentRepository { return &AssignmentRepository{} }

func (r *AssignmentRepository) Create(a *model.Assignment) error { return db.DB.Create(a).Error }

func (r *AssignmentRepository) ListByUser(userId string) ([]model.Assignment, error) {
	var list []model.Assignment
	if err := db.DB.Where("user_id = ?", userId).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (r *AssignmentRepository) ListByYearlyCompany(yearlyCompanyId string) ([]model.Assignment, error) {
	var list []model.Assignment
	if err := db.DB.Where("yearly_company_id = ?", yearlyCompanyId).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}
