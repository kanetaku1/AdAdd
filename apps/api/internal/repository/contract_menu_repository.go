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

func (r *ContractMenuRepository) ListAcrossYear(yearID string, filters map[string]interface{}) ([]model.ContractMenuResponse, error) {
	var list []model.ContractMenuResponse
	query := db.DB.Table("contract_menus").
		Select("contract_menus.*, companies.company_name, yearly_companies.id as yearly_company_id, sponsorship_menus.name as sponsorship_menu_name").
		Joins("JOIN sponsorship_contracts ON sponsorship_contracts.id = contract_menus.contract_id").
		Joins("JOIN yearly_companies ON yearly_companies.id = sponsorship_contracts.yearly_company_id").
		Joins("JOIN companies ON companies.id = yearly_companies.company_id").
		Joins("JOIN sponsorship_menus ON sponsorship_menus.id = contract_menus.sponsorship_menu_id").
		Where("yearly_companies.year_id = ?", yearID)

	if name, ok := filters["companyName"]; ok && name != "" {
		query = query.Where("companies.company_name LIKE ?", "%"+name.(string)+"%")
	}
	if menuId, ok := filters["sponsorshipMenuId"]; ok && menuId != "" {
		query = query.Where("contract_menus.sponsorship_menu_id = ?", menuId)
	}
	if status, ok := filters["status"]; ok && status != "" {
		query = query.Where("contract_menus.status = ?", status)
	}
	if prodType, ok := filters["productionType"]; ok && prodType != "" {
		query = query.Where("contract_menus.production_type = ?", prodType)
	}

	if err := query.Find(&list).Error; err != nil {
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
