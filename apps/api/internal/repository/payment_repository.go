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

// ListAcrossYear returns every Payment for a Year's Contracts, joined with
// Company / Yearly Company / confirming User (spec/api.md#List Payments
// Across a Year). Mirrors ContractMenuRepository.ListAcrossYear's join style.
func (r *PaymentRepository) ListAcrossYear(yearID string, filters map[string]interface{}) ([]model.PaymentResponse, error) {
	var list []model.PaymentResponse
	query := db.DB.Table("payments").
		Select("payments.*, companies.company_name, yearly_companies.id as yearly_company_id, users.name as confirmed_by_name").
		Joins("JOIN sponsorship_contracts ON sponsorship_contracts.id = payments.contract_id AND sponsorship_contracts.deleted_at IS NULL").
		Joins("JOIN yearly_companies ON yearly_companies.id = sponsorship_contracts.yearly_company_id AND yearly_companies.deleted_at IS NULL").
		Joins("JOIN companies ON companies.id = yearly_companies.company_id AND companies.deleted_at IS NULL").
		Joins("LEFT JOIN users ON users.id = payments.confirmed_by_id").
		Where("payments.deleted_at IS NULL").
		Where("yearly_companies.year_id = ?", yearID)

	if status, ok := filters["status"]; ok && status != "" {
		query = query.Where("payments.status = ?", status)
	}

	if err := query.Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
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
