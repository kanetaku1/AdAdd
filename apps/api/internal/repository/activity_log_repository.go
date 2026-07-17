package repository

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

type ActivityLogRepository struct{}

func NewActivityLogRepository() *ActivityLogRepository { return &ActivityLogRepository{} }

func (r *ActivityLogRepository) Create(al *model.ActivityLog) error { return db.DB.Create(al).Error }

func (r *ActivityLogRepository) ListByYearlyCompany(yearlyCompanyId string) ([]model.ActivityLog, error) {
	var list []model.ActivityLog
	if err := db.DB.Where("yearly_company_id = ?", yearlyCompanyId).Order("created_at desc").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}
