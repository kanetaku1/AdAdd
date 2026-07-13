package repository

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

type YearlyCompanyRepository struct{}

func NewYearlyCompanyRepository() *YearlyCompanyRepository { return &YearlyCompanyRepository{} }

func (r *YearlyCompanyRepository) ListByYear(yearId string) ([]model.YearlyCompany, error) {
	var list []model.YearlyCompany
	if err := db.DB.Where("year_id = ?", yearId).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (r *YearlyCompanyRepository) Create(yc *model.YearlyCompany) error { return db.DB.Create(yc).Error }

func (r *YearlyCompanyRepository) GetByID(id string) (*model.YearlyCompany, error) {
	var yc model.YearlyCompany
	if err := db.DB.First(&yc, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &yc, nil
}

func (r *YearlyCompanyRepository) Update(yc *model.YearlyCompany) error {
	return db.DB.Save(yc).Error
}
