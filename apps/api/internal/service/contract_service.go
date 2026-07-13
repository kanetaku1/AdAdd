package service

import (
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"gorm.io/gorm"
)

type ContractService struct {
	repo *repository.ContractRepository
}

func NewContractService() *ContractService {
	return &ContractService{repo: repository.NewContractRepository()}
}

func (s *ContractService) GetByYearlyCompanyID(yearlyCompanyId string) (*model.SponsorshipContract, error) {
	return s.repo.GetByYearlyCompanyID(yearlyCompanyId)
}

func (s *ContractService) Create(c *model.SponsorshipContract) error {
	// set created timestamp etc if needed
	if c.ContractDate == nil {
		t := time.Now()
		c.ContractDate = &t
	}
	// create contract and activity log within a transaction for consistency
	return db.WithTx(func(tx *gorm.DB) error {
		if err := tx.Create(c).Error; err != nil {
			return err
		}
		al := &model.ActivityLog{
			YearlyCompanyID: c.YearlyCompanyID,
			UserID:          c.AssigneeID,
			Action:          "CONTRACT_CREATED",
			Description:     "Contract created",
			CreatedAt:       time.Now(),
		}
		if err := tx.Create(al).Error; err != nil {
			return err
		}
		return nil
	})
}

func (s *ContractService) Update(c *model.SponsorshipContract) error { return s.repo.Update(c) }
