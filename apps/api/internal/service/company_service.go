package service

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
)

type CompanyService struct{
	repo *repository.CompanyRepository
}

func NewCompanyService() *CompanyService {
	return &CompanyService{repo: repository.NewCompanyRepository()}
}

func (s *CompanyService) ListAll() ([]model.Company, error) {
	return s.repo.ListAll()
}

func (s *CompanyService) Create(c *model.Company) error {
	return s.repo.Create(c)
}

func (s *CompanyService) GetByID(id string) (*model.Company, error) {
	return s.repo.GetByID(id)
}
