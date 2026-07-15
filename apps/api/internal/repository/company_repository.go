package repository

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

type CompanyRepository struct{}

func NewCompanyRepository() *CompanyRepository {
	return &CompanyRepository{}
}

func (r *CompanyRepository) ListAll() ([]model.Company, error) {
	var companies []model.Company
	if err := db.DB.Find(&companies).Error; err != nil {
		return nil, err
	}
	return companies, nil
}

func (r *CompanyRepository) Create(c *model.Company) error {
	return db.DB.Create(c).Error
}

func (r *CompanyRepository) GetByID(id string) (*model.Company, error) {
	var c model.Company
	if err := db.DB.First(&c, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *CompanyRepository) Update(c *model.Company) error {
	var existing model.Company
	if err := db.DB.First(&existing, "id = ?", c.ID).Error; err == nil {
		c.CreatedAt = existing.CreatedAt
	}
	return db.DB.Save(c).Error
}
