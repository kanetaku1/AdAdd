package repository

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

type AdvisorRepository struct{}

func NewAdvisorRepository() *AdvisorRepository { return &AdvisorRepository{} }

func (r *AdvisorRepository) Create(a *model.AdvisorAssignment) error { return db.DB.Create(a).Error }

func (r *AdvisorRepository) ListMembersByAdvisor(advisorId string) ([]model.AdvisorAssignment, error) {
	var list []model.AdvisorAssignment
	if err := db.DB.Where("advisor_id = ?", advisorId).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}
