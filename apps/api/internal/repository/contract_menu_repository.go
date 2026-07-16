package repository

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

type ContractMenuRepository struct{}

func NewContractMenuRepository() *ContractMenuRepository { return &ContractMenuRepository{} }

func (r *ContractMenuRepository) ListByContract(contractId string) ([]model.ContractMenu, error) {
	var list []model.ContractMenu
	if err := db.DB.Where("contract_id = ?", contractId).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (r *ContractMenuRepository) Create(m *model.ContractMenu) error { return db.DB.Create(m).Error }

func (r *ContractMenuRepository) Update(m *model.ContractMenu) error {
	// preserve existing CreatedAt to avoid writing zero DATETIME
	var existing model.ContractMenu
	if err := db.DB.First(&existing, "id = ?", m.ID).Error; err == nil {
		m.CreatedAt = existing.CreatedAt
	}
	return db.DB.Save(m).Error
}

func (r *ContractMenuRepository) GetByID(id string) (*model.ContractMenu, error) {
	var m model.ContractMenu
	if err := db.DB.First(&m, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &m, nil
}
