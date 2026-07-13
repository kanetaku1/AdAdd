package service

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
)

type ActivityLogService struct{
	repo *repository.ActivityLogRepository
}

func NewActivityLogService() *ActivityLogService { return &ActivityLogService{repo: repository.NewActivityLogRepository()} }

func (s *ActivityLogService) Create(al *model.ActivityLog) error { return s.repo.Create(al) }

func (s *ActivityLogService) ListByYearlyCompany(yearlyCompanyId string) ([]model.ActivityLog, error) { return s.repo.ListByYearlyCompany(yearlyCompanyId) }
