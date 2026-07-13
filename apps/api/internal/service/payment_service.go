package service

import (
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"gorm.io/gorm"
)

type PaymentService struct{
	repo *repository.PaymentRepository
}

func NewPaymentService() *PaymentService { return &PaymentService{repo: repository.NewPaymentRepository()} }

func (s *PaymentService) GetByContractID(contractId string) (*model.Payment, error) { return s.repo.GetByContractID(contractId) }

func (s *PaymentService) Create(p *model.Payment) error { return s.repo.Create(p) }

func (s *PaymentService) Update(p *model.Payment) error {
	// Use transaction to update payment and create ActivityLog when status changes to CONFIRMED
	return db.WithTx(func(tx *gorm.DB) error {
		// load existing payment to detect status change
		var existing model.Payment
		if err := tx.First(&existing, "id = ?", p.ID).Error; err != nil {
			return err
		}
		wasConfirmed := existing.Status == "CONFIRMED"
		if p.Status == "CONFIRMED" && !wasConfirmed {
			n := time.Now()
			p.ConfirmedAt = &n
		}
		if err := tx.Save(p).Error; err != nil {
			return err
		}
		if p.Status == "CONFIRMED" && !wasConfirmed {
			// try to find contract to attach YearlyCompanyID for logging
			var contract model.SponsorshipContract
			if err := tx.First(&contract, "id = ?", p.ContractID).Error; err == nil {
				al := &model.ActivityLog{
					YearlyCompanyID: contract.YearlyCompanyID,
					UserID: p.ConfirmedByID,
					Action: "PAYMENT_CONFIRMED",
					Description: "Payment confirmed",
				}
				if err := tx.Create(al).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
}
