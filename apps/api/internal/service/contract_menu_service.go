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

	// ErrInvalidContractMenu is a Contract Menu input that is malformed by
	// itself (missing sponsorshipMenuId, quantity < 1, negative unitPrice).
	ErrInvalidContractMenu = errors.New("invalid contract menu")
	// ErrSponsorshipMenuNotFound is a sponsorshipMenuId that does not exist.
	ErrSponsorshipMenuNotFound = errors.New("sponsorship menu not found")
	// ErrSponsorshipMenuYearMismatch is a Sponsorship Menu of another Year.
	ErrSponsorshipMenuYearMismatch = errors.New("sponsorship menu year does not match contract year")
	// ErrSponsorshipMenuInactive is a Sponsorship Menu with isActive = false
	// (spec/api.md#Add Contract Menu).
	ErrSponsorshipMenuInactive = errors.New("sponsorship menu is not active")
)

// ContractMenuInput is one Contract Menu line of Create Contract or
// Add Contract Menu (spec/api.md#Add Contract Menu).
type ContractMenuInput struct {
	SponsorshipMenuID string
	Quantity          int
	// UnitPrice nil means "use SponsorshipMenu.defaultPrice".
	UnitPrice          *decimal.Decimal
	IsGoodsSponsorship bool
	// ProductionType is nil for a Sponsorship Menu that does not require
	// submission.
	ProductionType *string
	Remarks        string
	// Status defaults to COMPLETED for CONTINUED and WAITING otherwise
	// (development seed sets others).
	Status string
}

// ProductionTypeContinued is a Contract Menu that uses an advertisement from
// an earlier Year again; its production is already complete.
const ProductionTypeContinued = "CONTINUED"

// ProductionTypes are the ContractMenuProductionType codes
// (spec/model.md#ContractMenuProductionType).
var ProductionTypes = []string{"COMPANY", "INTERNAL", ProductionTypeContinued}

// InvalidProductionTypeError is a productionType that breaks the rule. Its
// message is a Japanese sentence for the user; it also matches
// ErrInvalidContractMenu with errors.Is.
type InvalidProductionTypeError struct {
	Message string
}

func (e *InvalidProductionTypeError) Error() string { return e.Message }

func (e *InvalidProductionTypeError) Is(target error) bool { return target == ErrInvalidContractMenu }

// checkProductionType applies the rule: one of ProductionTypes when the
// Sponsorship Menu requires submission, nil when it does not
// (spec/model.md#ContractMenuProductionType).
func checkProductionType(sponsorshipMenu *model.SponsorshipMenu, productionType *string) error {
	if !sponsorshipMenu.RequiresSubmission {
		if productionType != nil {
			return &InvalidProductionTypeError{fmt.Sprintf("提出不要の協賛メニュー「%s」には制作区分を指定できません", sponsorshipMenu.Name)}
		}
		return nil
	}
	if productionType == nil {
		return &InvalidProductionTypeError{fmt.Sprintf("協賛メニュー「%s」の制作区分（企業・委員・継続）を指定してください", sponsorshipMenu.Name)}
	}
	for _, code := range ProductionTypes {
		if *productionType == code {
			return nil
		}
	}
	return &InvalidProductionTypeError{fmt.Sprintf("制作区分「%s」は指定できません。企業・委員・継続のいずれかを指定してください", *productionType)}
}

func (input ContractMenuInput) validate() error {
	if strings.TrimSpace(input.SponsorshipMenuID) == "" {
		return fmt.Errorf("%w: sponsorshipMenuId is required", ErrInvalidContractMenu)
	}
	if input.Quantity < 1 {
		return fmt.Errorf("%w: quantity must be >= 1", ErrInvalidContractMenu)
	}
	if input.UnitPrice != nil && input.UnitPrice.IsNegative() {
		return fmt.Errorf("%w: unitPrice must be non-negative", ErrInvalidContractMenu)
	}
	return nil
}

