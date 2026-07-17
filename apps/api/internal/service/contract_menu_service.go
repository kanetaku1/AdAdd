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

type ContractMenuService struct {
	repo *repository.ContractMenuRepository
}

func NewContractMenuService() *ContractMenuService {
	return &ContractMenuService{repo: repository.NewContractMenuRepository()}
}

func (s *ContractMenuService) ListByContract(contractId string) ([]model.ContractMenu, error) {
	return s.repo.ListByContract(contractId)
}

func (s *ContractMenuService) Create(m *model.ContractMenu, unitPriceProvided bool) error {
	csvc := NewContractService()
	contract, err := csvc.GetByID(m.ContractID)
	if err != nil {
		return err
	}

	ycsvc := NewYearlyCompanyService()
	yc, err := ycsvc.GetByID(contract.YearlyCompanyID)
	if err != nil {
		return err
	}

	smsvc := NewSponsorshipMenuService()
	smenu, err := smsvc.GetByID(m.SponsorshipMenuID)
	if err != nil {
		return err
	}

	if smenu.YearID != yc.YearID {
		return errors.New("sponsorship menu year does not match contract year")
	}

	if m.IsGoodsSponsorship {
		m.UnitPrice = decimal.Zero
	} else if !unitPriceProvided {
		m.UnitPrice = smenu.DefaultPrice
	}

	return db.WithTx(func(tx *gorm.DB) error {
		if err := tx.Create(m).Error; err != nil {
			return err
		}
		return csvc.RecalculateTotalAmount(tx, m.ContractID)
	})
}

func (s *ContractMenuService) Update(m *model.ContractMenu) error {
	return s.UpdateWithUser(m, "")
}

// UpdateWithUser updates the contract menu and, if the status transitions to SUBMITTED,
// creates an ActivityLog linked to the given userID (if provided). This runs inside a transaction.
func (s *ContractMenuService) UpdateWithUser(m *model.ContractMenu, userID string) error {
	csvc := NewContractService()
	return db.WithTx(func(tx *gorm.DB) error {
		var existing model.ContractMenu
		if err := tx.First(&existing, "id = ?", m.ID).Error; err != nil {
			return err
		}
		wasSubmitted := existing.Status == "SUBMITTED"
		m.CreatedAt = existing.CreatedAt
		if m.IsGoodsSponsorship {
			m.UnitPrice = decimal.Zero
		}
		if err := tx.Save(m).Error; err != nil {
			return err
		}
		if err := csvc.RecalculateTotalAmount(tx, m.ContractID); err != nil {
			return err
		}
		if m.Status == "SUBMITTED" && !wasSubmitted {
			var contract model.SponsorshipContract
			if err := tx.First(&contract, "id = ?", m.ContractID).Error; err == nil {
				al := &model.ActivityLog{
					YearlyCompanyID: contract.YearlyCompanyID,
					UserID:          userID,
					Action:          "CONTRACT_MENU_SUBMITTED",
					Description:     "Contract menu production info uploaded",
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

func (s *ContractMenuService) Delete(id string) error {
	csvc := NewContractService()
	return db.WithTx(func(tx *gorm.DB) error {
		var existing model.ContractMenu
		if err := tx.First(&existing, "id = ?", id).Error; err != nil {
			return err
		}
		if err := tx.Delete(&existing).Error; err != nil {
			return err
		}
		return csvc.RecalculateTotalAmount(tx, existing.ContractID)
	})
}

func (s *ContractMenuService) GetByID(id string) (*model.ContractMenu, error) {
	return s.repo.GetByID(id)
}
