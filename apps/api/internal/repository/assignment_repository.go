package repository

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"gorm.io/gorm"
)

type AssignmentRepository struct{}

func NewAssignmentRepository() *AssignmentRepository { return &AssignmentRepository{} }

func (r *AssignmentRepository) Create(a *model.CompanyAssignment) error {
	return db.DB.Create(a).Error
}

func (r *AssignmentRepository) ListByUser(userId string) ([]model.CompanyAssignment, error) {
	var list []model.CompanyAssignment
	if err := db.DB.Where("user_id = ?", userId).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (r *AssignmentRepository) GetByYearlyCompany(yearlyCompanyId string) (*model.CompanyAssignment, error) {
	var a model.CompanyAssignment
	if err := db.DB.Where("yearly_company_id = ?", yearlyCompanyId).First(&a).Error; err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *AssignmentRepository) DeleteByYearlyCompany(tx *gorm.DB, yearlyCompanyId string) error {
	// Hard delete so uniqueIndex on yearly_company_id does not block reassignment after clear
	return tx.Unscoped().Where("yearly_company_id = ?", yearlyCompanyId).Delete(&model.CompanyAssignment{}).Error
}
