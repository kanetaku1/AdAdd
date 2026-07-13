package service

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
)

type AssignmentService struct{
	repo *repository.AssignmentRepository
}

func NewAssignmentService() *AssignmentService { return &AssignmentService{repo: repository.NewAssignmentRepository()} }

func (s *AssignmentService) Create(a *model.Assignment) error { return s.repo.Create(a) }

func (s *AssignmentService) ListByYearlyCompany(yearlyCompanyId string) ([]model.Assignment, error) { return s.repo.ListByYearlyCompany(yearlyCompanyId) }

func (s *AssignmentService) ListByUser(userId string) ([]model.Assignment, error) { return s.repo.ListByUser(userId) }
