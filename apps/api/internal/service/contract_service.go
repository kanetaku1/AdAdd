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
	"gorm.io/gorm/clause"
)

var (
	// ErrContractExists is returned when a YearlyCompany already has a contract
	ErrContractExists = errors.New("contract already exists for this YearlyCompany")
	// ErrYearlyCompanyNotFound is returned when the Yearly Company of a new contract does not exist.
	ErrYearlyCompanyNotFound = errors.New("yearly company not found")
	// ErrContractNotFound is returned when the target contract does not exist.
	ErrContractNotFound = errors.New("contract not found")
	// ErrContractMenusRequired is returned when a contract is created without
	// any Contract Menu (spec/api.md#Create Contract).
	ErrContractMenusRequired = errors.New("contractMenus must contain at least one item")
	// ErrConfirmedPaymentAmountMismatch is returned when a Contract Menu change
	// would alter a Contract total after Finance has confirmed the Payment.
	ErrConfirmedPaymentAmountMismatch = errors.New("confirmed payment amount would no longer match contract total")
)

type ContractService struct {
	repo *repository.ContractRepository
}

func NewContractService() *ContractService {
	return &ContractService{repo: repository.NewContractRepository()}
}

func (s *ContractService) GetByID(id string) (*model.SponsorshipContract, error) {
	return s.repo.GetByID(id)
}

func (s *ContractService) GetByYearlyCompanyID(yearlyCompanyId string) (*model.SponsorshipContract, error) {
	return s.repo.GetByYearlyCompanyID(yearlyCompanyId)
}

// ContractCreationInput is one Create Contract request
// (spec/api.md#Create Contract). totalAmount is not part of it: the server
// calculates it from the Contract Menus.
type ContractCreationInput struct {
	YearlyCompanyID string
	ContractDate    *model.Date
	Remarks         string
	// AssigneeID is the Yearly Company's current CompanyAssignment, never a
	// client value.
	AssigneeID    string
	ContractMenus []ContractMenuInput
	// ContractID fixes the new contract's ID (development seed only).
	ContractID string
}

// CreateWithMenus creates the contract and every Contract Menu in one
// transaction, calculates totalAmount, sets progress to CONFIRMED, and writes
// the Activity Logs. If any Contract Menu is rejected, nothing is created.
func (s *ContractService) CreateWithMenus(input ContractCreationInput, actorUserID string) (*model.SponsorshipContract, error) {
	if len(input.ContractMenus) == 0 {
		return nil, ErrContractMenusRequired
	}
	for i, menuInput := range input.ContractMenus {
		if err := menuInput.validate(); err != nil {
			return nil, fmt.Errorf("contractMenus[%d]: %w", i, err)
		}
	}

	contract := &model.SponsorshipContract{
		ID:              input.ContractID,
		YearlyCompanyID: input.YearlyCompanyID,
		ContractDate:    input.ContractDate,
		AssigneeID:      input.AssigneeID,
		Remarks:         input.Remarks,
	}
	if contract.ContractDate == nil {
		today := model.BusinessDateOf(time.Now())
		contract.ContractDate = &today
	}

	previousProgress := ""
	err := db.WithTx(func(tx *gorm.DB) error {
		var yearlyCompany model.YearlyCompany
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&yearlyCompany, "id = ?", input.YearlyCompanyID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrYearlyCompanyNotFound
			}
			return err
		}
		var existingCount int64
		if err := tx.Model(&model.SponsorshipContract{}).
			Where("yearly_company_id = ?", input.YearlyCompanyID).
			Count(&existingCount).Error; err != nil {
			return err
		}
		if existingCount > 0 {
			return ErrContractExists
		}
		previousProgress = yearlyCompany.Progress

		if err := tx.Create(contract).Error; err != nil {
			return err
		}

		lines := make([]string, 0, len(input.ContractMenus))
		for i, menuInput := range input.ContractMenus {
			contractMenu, sponsorshipMenu, err := buildContractMenu(tx, contract.ID, yearlyCompany.YearID, menuInput)
			if err != nil {
				return fmt.Errorf("contractMenus[%d]: %w", i, err)
			}
			if err := tx.Omit("Files").Create(contractMenu).Error; err != nil {
				return err
			}
			lines = append(lines, contractCreatedLine(sponsorshipMenu.Name, contractMenu))
		}

		total, err := s.RecalculateTotalAmount(tx, contract.ID, actorUserID)
		if err != nil {
			return err
		}
		contract.TotalAmount = total

		if err := tx.Model(&model.YearlyCompany{}).
			Where("id = ?", input.YearlyCompanyID).
			Update("progress", "CONFIRMED").Error; err != nil {
			return err
		}
		if err := writeActivityLog(tx, input.YearlyCompanyID, actorUserID, model.EventContractCreated,
			fmt.Sprintf("契約を作成（%s、合計 %s）", strings.Join(lines, "、"), label.Yen(total))); err != nil {
			return err
		}
		if previousProgress != "CONFIRMED" {
			return writeActivityLog(tx, input.YearlyCompanyID, actorUserID, model.EventProgressUpdated,
				label.StatusChange("進捗", label.Progress(previousProgress), label.Progress("CONFIRMED")))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	NotifyAssigneeOnConfirmedAsync(input.YearlyCompanyID, previousProgress, "CONFIRMED")
	return contract, nil
}

func contractCreatedLine(menuName string, contractMenu *model.ContractMenu) string {
	line := fmt.Sprintf("%s ×%d", menuName, contractMenu.Quantity)
	if contractMenu.IsGoodsSponsorship {
		line += "（物品協賛）"
	}
	return line
}

// ContractUpdateInput is an Update Contract request. A nil field is not changed.
type ContractUpdateInput struct {
	ContractDate *model.Date
	Remarks      *string
}

// Update changes contractDate and/or remarks and writes one CONTRACT_UPDATED
// Activity Log when a value actually changes (spec/api.md#Update Contract).
func (s *ContractService) Update(contractID string, input ContractUpdateInput, actorUserID string) (*model.SponsorshipContract, error) {
	var contract model.SponsorshipContract
	err := db.WithTx(func(tx *gorm.DB) error {
		if err := tx.First(&contract, "id = ?", contractID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrContractNotFound
			}
			return err
		}

		changes := []string{}
		updates := map[string]interface{}{}
		if input.ContractDate != nil && formatContractDate(input.ContractDate) != formatContractDate(contract.ContractDate) {
			changes = append(changes, label.StatusChange("契約日", formatContractDate(contract.ContractDate), formatContractDate(input.ContractDate)))
			updates["contract_date"] = input.ContractDate
			contract.ContractDate = input.ContractDate
		}
		if input.Remarks != nil && *input.Remarks != contract.Remarks {
			changes = append(changes, "契約の備考を更新")
			updates["remarks"] = *input.Remarks
			contract.Remarks = *input.Remarks
		}
		if len(changes) == 0 {
			return nil
		}
		if err := tx.Model(&model.SponsorshipContract{}).Where("id = ?", contractID).Updates(updates).Error; err != nil {
			return err
		}
		return writeActivityLog(tx, contract.YearlyCompanyID, actorUserID, model.EventContractUpdated, strings.Join(changes, "、"))
	})
	if err != nil {
		return nil, err
	}
	return s.repo.GetByID(contractID)
}

