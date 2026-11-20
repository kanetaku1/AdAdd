package service

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"gorm.io/gorm"
)

type YearlyCompanyService struct {
	repo *repository.YearlyCompanyRepository
}

func NewYearlyCompanyService() *YearlyCompanyService {
	return &YearlyCompanyService{repo: repository.NewYearlyCompanyRepository()}
}

func (s *YearlyCompanyService) ListByYear(yearId string, filters model.YearlyCompanyFilters) ([]model.YearlyCompanyResponse, error) {
	return s.repo.ListByYear(yearId, filters)
}

func (s *YearlyCompanyService) Create(yc *model.YearlyCompany) error {
	company, err := repository.NewCompanyRepository().GetByID(yc.CompanyID)
	if err != nil {
		return err
	}
	model.CopyContactFromCompany(yc, company)
	yc.CompanyStatus = computeCompanyStatus(yc.YearID, yc.CompanyID)
	yc.Phase = "PHASE_3"
	yc.Progress = "NOT_CONTACTED"
	return s.repo.Create(yc)
}

func (s *YearlyCompanyService) GetByID(id string) (*model.YearlyCompanyResponse, error) {
	return s.repo.GetByID(id)
}

// UpdateColumnWithLog changes one column (phase, progress, or companyStatus)
// and writes its Activity Log.
func (s *YearlyCompanyService) UpdateColumnWithLog(id, column string, value interface{}, log *model.ActivityLog) error {
	return s.repo.UpdateColumnWithLog(id, column, value, log)
}

func (s *YearlyCompanyService) UpdateContact(id string, in model.CompanyContactInput) (*model.YearlyCompanyResponse, error) {
	err := db.WithTx(func(tx *gorm.DB) error {
		var yc model.YearlyCompany
		if err := tx.First(&yc, "id = ?", id).Error; err != nil {
			return err
		}
		// Only changed contact columns are written; phase, progress and the
		// company name are never touched (spec/database.md#Concurrent Updates).
		if changes := model.ContactColumnChanges(model.ContactOfYearlyCompany(&yc), in); len(changes) > 0 {
			if err := tx.Model(&model.YearlyCompany{}).Where("id = ?", yc.ID).Updates(changes).Error; err != nil {
				return err
			}
		}
		var company model.Company
		if err := tx.First(&company, "id = ?", yc.CompanyID).Error; err != nil {
			return err
		}
		if changes := model.ContactColumnChanges(model.ContactOfCompany(&company), in); len(changes) > 0 {
			return tx.Model(&model.Company{}).Where("id = ?", company.ID).Updates(changes).Error
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.GetByID(id)
}

// computeCompanyStatus returns CONTINUING only when the company had a SponsorshipContract
// in the immediately preceding Year; otherwise NEW. Dormant is never auto-assigned.
func computeCompanyStatus(yearID, companyID string) string {
	if db.DB == nil {
		return "NEW"
	}
	precedingID, err := findPrecedingYearID(db.DB, yearID)
	if err != nil || precedingID == "" {
		return "NEW"
	}
	var count int64
	db.DB.Table("yearly_companies").
		Joins("JOIN sponsorship_contracts ON sponsorship_contracts.yearly_company_id = yearly_companies.id").
		Where("yearly_companies.company_id = ? AND yearly_companies.year_id = ?", companyID, precedingID).
		Count(&count)
	if count > 0 {
		return "CONTINUING"
	}
	return "NEW"
}

func findPrecedingYearID(tx *gorm.DB, yearID string) (string, error) {
	var current model.Year
	if err := tx.First(&current, "id = ?", yearID).Error; err != nil {
		return "", err
	}
	var preceding model.Year
	err := tx.Where("end_date < ?", current.StartDate).
		Order("end_date DESC").
		First(&preceding).Error
	if err != nil {
		return "", err
	}
	return preceding.ID, nil
}
