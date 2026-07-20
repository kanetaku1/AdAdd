package repository

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"gorm.io/gorm"
)

type YearlyCompanyRepository struct{}

func NewYearlyCompanyRepository() *YearlyCompanyRepository { return &YearlyCompanyRepository{} }

func (r *YearlyCompanyRepository) ListByYear(yearId string) ([]model.YearlyCompanyResponse, error) {
	var list []model.YearlyCompanyResponse
	err := db.DB.Table("yearly_companies").
		Select("yearly_companies.*, companies.company_name, assignments.user_id as assigned_member_id, users.name as assigned_member_name").
		Joins("JOIN companies ON companies.id = yearly_companies.company_id").
		Joins("LEFT JOIN assignments ON assignments.yearly_company_id = yearly_companies.id").
		Joins("LEFT JOIN users ON users.id = assignments.user_id").
		Where("yearly_companies.year_id = ? AND yearly_companies.deleted_at IS NULL", yearId).
		Scan(&list).Error
	if err != nil {
		return nil, err
	}
	return list, nil
}

func (r *YearlyCompanyRepository) Create(yc *model.YearlyCompany) error {
	return db.DB.Create(yc).Error
}

func (r *YearlyCompanyRepository) GetByID(id string) (*model.YearlyCompanyResponse, error) {
	var yc model.YearlyCompanyResponse
	err := db.DB.Table("yearly_companies").
		Select("yearly_companies.*, companies.company_name, assignments.user_id as assigned_member_id, users.name as assigned_member_name").
		Joins("JOIN companies ON companies.id = yearly_companies.company_id").
		Joins("LEFT JOIN assignments ON assignments.yearly_company_id = yearly_companies.id").
		Joins("LEFT JOIN users ON users.id = assignments.user_id").
		Where("yearly_companies.id = ? AND yearly_companies.deleted_at IS NULL", id).
		Scan(&yc).Error
	if err != nil {
		return nil, err
	}
	if yc.ID == "" {
		return nil, gorm.ErrRecordNotFound
	}
	return &yc, nil
}

func (r *YearlyCompanyRepository) Update(yc *model.YearlyCompany) error {
	// preserve existing CreatedAt to avoid writing zero DATETIME
	var existing model.YearlyCompany
	if err := db.DB.First(&existing, "id = ?", yc.ID).Error; err == nil {
		yc.CreatedAt = existing.CreatedAt
	}
	return db.DB.Save(yc).Error
}