// buildContractMenu checks one input against its Sponsorship Menu and applies
// the unitPrice defaults. It does not save anything.
func buildContractMenu(tx *gorm.DB, contractID, contractYearID string, input ContractMenuInput) (*model.ContractMenu, *model.SponsorshipMenu, error) {
	if err := input.validate(); err != nil {
		return nil, nil, err
	}
	var sponsorshipMenu model.SponsorshipMenu
	if err := tx.First(&sponsorshipMenu, "id = ?", input.SponsorshipMenuID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrSponsorshipMenuNotFound
		}
		return nil, nil, err
	}
	if sponsorshipMenu.YearID != contractYearID {
		return nil, nil, ErrSponsorshipMenuYearMismatch
	}
	if !sponsorshipMenu.IsActive {
		return nil, nil, ErrSponsorshipMenuInactive
	}
	if err := checkProductionType(&sponsorshipMenu, input.ProductionType); err != nil {
		return nil, nil, err
	}

	contractMenu := &model.ContractMenu{
		ContractID:         contractID,
		SponsorshipMenuID:  input.SponsorshipMenuID,
		Quantity:           input.Quantity,
		IsGoodsSponsorship: input.IsGoodsSponsorship,
		ProductionType:     input.ProductionType,
		Remarks:            input.Remarks,
		Status:             input.Status,
	}
	if contractMenu.Status == "" {
		contractMenu.Status = "WAITING"
		// A Continued advertisement was produced in an earlier Year.
		if input.ProductionType != nil && *input.ProductionType == ProductionTypeContinued {
			contractMenu.Status = "COMPLETED"
		}
	}
	switch {
	case input.IsGoodsSponsorship:
		contractMenu.UnitPrice = decimal.Zero
	case input.UnitPrice != nil:
		contractMenu.UnitPrice = *input.UnitPrice
	default:
		contractMenu.UnitPrice = sponsorshipMenu.DefaultPrice
	}
	return contractMenu, &sponsorshipMenu, nil
}

type ContractMenuDriveFileInput struct {
	DriveFileID   *string
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

// Add adds one Contract Menu to an existing contract, recalculates the total
// (with Payment synchronization), and writes CONTRACT_MENU_ADDED.
func (s *ContractMenuService) Add(contractID string, input ContractMenuInput, userID string) (*model.ContractMenu, error) {
	csvc := NewContractService()
	var created *model.ContractMenu
	err := db.WithTx(func(tx *gorm.DB) error {
		var contract model.SponsorshipContract
		if err := tx.First(&contract, "id = ?", contractID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrContractNotFound
			}
			return err
		}
		var yearlyCompany model.YearlyCompany
		if err := tx.First(&yearlyCompany, "id = ?", contract.YearlyCompanyID).Error; err != nil {
			return err
		}
		contractMenu, sponsorshipMenu, err := buildContractMenu(tx, contractID, yearlyCompany.YearID, input)
		if err != nil {
			return err
		}
		if err := tx.Omit("Files").Create(contractMenu).Error; err != nil {
			return err
		}
		if _, err := csvc.RecalculateTotalAmount(tx, contractID, userID); err != nil {
			return err
		}
		created = contractMenu
		return writeActivityLog(tx, contract.YearlyCompanyID, userID, model.EventContractMenuAdded,
			contractMenuAddedMessage(sponsorshipMenu.Name, contractMenu))
	})
	if err != nil {
		return nil, err
	}
	return created, nil
}

