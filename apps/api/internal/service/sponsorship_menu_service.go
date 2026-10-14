package service

import (
	"errors"

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

// ErrSponsorshipMenuInUse is returned when deleting a Sponsorship Menu that a
// Contract Menu references (spec/api.md#Delete Sponsorship Menu).
var ErrSponsorshipMenuInUse = errors.New("sponsorship menu is referenced by contract menus")

func (s *SponsorshipMenuService) Delete(id string) error {
	if _, err := s.repo.GetByID(id); err != nil {
		return err
	}
	inUse, err := s.repo.HasContractMenus(id)
	if err != nil {
		return err
	}
	if inUse {
		return ErrSponsorshipMenuInUse
	}
	return s.repo.Delete(id)
}

func (s *SponsorshipMenuService) GetByID(id string) (*model.SponsorshipMenu, error) {
	return s.repo.GetByID(id)
}
