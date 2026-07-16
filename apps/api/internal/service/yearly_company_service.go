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

func (s *YearlyCompanyService) ListByYear(yearId string) ([]model.YearlyCompany, error) {
	return s.repo.ListByYear(yearId)
}

func (s *YearlyCompanyService) Create(yc *model.YearlyCompany) error {
	yc.CompanyStatus = computeCompanyStatus(yc.YearID, yc.CompanyID)
	yc.Phase = "PHASE_3"
	yc.Progress = "NOT_CONTACTED"
	return s.repo.Create(yc)
}

func (s *YearlyCompanyService) GetByID(id string) (*model.YearlyCompany, error) {
	return s.repo.GetByID(id)
}

func (s *YearlyCompanyService) Update(yc *model.YearlyCompany) error { return s.repo.Update(yc) }

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
