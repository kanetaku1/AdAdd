package service

import (
	"errors"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"gorm.io/gorm"
)

type AdvisorService struct {
	repo *repository.AdvisorRepository
}

var ErrAdvisorAssignmentExists = errors.New("advisor assignment already exists")

func NewAdvisorService() *AdvisorService {
	return &AdvisorService{repo: repository.NewAdvisorRepository()}
}

func (s *AdvisorService) Create(a *model.AdvisorAssignment) error {
	exists, err := s.repo.Exists(a.YearID, a.MemberID, a.AdvisorID)
	if err != nil {
		return err
	}
	if exists {
		return ErrAdvisorAssignmentExists
	}
	return s.repo.Create(a)
}

func (s *AdvisorService) Delete(id string) error {
	if _, err := s.repo.GetByID(id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return gorm.ErrRecordNotFound
		}
		return err
	}
	return s.repo.Delete(id)
}

func (s *AdvisorService) ListByYear(yearId string) ([]model.AdvisorAssignment, error) {
	return s.repo.ListByYear(yearId)
}

func (s *AdvisorService) ListMembersByAdvisor(advisorId string) ([]model.AdvisorAssignment, error) {
	return s.repo.ListMembersByAdvisor(advisorId)
}
