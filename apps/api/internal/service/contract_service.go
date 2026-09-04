package service

import (
	"errors"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	// ErrContractExists is returned when a YearlyCompany already has a contract
	ErrContractExists = errors.New("contract already exists for this YearlyCompany")
	// ErrConfirmedPaymentAmountMismatch is returned when a Contract Menu change
	// would alter a Contract total after Finance has confirmed the Payment.
	ErrConfirmedPaymentAmountMismatch = errors.New("confirmed payment amount would no longer match contract total")
)

type ContractService struct {
	repo *repository.ContractRepository
}

func NewContractService() *ContractService {
	return &ContractService{repo: repository.NewContractRepository()}
}

func (s *ContractService) GetByID(id string) (*model.SponsorshipContract, error) {
	return s.repo.GetByID(id)
}

func (s *ContractService) GetByYearlyCompanyID(yearlyCompanyId string) (*model.SponsorshipContract, error) {
	return s.repo.GetByYearlyCompanyID(yearlyCompanyId)
}

func (s *ContractService) Create(c *model.SponsorshipContract) error {
	return s.CreateWithUser(c, c.AssigneeID)
}

func (s *ContractService) CreateWithUser(c *model.SponsorshipContract, actorUserID string) error {
	if c.ContractDate == nil {
		t := model.Date(time.Now())
		c.ContractDate = &t
	}

	if existing, err := s.repo.GetByYearlyCompanyID(c.YearlyCompanyID); err == nil && existing != nil {
		return ErrContractExists
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	logUser := actorUserID
	if logUser == "" {
		logUser = c.AssigneeID
	}

	previousProgress := ""
	err := db.WithTx(func(tx *gorm.DB) error {
		var yc model.YearlyCompany
		if err := tx.First(&yc, "id = ?", c.YearlyCompanyID).Error; err != nil {
			return err
		}
		previousProgress = yc.Progress
		if err := tx.Create(c).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.YearlyCompany{}).
			Where("id = ?", c.YearlyCompanyID).
			Update("progress", "CONFIRMED").Error; err != nil {
			return err
		}
		al := &model.ActivityLog{
			YearlyCompanyID: c.YearlyCompanyID,
			UserID:          logUser,
			Action:          model.EventContractCreated,
			Description:     "契約を作成",
			CreatedAt:       time.Now(),
		}
		return tx.Create(al).Error
	})
	if err != nil {
		return err
	}
	NotifyAssigneeOnConfirmedAsync(c.YearlyCompanyID, previousProgress, "CONFIRMED")
	return nil
}

func (s *ContractService) Update(c *model.SponsorshipContract) error { return s.repo.Update(c) }

// RecalculateTotalAmount sets totalAmount to sum(quantity * unitPrice) of Contract Menus.
// If a Waiting Payment exists, its amount is synchronized in the same transaction.
// If a Confirmed Payment exists and the new total differs from the confirmed amount,
// the recalculation is rejected so the contract/payment pair cannot become inconsistent.
func (s *ContractService) RecalculateTotalAmount(tx *gorm.DB, contractID string) error {
	var menus []model.ContractMenu
	if err := tx.Where("contract_id = ?", contractID).Find(&menus).Error; err != nil {
		return err
	}
	total := decimal.Zero
	for _, m := range menus {
		line := m.UnitPrice.Mul(decimal.NewFromInt(int64(m.Quantity)))
		total = total.Add(line)
	}

	var payment model.Payment
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("contract_id = ?", contractID).
		First(&payment).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	if err == nil {
		switch payment.Status {
		case "WAITING":
			if err := tx.Model(&model.Payment{}).
				Where("id = ?", payment.ID).
				Updates(map[string]interface{}{
					"amount":     total,
					"updated_at": time.Now(),
				}).Error; err != nil {
				return err
			}
		case "CONFIRMED":
			if !payment.Amount.Equal(total) {
				return ErrConfirmedPaymentAmountMismatch
			}
		}
	}

	return tx.Model(&model.SponsorshipContract{}).
		Where("id = ?", contractID).
		Update("total_amount", total).Error
}
