package service

import (
	"errors"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/label"
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

func (s *ContractMenuService) ListAcrossYear(yearID string, filters map[string]interface{}) ([]model.ContractMenuResponse, error) {
	return s.repo.ListAcrossYear(yearID, filters)
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

func contractMenuStatusLogMessage(menuName, from, to string) string {
	if menuName == "" {
		menuName = "協賛メニュー"
	}
	return menuName + "のステータスを「" + label.ContractMenuStatus(from) + "」から「" + label.ContractMenuStatus(to) + "」に更新"
}

// UpdateWithUser updates the contract menu and, if status changed, writes one
// ActivityLog (spec/domain.md#Activity Log — every Contract Menu status
// transition, not only SUBMITTED). Same-status PATCHes write nothing.
func (s *ContractMenuService) UpdateWithUser(m *model.ContractMenu, userID string) error {
	csvc := NewContractService()
	return db.WithTx(func(tx *gorm.DB) error {
		var existing model.ContractMenu
		if err := tx.First(&existing, "id = ?", m.ID).Error; err != nil {
			return err
		}
		statusChanged := existing.Status != m.Status
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
		if !statusChanged {
			return nil
		}
		var contract model.SponsorshipContract
		if err := tx.First(&contract, "id = ?", m.ContractID).Error; err != nil {
			return err
		}
		menuName := "協賛メニュー"
		var smenu model.SponsorshipMenu
		if err := tx.First(&smenu, "id = ?", existing.SponsorshipMenuID).Error; err == nil && smenu.Name != "" {
			menuName = smenu.Name
		}
		al := &model.ActivityLog{
			YearlyCompanyID: contract.YearlyCompanyID,
			UserID:          userID,
			Action:          model.EventContractMenuStatusUpdated,
			Description:     contractMenuStatusLogMessage(menuName, existing.Status, m.Status),
			CreatedAt:       time.Now(),
		}
		return tx.Create(al).Error
	})
}

func (s *ContractMenuService) Delete(id string) error {
	csvc := NewContractService()
	return db.WithTx(func(tx *gorm.DB) error {
		var existing model.ContractMenu
		if err := tx.First(&existing, "id = ?", id).Error; err != nil {
			return err
		}
		if err := tx.Unscoped().Delete(&existing).Error; err != nil {
			return err
		}
		return csvc.RecalculateTotalAmount(tx, existing.ContractID)
	})
}

func (s *ContractMenuService) GetByID(id string) (*model.ContractMenu, error) {
	return s.repo.GetByID(id)
}

func (s *ContractMenuService) PatchDetails(id string, quantity *int, unitPrice *decimal.Decimal, isGoodsSponsorship *bool, productionType *string) (*model.ContractMenu, error) {
	csvc := NewContractService()
	var m model.ContractMenu

	err := db.WithTx(func(tx *gorm.DB) error {
		if err := tx.First(&m, "id = ?", id).Error; err != nil {
			return err
		}

		if quantity != nil {
			m.Quantity = *quantity
		}
		if productionType != nil {
			m.ProductionType = *productionType
		}

		wasGoods := m.IsGoodsSponsorship
		if isGoodsSponsorship != nil {
			m.IsGoodsSponsorship = *isGoodsSponsorship
		}

		unitPriceProvided := unitPrice != nil
		if unitPriceProvided {
			m.UnitPrice = *unitPrice
		}

		// Apply defaulting logic for UnitPrice analogous to POST endpoint
		if m.IsGoodsSponsorship {
			m.UnitPrice = decimal.Zero
		} else if !unitPriceProvided && isGoodsSponsorship != nil && !*isGoodsSponsorship && wasGoods {
			// Transitioning FROM goods sponsorship TO non-goods, and NO price specified
			smsvc := NewSponsorshipMenuService()
			smenu, err := smsvc.GetByID(m.SponsorshipMenuID)
			if err != nil {
				return err
			}
			m.UnitPrice = smenu.DefaultPrice
		}

		if err := tx.Save(&m).Error; err != nil {
			return err
		}
		return csvc.RecalculateTotalAmount(tx, m.ContractID)
	})

	if err != nil {
		return nil, err
	}
	return &m, nil
}
