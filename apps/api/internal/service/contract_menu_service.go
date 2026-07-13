package service

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
)

type ContractMenuService struct{
	repo *repository.ContractMenuRepository
}

func NewContractMenuService() *ContractMenuService { return &ContractMenuService{repo: repository.NewContractMenuRepository()} }

func (s *ContractMenuService) ListByContract(contractId string) ([]model.ContractMenu, error) { return s.repo.ListByContract(contractId) }

func (s *ContractMenuService) Create(m *model.ContractMenu) error { return s.repo.Create(m) }

func (s *ContractMenuService) Update(m *model.ContractMenu) error { return s.repo.Update(m) }

func (s *ContractMenuService) GetByID(id string) (*model.ContractMenu, error) { return s.repo.GetByID(id) }
