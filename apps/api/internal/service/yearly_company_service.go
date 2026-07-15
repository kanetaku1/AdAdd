package service

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
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
	var count int64
	if db.DB != nil {
		db.DB.Table("yearly_companies").
			Joins("JOIN sponsorship_contracts ON sponsorship_contracts.yearly_company_id = yearly_companies.id").
			Where("yearly_companies.company_id = ?", yc.CompanyID).
			Count(&count)
	}

	if count > 0 {
		yc.CompanyStatus = "CONTINUING"
	} else {
		yc.CompanyStatus = "NEW"
	}
	yc.Phase = "PHASE_3"
	yc.Progress = "NOT_CONTACTED"

	return s.repo.Create(yc)
}

func (s *YearlyCompanyService) GetByID(id string) (*model.YearlyCompany, error) {
	return s.repo.GetByID(id)
}

func (s *YearlyCompanyService) Update(yc *model.YearlyCompany) error { return s.repo.Update(yc) }
