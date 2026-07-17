package service

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
)

type SponsorshipMenuService struct {
	repo *repository.SponsorshipMenuRepository
}

func NewSponsorshipMenuService() *SponsorshipMenuService {
	return &SponsorshipMenuService{repo: repository.NewSponsorshipMenuRepository()}
}

func (s *SponsorshipMenuService) ListByYear(yearId string) ([]model.SponsorshipMenu, error) {
	return s.repo.ListByYear(yearId)
}

func (s *SponsorshipMenuService) Create(m *model.SponsorshipMenu) error { return s.repo.Create(m) }

func (s *SponsorshipMenuService) Update(m *model.SponsorshipMenu) error { return s.repo.Update(m) }

func (s *SponsorshipMenuService) GetByID(id string) (*model.SponsorshipMenu, error) {
	return s.repo.GetByID(id)
}
