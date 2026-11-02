package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/label"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

var (
	ErrPastYearReadOnly       = errors.New("contract menu files cannot be changed for a past year")
	ErrSubmittedStateConflict = errors.New("SUBMITTED is derived from active files")
	ErrInvalidDriveFile       = errors.New("invalid contract menu drive file")
)

type ContractMenuDriveFileInput struct {
	DriveURL      string
	DriveFileName string
}

type ContractMenuService struct {
	repo *repository.ContractMenuRepository
}

func NewContractMenuService() *ContractMenuService {
	return &ContractMenuService{repo: repository.NewContractMenuRepository()}
}

func (s *ContractMenuService) ListByContract(contractId string) ([]model.ContractMenu, error) {
	return s.repo.ListByContract(contractId)
}

func (s *ContractMenuService) ListAcrossYear(yearID string, filters map[string]interface{}) ([]model.ContractMenuResponse, error) {
	return s.repo.ListAcrossYear(yearID, filters)
}

func (s *ContractMenuService) Create(m *model.ContractMenu, unitPriceProvided bool) error {
	csvc := NewContractService()
	contract, err := csvc.GetByID(m.ContractID)
	if err != nil {
		return err
	}

	ycsvc := NewYearlyCompanyService()
	yc, err := ycsvc.GetByID(contract.YearlyCompanyID)
	if err != nil {
		return err
	}

	smsvc := NewSponsorshipMenuService()
	smenu, err := smsvc.GetByID(m.SponsorshipMenuID)
	if err != nil {
		return err
	}

	if smenu.YearID != yc.YearID {
		return errors.New("sponsorship menu year does not match contract year")
	}

	if m.IsGoodsSponsorship {
		m.UnitPrice = decimal.Zero
	} else if !unitPriceProvided {
		m.UnitPrice = smenu.DefaultPrice
	}

	return db.WithTx(func(tx *gorm.DB) error {
		if err := tx.Create(m).Error; err != nil {
			return err
		}
		return csvc.RecalculateTotalAmount(tx, m.ContractID)
	})
}

func (s *ContractMenuService) Update(m *model.ContractMenu) error {
	return s.UpdateWithUser(m, "")
}

func contractMenuStatusLogMessage(menuName, from, to string) string {
	if menuName == "" {
		menuName = "協賛メニュー"
	}
	return menuName + "のステータスを「" + label.ContractMenuStatus(from) + "」から「" + label.ContractMenuStatus(to) + "」に更新"
}

// UpdateWithUser updates the contract menu and, if status changed, writes one
// ActivityLog (spec/domain.md#Activity Log — every Contract Menu status
// transition, not only SUBMITTED). Same-status PATCHes write nothing.
func (s *ContractMenuService) UpdateWithUser(m *model.ContractMenu, userID string) error {
	csvc := NewContractService()
	return db.WithTx(func(tx *gorm.DB) error {
		var existing model.ContractMenu
		if err := tx.First(&existing, "id = ?", m.ID).Error; err != nil {
			return err
		}
		statusChanged := existing.Status != m.Status
		var fileCount int64
		if err := tx.Model(&model.ContractMenuDriveFile{}).
			Where("contract_menu_id = ?", m.ID).Count(&fileCount).Error; err != nil {
			return err
		}
		if (fileCount > 0 && m.Status != "SUBMITTED") || (fileCount == 0 && m.Status == "SUBMITTED") {
			return ErrSubmittedStateConflict
		}
		m.CreatedAt = existing.CreatedAt
		if m.IsGoodsSponsorship {
			m.UnitPrice = decimal.Zero
		}
		if err := tx.Omit("Files").Save(m).Error; err != nil {
			return err
		}
		if err := csvc.RecalculateTotalAmount(tx, m.ContractID); err != nil {
			return err
		}
		if !statusChanged {
			return nil
		}
		var contract model.SponsorshipContract
		if err := tx.First(&contract, "id = ?", m.ContractID).Error; err != nil {
			return err
		}
		menuName := "協賛メニュー"
		var smenu model.SponsorshipMenu
		if err := tx.First(&smenu, "id = ?", existing.SponsorshipMenuID).Error; err == nil && smenu.Name != "" {
			menuName = smenu.Name
		}
		al := &model.ActivityLog{
			YearlyCompanyID: contract.YearlyCompanyID,
			UserID:          userID,
			Action:          model.EventContractMenuStatusUpdated,
			Description:     contractMenuStatusLogMessage(menuName, existing.Status, m.Status),
			CreatedAt:       time.Now(),
		}
		return tx.Create(al).Error
	})
}

func (s *ContractMenuService) Delete(id string) error {
	csvc := NewContractService()
	return db.WithTx(func(tx *gorm.DB) error {
		var existing model.ContractMenu
		if err := tx.First(&existing, "id = ?", id).Error; err != nil {
			return err
		}
		if err := tx.Unscoped().Delete(&existing).Error; err != nil {
			return err
		}
		return csvc.RecalculateTotalAmount(tx, existing.ContractID)
	})
}

