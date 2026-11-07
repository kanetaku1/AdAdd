package repository

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"gorm.io/gorm"
)

type ContractMenuRepository struct{}

func NewContractMenuRepository() *ContractMenuRepository { return &ContractMenuRepository{} }

func (r *ContractMenuRepository) ListByContract(contractId string) ([]model.ContractMenu, error) {
	var list []model.ContractMenu
	if err := db.DB.Preload("Files", fileOrder).Where("contract_id = ?", contractId).Find(&list).Error; err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return list, nil
	}
	active, err := contractActiveYear(db.DB, contractId)
	if err != nil {
		return nil, err
	}
	for i := range list {
		list[i].ActiveYear = active
		list[i].PrepareFileSummary()
	}
	return list, nil
}

func (r *ContractMenuRepository) ListAcrossYear(yearID string, filters map[string]interface{}) ([]model.ContractMenuResponse, error) {
	var list []model.ContractMenuResponse
	// .Table() bypasses GORM's automatic soft-delete scoping (it only applies
	// to the model passed via .Model()), and that scoping never covers joined
	// tables anyway — so every joined table's deleted_at is checked explicitly.
	// A row whose Sponsorship Menu (or any other joined parent) has been
	// deleted is excluded rather than surfaced with a stale/missing name.
	query := db.DB.Table("contract_menus").
		Select("contract_menus.*, companies.company_name, yearly_companies.id as yearly_company_id, assignments.user_id as assigned_member_id, users.name as assigned_member_name, sponsorship_menus.name as sponsorship_menu_name").
		Joins("JOIN sponsorship_contracts ON sponsorship_contracts.id = contract_menus.contract_id AND sponsorship_contracts.deleted_at IS NULL").
		Joins("JOIN yearly_companies ON yearly_companies.id = sponsorship_contracts.yearly_company_id AND yearly_companies.deleted_at IS NULL").
		Joins("JOIN companies ON companies.id = yearly_companies.company_id AND companies.deleted_at IS NULL").
		Joins("JOIN sponsorship_menus ON sponsorship_menus.id = contract_menus.sponsorship_menu_id AND sponsorship_menus.deleted_at IS NULL").
		Joins("LEFT JOIN assignments ON assignments.yearly_company_id = yearly_companies.id AND assignments.deleted_at IS NULL").
		Joins("LEFT JOIN users ON users.id = assignments.user_id AND users.deleted_at IS NULL").
		Where("contract_menus.deleted_at IS NULL").
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
	if len(list) == 0 {
		return list, nil
	}
	var year model.Year
	if err := db.DB.Select("is_active").First(&year, "id = ?", yearID).Error; err != nil {
		return nil, err
	}
	for i := range list {
		if err := db.DB.Where("contract_menu_id = ?", list[i].ID).
			Order("created_at ASC, id ASC").Find(&list[i].Files).Error; err != nil {
			return nil, err
		}
		list[i].ActiveYear = year.IsActive
		list[i].PrepareFileSummary()
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
	if err := db.DB.Preload("Files", fileOrder).First(&m, "id = ?", id).Error; err != nil {
		return nil, err
	}
	active, err := contractActiveYear(db.DB, m.ContractID)
	if err != nil {
		return nil, err
	}
	m.ActiveYear = active
	m.PrepareFileSummary()
	return &m, nil
}

func (r *ContractMenuRepository) ListFiles(contractMenuID string) ([]model.ContractMenuDriveFile, error) {
	var files []model.ContractMenuDriveFile
	if err := db.DB.Where("contract_menu_id = ?", contractMenuID).
		Order("created_at ASC, id ASC").Find(&files).Error; err != nil {
		return nil, err
	}
	return files, nil
}

func fileOrder(tx *gorm.DB) *gorm.DB {
	return tx.Order("created_at ASC, id ASC")
}

func contractActiveYear(tx *gorm.DB, contractID string) (bool, error) {
	var row struct {
		IsActive bool `gorm:"column:is_active"`
	}
	err := tx.Table("years").
		Select("years.is_active").
		Joins("JOIN yearly_companies ON yearly_companies.year_id = years.id AND yearly_companies.deleted_at IS NULL").
		Joins("JOIN sponsorship_contracts ON sponsorship_contracts.yearly_company_id = yearly_companies.id AND sponsorship_contracts.deleted_at IS NULL").
		Where("sponsorship_contracts.id = ?", contractID).
		Take(&row).Error
	return row.IsActive, err
}
