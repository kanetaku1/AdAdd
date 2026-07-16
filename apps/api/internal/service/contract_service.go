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

var (
	// ErrContractExists is returned when a YearlyCompany already has a contract
	ErrContractExists = errors.New("contract already exists for this YearlyCompany")
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
		t := time.Now()
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

	return db.WithTx(func(tx *gorm.DB) error {
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
			Action:          "CONTRACT_CREATED",
			Description:     "Contract created",
			CreatedAt:       time.Now(),
		}
		return tx.Create(al).Error
	})
}

func (s *ContractService) Update(c *model.SponsorshipContract) error { return s.repo.Update(c) }

// RecalculateTotalAmount sets totalAmount to sum(quantity * unitPrice) of Contract Menus.
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
	return tx.Model(&model.SponsorshipContract{}).
		Where("id = ?", contractID).
		Update("total_amount", total).Error
}