func formatContractDate(date *model.Date) string {
	if date == nil {
		return "未設定"
	}
	return time.Time(*date).Format("2006-01-02")
}

// RecalculateTotalAmount sets totalAmount to sum(quantity * unitPrice) of the
// contract's Contract Menus and keeps the Payment consistent with it, in the
// caller's transaction (spec/api.md#Update Contract → Payment synchronization):
//
//   - WAITING Payment, total > 0: its amount follows the total.
//   - WAITING Payment, total = 0: the Payment is deleted, with a
//     PAYMENT_REMOVED Activity Log. The spec rejects this with 409 once
//     receivedAmount is set; AdAdd does not store receivedAmount yet
//     (Issue #171), so every WAITING Payment is in the "null" case.
//   - CONFIRMED Payment whose amount would differ: rejected.
func (s *ContractService) RecalculateTotalAmount(tx *gorm.DB, contractID, actorUserID string) (decimal.Decimal, error) {
	var menus []model.ContractMenu
	if err := tx.Where("contract_id = ?", contractID).Find(&menus).Error; err != nil {
		return decimal.Zero, err
	}
	total := decimal.Zero
	for _, m := range menus {
		line := m.UnitPrice.Mul(decimal.NewFromInt(int64(m.Quantity)))
		total = total.Add(line)
	}

	var payment model.Payment
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("contract_id = ?", contractID).
		First(&payment).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return decimal.Zero, err
	}
	if err == nil {
		switch payment.Status {
		case "WAITING":
			if total.IsZero() {
				if err := removeWaitingPayment(tx, contractID, payment, actorUserID); err != nil {
					return decimal.Zero, err
				}
			} else if err := tx.Model(&model.Payment{}).
				Where("id = ?", payment.ID).
				Updates(map[string]interface{}{
					"amount":     total,
					"updated_at": time.Now(),
				}).Error; err != nil {
				return decimal.Zero, err
			}
		case "CONFIRMED":
			if !payment.Amount.Equal(total) {
				return decimal.Zero, ErrConfirmedPaymentAmountMismatch
			}
		}
	}

	if err := tx.Model(&model.SponsorshipContract{}).
		Where("id = ?", contractID).
		Update("total_amount", total).Error; err != nil {
		return decimal.Zero, err
	}
	return total, nil
}

// removeWaitingPayment deletes the row itself (not a soft delete): contract_id
// is unique on payments, and a Payment must be creatable again if a paid
// Contract Menu is added later. The Activity Log keeps the history.
func removeWaitingPayment(tx *gorm.DB, contractID string, payment model.Payment, actorUserID string) error {
	var contract model.SponsorshipContract
	if err := tx.First(&contract, "id = ?", contractID).Error; err != nil {
		return err
	}
	if err := tx.Unscoped().Delete(&model.Payment{}, "id = ?", payment.ID).Error; err != nil {
		return err
	}
	return writeActivityLog(tx, contract.YearlyCompanyID, actorUserID, model.EventPaymentRemoved,
		fmt.Sprintf("契約金額が0円になったため入金を削除（請求額 %s）", label.Yen(payment.Amount)))
}

func writeActivityLog(tx *gorm.DB, yearlyCompanyID, userID, action, description string) error {
	return tx.Create(&model.ActivityLog{
		YearlyCompanyID: yearlyCompanyID,
		UserID:          userID,
		Action:          action,
		Description:     description,
		CreatedAt:       time.Now(),
	}).Error
}
