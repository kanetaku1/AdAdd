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

func (r *YearlyCompanyRepository) ListByYear(yearId string, filters model.YearlyCompanyFilters) ([]model.YearlyCompanyResponse, error) {
	var list []model.YearlyCompanyResponse
	query := db.DB.Table("yearly_companies").
		Select(yearlyCompanySelect()).
		Joins("JOIN companies ON companies.id = yearly_companies.company_id AND companies.deleted_at IS NULL").
		Joins("LEFT JOIN assignments ON assignments.yearly_company_id = yearly_companies.id AND assignments.deleted_at IS NULL").
		Joins("LEFT JOIN users ON users.id = assignments.user_id AND users.deleted_at IS NULL").
		Joins("LEFT JOIN sponsorship_contracts ON sponsorship_contracts.yearly_company_id = yearly_companies.id AND sponsorship_contracts.deleted_at IS NULL").
		Where("yearly_companies.year_id = ? AND yearly_companies.deleted_at IS NULL", yearId)

	if filters.Keyword != "" {
		query = query.Where("(companies.company_name LIKE ? OR companies.company_name_kana LIKE ?)", "%"+filters.Keyword+"%", "%"+filters.Keyword+"%")
	}
	if filters.CompanyStatus != "" {
		query = query.Where("yearly_companies.company_status = ?", filters.CompanyStatus)
	}
	if filters.Phase != "" {
		query = query.Where("yearly_companies.phase = ?", filters.Phase)
	}
	if filters.AssigneeUserID != "" {
		query = query.Where("assignments.user_id = ?", filters.AssigneeUserID)
	}
	if filters.AdvisorUserID != "" {
		query = query.Where("assignments.user_id IN (SELECT member_id FROM advisor_assignments WHERE advisor_id = ? AND year_id = ? AND deleted_at IS NULL)", filters.AdvisorUserID, yearId)
	}
	if filters.Progress != "" {
		query = query.Where("yearly_companies.progress = ?", filters.Progress)
	}
	if filters.HasContract != nil {
		if *filters.HasContract {
			query = query.Where("sponsorship_contracts.id IS NOT NULL")
		} else {
			query = query.Where("sponsorship_contracts.id IS NULL")
		}
	}

	err := query.Scan(&list).Error
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

func (r *YearlyCompanyRepository) Update(yc *model.YearlyCompany) error {
	// preserve existing CreatedAt to avoid writing zero DATETIME
	var existing model.YearlyCompany
	if err := db.DB.First(&existing, "id = ?", yc.ID).Error; err == nil {
		yc.CreatedAt = existing.CreatedAt
	}
	return db.DB.Save(yc).Error
}

func (r *YearlyCompanyRepository) UpdateWithLog(yc *model.YearlyCompany, log *model.ActivityLog) error {
	var existing model.YearlyCompany
	if err := db.DB.First(&existing, "id = ?", yc.ID).Error; err == nil {
		yc.CreatedAt = existing.CreatedAt
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(yc).Error; err != nil {
			return err
		}
		if err := tx.Create(log).Error; err != nil {
			return err
		}
		return nil
	})
}