func contractMenuAddedMessage(menuName string, contractMenu *model.ContractMenu) string {
	if contractMenu.IsGoodsSponsorship {
		return fmt.Sprintf("「%s」を物品協賛として追加（数量 %d）", menuName, contractMenu.Quantity)
	}
	return fmt.Sprintf("「%s」を追加（数量 %d、単価 %s）", menuName, contractMenu.Quantity, label.Yen(contractMenu.UnitPrice))
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
		if _, err := csvc.RecalculateTotalAmount(tx, m.ContractID, userID); err != nil {
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

// Delete removes a Contract Menu, recalculates the total (which may remove a
// WAITING Payment), and writes CONTRACT_MENU_REMOVED.
func (s *ContractMenuService) Delete(id, userID string) error {
	csvc := NewContractService()
	return db.WithTx(func(tx *gorm.DB) error {
		var existing model.ContractMenu
		if err := tx.First(&existing, "id = ?", id).Error; err != nil {
			return err
		}
		logContext, err := loadContractMenuFileLogContext(tx, id)
		if err != nil {
			return err
		}
		if err := tx.Unscoped().Delete(&existing).Error; err != nil {
			return err
		}
		if err := writeActivityLog(tx, logContext.YearlyCompanyID, userID, model.EventContractMenuRemoved,
			fmt.Sprintf("「%s」を削除", logContext.MenuName)); err != nil {
			return err
		}
		_, err = csvc.RecalculateTotalAmount(tx, existing.ContractID, userID)
		return err
	})
}

func (s *ContractMenuService) GetByID(id string) (*model.ContractMenu, error) {
	return s.repo.GetByID(id)
}

// ProductionTypeChange is the productionType of an Update Contract Menu
// request. Sent is false when the field was omitted (keep the stored value);
// Sent with a nil Value is an explicit null (clear it).
type ProductionTypeChange struct {
	Sent  bool
	Value *string
}

// PatchDetails edits quantity, unitPrice, isGoodsSponsorship, and
// productionType. A sent productionType must satisfy the rule against the
// Sponsorship Menu's current requiresSubmission; an update without it is
// accepted even when the stored value no longer matches
// (spec/model.md#ContractMenuProductionType). It writes one
// CONTRACT_MENU_UPDATED when quantity or unitPrice actually changes
// (productionType is not recorded).
func (s *ContractMenuService) PatchDetails(id string, quantity *int, unitPrice *decimal.Decimal, isGoodsSponsorship *bool, productionType ProductionTypeChange, userID string) (*model.ContractMenu, error) {
	csvc := NewContractService()
	var m model.ContractMenu

	err := db.WithTx(func(tx *gorm.DB) error {
		if err := tx.First(&m, "id = ?", id).Error; err != nil {
			return err
		}

		previousQuantity := m.Quantity
		previousUnitPrice := m.UnitPrice

		if quantity != nil {
			m.Quantity = *quantity
		}
		if productionType.Sent {
			var sponsorshipMenu model.SponsorshipMenu
			if err := tx.First(&sponsorshipMenu, "id = ?", m.SponsorshipMenuID).Error; err != nil {
				return err
			}
			if err := checkProductionType(&sponsorshipMenu, productionType.Value); err != nil {
				return err
			}
			m.ProductionType = productionType.Value
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
		if _, err := csvc.RecalculateTotalAmount(tx, m.ContractID, userID); err != nil {
			return err
		}

		changes := []string{}
		if m.Quantity != previousQuantity {
			changes = append(changes, fmt.Sprintf("数量を「%d」から「%d」に", previousQuantity, m.Quantity))
		}
		if !m.UnitPrice.Equal(previousUnitPrice) {
			changes = append(changes, fmt.Sprintf("単価を「%s」から「%s」に", label.Yen(previousUnitPrice), label.Yen(m.UnitPrice)))
		}
		if len(changes) == 0 {
			return nil
		}
		logContext, err := loadContractMenuFileLogContext(tx, m.ID)
		if err != nil {
			return err
		}
		return writeActivityLog(tx, logContext.YearlyCompanyID, userID, model.EventContractMenuUpdated,
			fmt.Sprintf("「%s」の%s更新", logContext.MenuName, strings.Join(changes, "、")))
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

func (s *ContractMenuService) AddFiles(contractMenuID string, inputs []ContractMenuDriveFileInput, userID string) (*model.ContractMenu, error) {
	return s.addFiles(contractMenuID, inputs, nil, userID)
}

func (s *ContractMenuService) AddUploadedFiles(contractMenuID, driveFolderID string, inputs []ContractMenuDriveFileInput, userID string) (*model.ContractMenu, error) {
	return s.addFiles(contractMenuID, inputs, &driveFolderID, userID)
}

func (s *ContractMenuService) addFiles(contractMenuID string, inputs []ContractMenuDriveFileInput, driveFolderID *string, userID string) (*model.ContractMenu, error) {
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
		logContext, err := loadContractMenuFileLogContext(tx, contractMenuID)
		if err != nil {
			return err
		}
		now := time.Now()
		for _, input := range inputs {
			file := &model.ContractMenuDriveFile{
				ContractMenuID: contractMenuID,
				DriveFileID:    input.DriveFileID,
				DriveURL:       input.DriveURL,
				DriveFileName:  input.DriveFileName,
			}
			if err := tx.Create(file).Error; err != nil {
				return err
			}
			if userID != "" {
				if err := tx.Create(&model.ActivityLog{
					YearlyCompanyID: logContext.YearlyCompanyID,
					UserID:          userID,
					Action:          model.EventAdMaterialUploaded,
					Description:     fmt.Sprintf("%sの広告資料「%s」をアップロード", logContext.MenuName, file.DriveFileName),
					CreatedAt:       now,
				}).Error; err != nil {
					return err
				}
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

func (s *ContractMenuService) GetFileForDeletion(contractMenuID, fileID string) (*model.ContractMenuDriveFile, error) {
	if err := ensureContractMenuActiveYear(db.DB, contractMenuID); err != nil {
		return nil, err
	}
	var file model.ContractMenuDriveFile
	if err := db.DB.First(&file, "id = ? AND contract_menu_id = ?", fileID, contractMenuID).Error; err != nil {
		return nil, err
	}
	return &file, nil
}

func (s *ContractMenuService) DeleteFile(contractMenuID, fileID, driveFileID, userID string) (*model.ContractMenu, error) {
	err := db.WithTx(func(tx *gorm.DB) error {
		if err := ensureContractMenuActiveYear(tx, contractMenuID); err != nil {
			return err
		}
		var file model.ContractMenuDriveFile
		if err := tx.First(&file, "id = ? AND contract_menu_id = ?", fileID, contractMenuID).Error; err != nil {
			return err
		}
		logContext, err := loadContractMenuFileLogContext(tx, contractMenuID)
		if err != nil {
			return err
		}
		file.DriveFileID = &driveFileID
		if err := tx.Model(&file).Update("drive_file_id", driveFileID).Error; err != nil {
			return err
		}
		if err := tx.Delete(&file).Error; err != nil {
			return err
		}
		if userID != "" {
			if err := tx.Create(&model.ActivityLog{
				YearlyCompanyID: logContext.YearlyCompanyID,
				UserID:          userID,
				Action:          model.EventAdMaterialTrashed,
				Description:     fmt.Sprintf("%sの広告資料「%s」をゴミ箱へ移動", logContext.MenuName, file.DriveFileName),
				CreatedAt:       time.Now(),
			}).Error; err != nil {
				return err
			}
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

func (s *ContractMenuService) UpdateLegacyProduction(contractMenuID string, remarks *string, file *ContractMenuDriveFileInput, userID string) (*model.ContractMenu, error) {
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
		created := &model.ContractMenuDriveFile{
			ContractMenuID: contractMenuID,
			DriveFileID:    file.DriveFileID,
			DriveURL:       file.DriveURL,
			DriveFileName:  file.DriveFileName,
		}
		if err := tx.Create(created).Error; err != nil {
			return err
		}
		if userID != "" {
			logContext, err := loadContractMenuFileLogContext(tx, contractMenuID)
			if err != nil {
				return err
			}
			if err := tx.Create(&model.ActivityLog{
				YearlyCompanyID: logContext.YearlyCompanyID,
				UserID:          userID,
				Action:          model.EventAdMaterialUploaded,
				Description:     fmt.Sprintf("%sの広告資料「%s」を登録", logContext.MenuName, created.DriveFileName),
				CreatedAt:       time.Now(),
			}).Error; err != nil {
				return err
			}
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

type contractMenuFileLogContext struct {
	YearlyCompanyID string
	MenuName        string
}

func loadContractMenuFileLogContext(tx *gorm.DB, contractMenuID string) (*contractMenuFileLogContext, error) {
	var result contractMenuFileLogContext
	err := tx.Table("contract_menus").
		Select("sponsorship_contracts.yearly_company_id, sponsorship_menus.name AS menu_name").
		Joins("JOIN sponsorship_contracts ON sponsorship_contracts.id = contract_menus.contract_id").
		Joins("JOIN sponsorship_menus ON sponsorship_menus.id = contract_menus.sponsorship_menu_id").
		Where("contract_menus.id = ?", contractMenuID).
		Take(&result).Error
	if err != nil {
		return nil, err
	}
	if result.MenuName == "" {
		result.MenuName = "協賛メニュー"
	}
	return &result, nil
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
