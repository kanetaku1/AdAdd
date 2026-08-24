package repository

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

type SponsorshipMenuRepository struct{}

func NewSponsorshipMenuRepository() *SponsorshipMenuRepository { return &SponsorshipMenuRepository{} }

func (r *SponsorshipMenuRepository) ListByYear(yearId string) ([]model.SponsorshipMenu, error) {
	var list []model.SponsorshipMenu
	if err := db.DB.Where("year_id = ?", yearId).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (r *SponsorshipMenuRepository) Create(m *model.SponsorshipMenu) error {
	return db.DB.Create(m).Error
}

func (r *SponsorshipMenuRepository) Update(m *model.SponsorshipMenu) error {
	// preserve existing CreatedAt to avoid writing zero DATETIME. Select
	// includes MaxQuantity so a nil cap (unlimited) is written as NULL
	// instead of being skipped as a zero value.
	var existing model.SponsorshipMenu
	if err := db.DB.First(&existing, "id = ?", m.ID).Error; err != nil {
		return err
	}
	m.CreatedAt = existing.CreatedAt
	return db.DB.Model(m).Select(
		"Name",
		"DefaultPrice",
		"RequiresSubmission",
		"IsActive",
		"MaxQuantity",
	).Updates(m).Error
}

func (r *SponsorshipMenuRepository) Delete(id string) error {
	return db.DB.Unscoped().Delete(&model.SponsorshipMenu{}, "id = ?", id).Error
}

func (r *SponsorshipMenuRepository) GetByID(id string) (*model.SponsorshipMenu, error) {
	var m model.SponsorshipMenu
	if err := db.DB.First(&m, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &m, nil
}
