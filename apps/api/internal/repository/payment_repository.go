package repository

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

type PaymentRepository struct{}

func NewPaymentRepository() *PaymentRepository { return &PaymentRepository{} }

func (r *PaymentRepository) GetByContractID(contractId string) (*model.Payment, error) {
	var p model.Payment
	if err := db.DB.First(&p, "contract_id = ?", contractId).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *PaymentRepository) Create(p *model.Payment) error { return db.DB.Create(p).Error }

func (r *PaymentRepository) Update(p *model.Payment) error { return db.DB.Save(p).Error }
