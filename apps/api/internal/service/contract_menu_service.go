package service

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
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

func (s *ContractMenuService) Create(m *model.ContractMenu) error { return s.repo.Create(m) }

func (s *ContractMenuService) Update(m *model.ContractMenu) error {
	// keep backward compatibility: no user context
	return s.UpdateWithUser(m, "")
}

// UpdateWithUser updates the contract menu and, if the status transitions to SUBMITTED,
// creates an ActivityLog linked to the given userID (if provided). This runs inside a transaction.
func (s *ContractMenuService) UpdateWithUser(m *model.ContractMenu, userID string) error {
	return db.WithTx(func(tx *gorm.DB) error {
		// fetch existing to detect status change
		var existing model.ContractMenu
		if err := tx.First(&existing, "id = ?", m.ID).Error; err != nil {
			return err
		}
		wasSubmitted := existing.Status == "SUBMITTED"
		if err := tx.Save(m).Error; err != nil {
			return err
		}
		if m.Status == "SUBMITTED" && !wasSubmitted {
			// try to attach YearlyCompanyID via contract
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

func (s *ContractMenuService) GetByID(id string) (*model.ContractMenu, error) {
	return s.repo.GetByID(id)
}
