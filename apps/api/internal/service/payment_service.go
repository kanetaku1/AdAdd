package service

import (
	"errors"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

var ErrReceivedAmountRequired = errors.New("receivedAmount is required to confirm a payment")

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
		status := existing.Status
		statusChanged := p.Status != "" && p.Status != existing.Status
		if p.Status != "" {
			status = p.Status
		}

		receivedAmount := existing.ReceivedAmount
		receivedAmountChanged := p.ReceivedAmountGiven &&
			!equalPaymentAmounts(existing.ReceivedAmount, p.ReceivedAmount)
		if p.ReceivedAmountGiven {
			receivedAmount = p.ReceivedAmount
		}
		remarksChanged := p.RemarksGiven && existing.Remarks != p.Remarks
		if status == "CONFIRMED" && receivedAmount == nil {
			return ErrReceivedAmountRequired
		}

		updates := map[string]interface{}{"updated_at": time.Now()}
		if p.Status != "" {
			updates["status"] = status
		}
		if p.ReceivedAmountGiven {
			updates["received_amount"] = p.ReceivedAmount
		}
		if p.RemarksGiven {
			updates["remarks"] = p.Remarks
		}

		if statusChanged && status == "CONFIRMED" {
			n := time.Now()
			updates["confirmed_at"] = &n

			confirmedByID := p.ConfirmedByID
			if confirmedByID == "" {
				confirmedByID = existing.ConfirmedByID
			}
			updates["confirmed_by_id"] = confirmedByID
			p.ConfirmedByID = confirmedByID // Set for activity log
		} else if statusChanged && status == "WAITING" {
			updates["confirmed_at"] = nil
			updates["confirmed_by_id"] = ""
		}

		if err := tx.Model(&model.Payment{}).Where("id = ?", p.ID).Updates(updates).Error; err != nil {
			return err
		}
		if statusChanged {
			contractID := existing.ContractID
			if contractID == "" {
				contractID = p.ContractID
			}
			var contract model.SponsorshipContract
			if err := tx.First(&contract, "id = ?", contractID).Error; err != nil {
				return err
			}
			description := "入金を確認"
			if status == "WAITING" {
				description = "入金確認を取り消し"
			}
			al := &model.ActivityLog{
				YearlyCompanyID: contract.YearlyCompanyID,
				UserID:          p.ConfirmedByID,
				Action:          model.EventPaymentStatusUpdated,
				Description:     description,
				CreatedAt:       time.Now(),
			}
			if err := tx.Create(al).Error; err != nil {
				return err
			}
		}

		if receivedAmountChanged || remarksChanged {
			var contract model.SponsorshipContract
			if err := tx.First(&contract, "id = ?", existing.ContractID).Error; err != nil {
				return err
			}
			al := &model.ActivityLog{
				YearlyCompanyID: contract.YearlyCompanyID,
				UserID:          p.ConfirmedByID,
				Action:          model.EventPaymentDetailsUpdated,
				Description:     paymentDetailsDescription(receivedAmountChanged, remarksChanged),
				CreatedAt:       time.Now(),
			}
			if err := tx.Create(al).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func equalPaymentAmounts(a, b *decimal.Decimal) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return a.Equal(*b)
}

func paymentDetailsDescription(receivedAmountChanged, remarksChanged bool) string {
	switch {
	case receivedAmountChanged && remarksChanged:
		return "実入金額と備考を更新"
	case receivedAmountChanged:
		return "実入金額を更新"
	default:
		return "入金備考を更新"
	}
}
