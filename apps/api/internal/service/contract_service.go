package service

import (
	"errors"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
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

func (s *ContractService) GetByYearlyCompanyID(yearlyCompanyId string) (*model.SponsorshipContract, error) {
	return s.repo.GetByYearlyCompanyID(yearlyCompanyId)
}

func (s *ContractService) Create(c *model.SponsorshipContract) error {
	// set created timestamp etc if needed
	if c.ContractDate == nil {
		t := time.Now()
		c.ContractDate = &t
	}

	// check existence first to avoid duplicate insert and return a clear error
	if existing, err := s.repo.GetByYearlyCompanyID(c.YearlyCompanyID); err == nil && existing != nil {
		return ErrContractExists
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		// some other DB error
		return err
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
