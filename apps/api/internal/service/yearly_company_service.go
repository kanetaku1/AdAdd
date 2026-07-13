package service

import (
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

func (s *YearlyCompanyService) Create(yc *model.YearlyCompany) error { return s.repo.Create(yc) }

func (s *YearlyCompanyService) GetByID(id string) (*model.YearlyCompany, error) {
	return s.repo.GetByID(id)
}

func (s *YearlyCompanyService) Update(yc *model.YearlyCompany) error { return s.repo.Update(yc) }
