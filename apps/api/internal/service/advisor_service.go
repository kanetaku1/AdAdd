package service

import (
	"errors"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
)

type AdvisorService struct {
	repo *repository.AdvisorRepository
}

var ErrAdvisorAssignmentExists = errors.New("advisor assignment already exists")

func NewAdvisorService() *AdvisorService {
	return &AdvisorService{repo: repository.NewAdvisorRepository()}
}

func (s *AdvisorService) Create(a *model.AdvisorAssignment) error {
	var count int64
	if db.DB != nil {
		db.DB.Model(&model.AdvisorAssignment{}).Where("year_id = ? AND member_id = ?", a.YearID, a.MemberID).Count(&count)
		if count > 0 {
			return ErrAdvisorAssignmentExists
		}
	}
	return s.repo.Create(a)
}

func (s *AdvisorService) ListMembersByAdvisor(advisorId string) ([]model.AdvisorAssignment, error) {
	return s.repo.ListMembersByAdvisor(advisorId)
}
