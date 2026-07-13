package service

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
)

type PaymentService struct{
	repo *repository.PaymentRepository
}

func NewPaymentService() *PaymentService { return &PaymentService{repo: repository.NewPaymentRepository()} }

func (s *PaymentService) GetByContractID(contractId string) (*model.Payment, error) { return s.repo.GetByContractID(contractId) }

func (s *PaymentService) Create(p *model.Payment) error { return s.repo.Create(p) }

func (s *PaymentService) Update(p *model.Payment) error { return s.repo.Update(p) }
