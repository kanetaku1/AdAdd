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

// FindActive returns the active Year, or gorm.ErrRecordNotFound when none is active.
func (r *YearRepository) FindActive() (*model.Year, error) {
	var y model.Year
	if err := db.DB.First(&y, "is_active = ?", true).Error; err != nil {
		return nil, err
	}
	return &y, nil
}

func (r *YearRepository) NameExists(name string) (bool, error) {
	var count int64
	if err := db.DB.Model(&model.Year{}).Where("name = ?", name).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *YearRepository) Create(y *model.Year) error { return db.DB.Create(y).Error }
