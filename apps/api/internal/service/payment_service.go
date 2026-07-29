package service

import (
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"gorm.io/gorm"
)

type PaymentService struct {
	repo *repository.PaymentRepository
}

func NewPaymentService() *PaymentService {
	return &PaymentService{repo: repository.NewPaymentRepository()}
}

func (s *PaymentService) GetByContractID(contractId string) (*model.Payment, error) {
	return s.repo.GetByContractID(contractId)
}

func (s *PaymentService) GetByID(id string) (*model.Payment, error) {
	return s.repo.GetByID(id)
}

func (s *PaymentService) ListAcrossYear(yearID string, filters map[string]interface{}) ([]model.PaymentResponse, error) {
	return s.repo.ListAcrossYear(yearID, filters)
}

func (s *PaymentService) Create(p *model.Payment) error { return s.repo.Create(p) }

func (s *PaymentService) Update(p *model.Payment) error {
	return db.WithTx(func(tx *gorm.DB) error {
		var existing model.Payment
		if err := tx.First(&existing, "id = ?", p.ID).Error; err != nil {
			return err
		}
		wasConfirmed := existing.Status == "CONFIRMED"

		updates := map[string]interface{}{
			"status":     p.Status,
			"updated_at": time.Now(),
		}

		if p.Status == "CONFIRMED" && !wasConfirmed {
			n := time.Now()
			updates["confirmed_at"] = &n

			confirmedByID := p.ConfirmedByID
			if confirmedByID == "" {
				confirmedByID = existing.ConfirmedByID
			}
			updates["confirmed_by_id"] = confirmedByID
			p.ConfirmedByID = confirmedByID // Set for activity log
		} else if p.Status == "WAITING" {
			updates["confirmed_at"] = nil
			updates["confirmed_by_id"] = ""
		}

		if err := tx.Model(&model.Payment{}).Where("id = ?", p.ID).Updates(updates).Error; err != nil {
			return err
		}
		if p.Status == "CONFIRMED" && !wasConfirmed {
			contractID := existing.ContractID
			if contractID == "" {
				contractID = p.ContractID
			}
			var contract model.SponsorshipContract
			if err := tx.First(&contract, "id = ?", contractID).Error; err == nil {
				al := &model.ActivityLog{
					YearlyCompanyID: contract.YearlyCompanyID,
					UserID:          p.ConfirmedByID,
					Action:          "PAYMENT_CONFIRMED",
					Description:     "Payment confirmed",
					CreatedAt:       time.Now(),
				}
				if err := tx.Create(al).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
}
