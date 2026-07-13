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
	// preserve existing CreatedAt to avoid writing zero DATETIME
	var existing model.SponsorshipMenu
	if err := db.DB.First(&existing, "id = ?", m.ID).Error; err == nil {
		m.CreatedAt = existing.CreatedAt
	}
	return db.DB.Save(m).Error
}

func (r *SponsorshipMenuRepository) GetByID(id string) (*model.SponsorshipMenu, error) {
	var m model.SponsorshipMenu
	if err := db.DB.First(&m, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &m, nil
}
