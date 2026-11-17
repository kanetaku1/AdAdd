package repository

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"gorm.io/gorm"
)

type YearlyCompanyRepository struct{}

func NewYearlyCompanyRepository() *YearlyCompanyRepository { return &YearlyCompanyRepository{} }

func yearlyCompanySelect() string {
	return "yearly_companies.*, companies.company_name, companies.company_name_kana, assignments.user_id as assigned_member_id, users.name as assigned_member_name, sponsorship_contracts.total_amount as contract_total_amount"
}

func (r *YearlyCompanyRepository) ListByYear(yearId string) ([]model.YearlyCompanyResponse, error) {
	var list []model.YearlyCompanyResponse
	err := db.DB.Table("yearly_companies").
		Select(yearlyCompanySelect()).
		Joins("JOIN companies ON companies.id = yearly_companies.company_id").
		Joins("LEFT JOIN assignments ON assignments.yearly_company_id = yearly_companies.id").
		Joins("LEFT JOIN users ON users.id = assignments.user_id").
		Joins("LEFT JOIN sponsorship_contracts ON sponsorship_contracts.yearly_company_id = yearly_companies.id AND sponsorship_contracts.deleted_at IS NULL").
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
		Select(yearlyCompanySelect()).
		Joins("JOIN companies ON companies.id = yearly_companies.company_id").
		Joins("LEFT JOIN assignments ON assignments.yearly_company_id = yearly_companies.id").
		Joins("LEFT JOIN users ON users.id = assignments.user_id").
		Joins("LEFT JOIN sponsorship_contracts ON sponsorship_contracts.yearly_company_id = yearly_companies.id AND sponsorship_contracts.deleted_at IS NULL").
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

// UpdateColumnWithLog writes one column and its Activity Log in one
// transaction. Only that column is written, so a concurrent change to another
// column (e.g. progress set to CONFIRMED by contract creation while the phase
// changes) is kept (spec/database.md#Concurrent Updates).
func (r *YearlyCompanyRepository) UpdateColumnWithLog(id, column string, value interface{}, log *model.ActivityLog) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&model.YearlyCompany{}).Where("id = ?", id).Update(column, value).Error; err != nil {
			return err
		}
		return tx.Create(log).Error
	})
}
