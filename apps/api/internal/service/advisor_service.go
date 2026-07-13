package service

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
)

type AdvisorService struct {
	repo *repository.AdvisorRepository
}

func NewAdvisorService() *AdvisorService {
	return &AdvisorService{repo: repository.NewAdvisorRepository()}
}

func (s *AdvisorService) Create(a *model.AdvisorAssignment) error { return s.repo.Create(a) }

func (s *AdvisorService) ListMembersByAdvisor(advisorId string) ([]model.AdvisorAssignment, error) {
	return s.repo.ListMembersByAdvisor(advisorId)
}
