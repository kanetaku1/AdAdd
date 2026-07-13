package repository

import (
	"time"

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

func (r *PaymentRepository) GetByID(id string) (*model.Payment, error) {
	var p model.Payment
	if err := db.DB.First(&p, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *PaymentRepository) Create(p *model.Payment) error { return db.DB.Create(p).Error }

// Update does a targeted update to avoid overwriting timestamp fields with zero values
func (r *PaymentRepository) Update(p *model.Payment) error {
	updates := map[string]interface{}{
		"status":          p.Status,
		"confirmed_at":    p.ConfirmedAt,
		"confirmed_by_id": p.ConfirmedByID,
		"updated_at":      time.Now(),
	}
	// only update amount if provided (non-zero)
	if !p.Amount.IsZero() {
		updates["amount"] = p.Amount
	}
	return db.DB.Model(&model.Payment{}).Where("id = ?", p.ID).Updates(updates).Error
}
