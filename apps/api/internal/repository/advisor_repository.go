package repository

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

type AdvisorRepository struct{}

func NewAdvisorRepository() *AdvisorRepository { return &AdvisorRepository{} }

func (r *AdvisorRepository) Create(a *model.AdvisorAssignment) error { return db.DB.Create(a).Error }

func (r *AdvisorRepository) Delete(id string) error {
	// Hard delete so unique (year, member, advisor) does not block re-add after remove
	return db.DB.Unscoped().Delete(&model.AdvisorAssignment{}, "id = ?", id).Error
}

func (r *AdvisorRepository) GetByID(id string) (*model.AdvisorAssignment, error) {
	var a model.AdvisorAssignment
	if err := db.DB.First(&a, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *AdvisorRepository) ListByYear(yearId string) ([]model.AdvisorAssignment, error) {
	var list []model.AdvisorAssignment
	if err := db.DB.Where("year_id = ?", yearId).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (r *AdvisorRepository) ListMembersByAdvisor(advisorId string) ([]model.AdvisorAssignment, error) {
	var list []model.AdvisorAssignment
	if err := db.DB.Where("advisor_id = ?", advisorId).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (r *AdvisorRepository) Exists(yearId, memberId, advisorId string) (bool, error) {
	var count int64
	err := db.DB.Model(&model.AdvisorAssignment{}).
		Where("year_id = ? AND member_id = ? AND advisor_id = ?", yearId, memberId, advisorId).
		Count(&count).Error
	return count > 0, err
}
