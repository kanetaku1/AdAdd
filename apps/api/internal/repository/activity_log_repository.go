package repository

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

type ActivityLogRepository struct{}

func NewActivityLogRepository() *ActivityLogRepository { return &ActivityLogRepository{} }

func (r *ActivityLogRepository) Create(al *model.ActivityLog) error { return db.DB.Create(al).Error }

func (r *ActivityLogRepository) ListByYearlyCompany(yearlyCompanyId string) ([]model.ActivityLogResponse, error) {
	var list []model.ActivityLogResponse
	if err := db.DB.Table("activity_logs").
		Select("activity_logs.*, users.name as user_name").
		Joins("JOIN users ON users.id = activity_logs.user_id").
		Where("activity_logs.yearly_company_id = ?", yearlyCompanyId).
		Order("activity_logs.created_at desc").
		Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}
