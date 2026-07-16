package repository

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

type YearRepository struct{}

func NewYearRepository() *YearRepository { return &YearRepository{} }

func (r *YearRepository) List() ([]model.Year, error) {
	var yrs []model.Year
	if err := db.DB.Find(&yrs).Error; err != nil {
		return nil, err
	}
	return yrs, nil
}

func (r *YearRepository) GetByID(id string) (*model.Year, error) {
	var y model.Year
	if err := db.DB.First(&y, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &y, nil
}

func (r *YearRepository) Create(y *model.Year) error { return db.DB.Create(y).Error }