func (s *ContractMenuService) GetByID(id string) (*model.ContractMenu, error) {
	return s.repo.GetByID(id)
}

func (s *ContractMenuService) PatchDetails(id string, quantity *int, unitPrice *decimal.Decimal, isGoodsSponsorship *bool, productionType *string) (*model.ContractMenu, error) {
	csvc := NewContractService()
	var m model.ContractMenu

	err := db.WithTx(func(tx *gorm.DB) error {
		if err := tx.First(&m, "id = ?", id).Error; err != nil {
			return err
		}

		if quantity != nil {
			m.Quantity = *quantity
		}
		if productionType != nil {
			m.ProductionType = *productionType
		}

		wasGoods := m.IsGoodsSponsorship
		if isGoodsSponsorship != nil {
			m.IsGoodsSponsorship = *isGoodsSponsorship
		}

		unitPriceProvided := unitPrice != nil
		if unitPriceProvided {
			m.UnitPrice = *unitPrice
		}

		// Apply defaulting logic for UnitPrice analogous to POST endpoint
		if m.IsGoodsSponsorship {
			m.UnitPrice = decimal.Zero
		} else if !unitPriceProvided && isGoodsSponsorship != nil && !*isGoodsSponsorship && wasGoods {
			// Transitioning FROM goods sponsorship TO non-goods, and NO price specified
			smsvc := NewSponsorshipMenuService()
			smenu, err := smsvc.GetByID(m.SponsorshipMenuID)
			if err != nil {
				return err
			}
			m.UnitPrice = smenu.DefaultPrice
		}

		if err := tx.Omit("Files").Save(&m).Error; err != nil {
			return err
		}
		return csvc.RecalculateTotalAmount(tx, m.ContractID)
	})

	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (s *ContractMenuService) ListFiles(contractMenuID string) ([]model.ContractMenuDriveFile, error) {
	if _, err := s.repo.GetByID(contractMenuID); err != nil {
		return nil, err
	}
	return s.repo.ListFiles(contractMenuID)
}

// EnsureFilesWritable rejects every material mutation after its Year becomes
// historical. Handlers call it before performing an external Drive upload;
// mutation methods repeat the check in their database transaction.
func (s *ContractMenuService) EnsureFilesWritable(contractMenuID string) error {
	return ensureContractMenuActiveYear(db.DB, contractMenuID)
}

func (s *ContractMenuService) AddFiles(contractMenuID string, inputs []ContractMenuDriveFileInput) (*model.ContractMenu, error) {
	return s.addFiles(contractMenuID, inputs, nil)
}

func (s *ContractMenuService) AddUploadedFiles(contractMenuID, driveFolderID string, inputs []ContractMenuDriveFileInput) (*model.ContractMenu, error) {
	return s.addFiles(contractMenuID, inputs, &driveFolderID)
}

func (s *ContractMenuService) addFiles(contractMenuID string, inputs []ContractMenuDriveFileInput, driveFolderID *string) (*model.ContractMenu, error) {
	if len(inputs) == 0 {
		return nil, fmt.Errorf("%w: at least one file is required", ErrInvalidDriveFile)
	}
	for i := range inputs {
		inputs[i].DriveURL = strings.TrimSpace(inputs[i].DriveURL)
		inputs[i].DriveFileName = strings.TrimSpace(inputs[i].DriveFileName)
		if inputs[i].DriveURL == "" || inputs[i].DriveFileName == "" {
			return nil, fmt.Errorf("%w: driveUrl and driveFileName are required", ErrInvalidDriveFile)
		}
	}

	err := db.WithTx(func(tx *gorm.DB) error {
		if err := ensureContractMenuActiveYear(tx, contractMenuID); err != nil {
			return err
		}
		now := time.Now()
		for _, input := range inputs {
			file := &model.ContractMenuDriveFile{
				ContractMenuID: contractMenuID,
				DriveURL:       input.DriveURL,
				DriveFileName:  input.DriveFileName,
			}
			if err := tx.Create(file).Error; err != nil {
				return err
			}
		}
		updates := map[string]interface{}{
			"status":       "SUBMITTED",
			"submitted_at": gorm.Expr("COALESCE(submitted_at, ?)", now),
		}
		if driveFolderID != nil {
			updates["drive_folder_id"] = *driveFolderID
		}
		return tx.Model(&model.ContractMenu{}).Where("id = ?", contractMenuID).Updates(updates).Error
	})
	if err != nil {
		return nil, err
	}
	return s.GetByID(contractMenuID)
}

func (s *ContractMenuService) UpdateFile(contractMenuID, fileID string, driveURL, driveFileName *string) (*model.ContractMenuDriveFile, error) {
	if driveURL == nil && driveFileName == nil {
		return nil, fmt.Errorf("%w: driveUrl or driveFileName is required", ErrInvalidDriveFile)
	}
	updates := map[string]interface{}{}
	if driveURL != nil {
		value := strings.TrimSpace(*driveURL)
		if value == "" {
			return nil, fmt.Errorf("%w: driveUrl must not be empty", ErrInvalidDriveFile)
		}
		updates["drive_url"] = value
	}
	if driveFileName != nil {
		value := strings.TrimSpace(*driveFileName)
		if value == "" {
			return nil, fmt.Errorf("%w: driveFileName must not be empty", ErrInvalidDriveFile)
		}
		updates["drive_file_name"] = value
	}

	var file model.ContractMenuDriveFile
	err := db.WithTx(func(tx *gorm.DB) error {
		if err := ensureContractMenuActiveYear(tx, contractMenuID); err != nil {
			return err
		}
		if err := tx.First(&file, "id = ? AND contract_menu_id = ?", fileID, contractMenuID).Error; err != nil {
			return err
		}
		if err := tx.Model(&file).Updates(updates).Error; err != nil {
			return err
		}
		return tx.First(&file, "id = ?", file.ID).Error
	})
	return &file, err
}

func (s *ContractMenuService) DeleteFile(contractMenuID, fileID string) (*model.ContractMenu, error) {
	err := db.WithTx(func(tx *gorm.DB) error {
		if err := ensureContractMenuActiveYear(tx, contractMenuID); err != nil {
			return err
		}
		var file model.ContractMenuDriveFile
		if err := tx.First(&file, "id = ? AND contract_menu_id = ?", fileID, contractMenuID).Error; err != nil {
			return err
		}
		if err := tx.Delete(&file).Error; err != nil {
			return err
		}
		var remaining int64
		if err := tx.Model(&model.ContractMenuDriveFile{}).
			Where("contract_menu_id = ?", contractMenuID).Count(&remaining).Error; err != nil {
			return err
		}
		if remaining == 0 {
			return tx.Model(&model.ContractMenu{}).Where("id = ?", contractMenuID).
				Updates(map[string]interface{}{"status": "WAITING", "submitted_at": nil}).Error
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.GetByID(contractMenuID)
}

func (s *ContractMenuService) UpdateLegacyProduction(contractMenuID string, remarks *string, file *ContractMenuDriveFileInput) (*model.ContractMenu, error) {
	if remarks == nil && file == nil {
		return s.GetByID(contractMenuID)
	}
	if file != nil {
		file.DriveURL = strings.TrimSpace(file.DriveURL)
		file.DriveFileName = strings.TrimSpace(file.DriveFileName)
		if file.DriveURL == "" || file.DriveFileName == "" {
			return nil, fmt.Errorf("%w: driveUrl and driveFileName are required", ErrInvalidDriveFile)
		}
	}
	err := db.WithTx(func(tx *gorm.DB) error {
		if err := ensureContractMenuActiveYear(tx, contractMenuID); err != nil {
			return err
		}
		if remarks != nil {
			if err := tx.Model(&model.ContractMenu{}).Where("id = ?", contractMenuID).
				Update("remarks", *remarks).Error; err != nil {
				return err
			}
		}
		if file == nil {
			return nil
		}
		if err := tx.Create(&model.ContractMenuDriveFile{
			ContractMenuID: contractMenuID,
			DriveURL:       file.DriveURL,
			DriveFileName:  file.DriveFileName,
		}).Error; err != nil {
			return err
		}
		return tx.Model(&model.ContractMenu{}).Where("id = ?", contractMenuID).
			Updates(map[string]interface{}{
				"status":       "SUBMITTED",
				"submitted_at": gorm.Expr("COALESCE(submitted_at, ?)", time.Now()),
			}).Error
	})
	if err != nil {
		return nil, err
	}
	return s.GetByID(contractMenuID)
}

func ensureContractMenuActiveYear(tx *gorm.DB, contractMenuID string) error {
	var row struct {
		IsActive bool `gorm:"column:is_active"`
	}
	err := tx.Table("contract_menus").
		Select("years.is_active").
		Joins("JOIN sponsorship_contracts ON sponsorship_contracts.id = contract_menus.contract_id AND sponsorship_contracts.deleted_at IS NULL").
		Joins("JOIN yearly_companies ON yearly_companies.id = sponsorship_contracts.yearly_company_id AND yearly_companies.deleted_at IS NULL").
		Joins("JOIN years ON years.id = yearly_companies.year_id AND years.deleted_at IS NULL").
		Where("contract_menus.id = ? AND contract_menus.deleted_at IS NULL", contractMenuID).
		Take(&row).Error
	if err != nil {
		return err
	}
	if !row.IsActive {
		return ErrPastYearReadOnly
	}
	return nil
}
