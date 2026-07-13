package service

import (
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
)

type ContractService struct{
	repo *repository.ContractRepository
}

func NewContractService() *ContractService { return &ContractService{repo: repository.NewContractRepository()} }

func (s *ContractService) GetByYearlyCompanyID(yearlyCompanyId string) (*model.SponsorshipContract, error) {
	return s.repo.GetByYearlyCompanyID(yearlyCompanyId)
}

func (s *ContractService) Create(c *model.SponsorshipContract) error {
	// set created timestamp etc if needed
	if c.ContractDate == nil {
		t := time.Now()
		c.ContractDate = &t
	}
	return s.repo.Create(c)
}

func (s *ContractService) Update(c *model.SponsorshipContract) error { return s.repo.Update(c) }
