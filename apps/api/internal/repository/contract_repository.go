package repository

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

type ContractRepository struct{}

func NewContractRepository() *ContractRepository { return &ContractRepository{} }

func (r *ContractRepository) GetByYearlyCompanyID(yearlyCompanyId string) (*model.SponsorshipContract, error) {
	var c model.SponsorshipContract
	if err := db.DB.First(&c, "yearly_company_id = ?", yearlyCompanyId).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *ContractRepository) Create(c *model.SponsorshipContract) error { return db.DB.Create(c).Error }

func (r *ContractRepository) Update(c *model.SponsorshipContract) error {
	// preserve existing CreatedAt to avoid writing zero DATETIME
	var existing model.SponsorshipContract
	if err := db.DB.First(&existing, "id = ?", c.ID).Error; err == nil {
		c.CreatedAt = existing.CreatedAt
	}
	return db.DB.Save(c).Error
}
