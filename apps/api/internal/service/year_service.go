package service

import (
	"errors"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"gorm.io/gorm"
)

type YearService struct {
	repo *repository.YearRepository
}

func NewYearService() *YearService {
	return &YearService{repo: repository.NewYearRepository()}
}

func (s *YearService) List() ([]model.Year, error) {
	return s.repo.List()
}

func (s *YearService) NameExists(name string) (bool, error) {
	return s.repo.NameExists(name)
}

func (s *YearService) Create(y *model.Year) error {
	return db.WithTx(func(tx *gorm.DB) error {
		var preceding model.Year
		err := tx.Where("end_date < ?", y.StartDate).
			Order("end_date DESC").
			First(&preceding).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		precedingID := preceding.ID
		if precedingID != "" {
			copyDocumentIssuer(y, &preceding)
		}

		if err := tx.Model(&model.Year{}).Where("1 = 1").Update("is_active", false).Error; err != nil {
			return err
		}

		y.IsActive = true
		if err := tx.Create(y).Error; err != nil {
			return err
		}

		var companies []model.Company
		if err := tx.Find(&companies).Error; err != nil {
			return err
		}

		for _, c := range companies {
			status := "NEW"
			if precedingID != "" {
				var count int64
				if err := tx.Table("yearly_companies").
					Joins("JOIN sponsorship_contracts ON sponsorship_contracts.yearly_company_id = yearly_companies.id").
					Where("yearly_companies.company_id = ? AND yearly_companies.year_id = ?", c.ID, precedingID).
					Count(&count).Error; err != nil {
					return err
				}
				if count > 0 {
					status = "CONTINUING"
				}
			}

			yc := &model.YearlyCompany{
				YearID:        y.ID,
				CompanyID:     c.ID,
				CompanyStatus: status,
				Phase:         "PHASE_3",
				Progress:      "NOT_CONTACTED",
			}
			model.CopyContactFromCompany(yc, &c)
			if err := tx.Create(yc).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

type DocumentIssuerInput struct {
	IssuerName            *string `json:"issuerName"`
	IssuerPostalCode      *string `json:"issuerPostalCode"`
	IssuerAddressLine1    *string `json:"issuerAddressLine1"`
	IssuerAddressLine2    *string `json:"issuerAddressLine2"`
	IssuerEmail           *string `json:"issuerEmail"`
	BankName              *string `json:"bankName"`
	BankBranchName        *string `json:"bankBranchName"`
	BankAccountType       *string `json:"bankAccountType"`
	BankAccountNumber     *string `json:"bankAccountNumber"`
	BankAccountHolderName *string `json:"bankAccountHolderName"`
}

func (s *YearService) UpdateDocumentIssuer(yearID string, input DocumentIssuerInput) (*model.Year, error) {
	year, err := s.repo.GetByID(yearID)
	if err != nil {
		return nil, err
	}

	updates := make(map[string]interface{})
	if input.IssuerName != nil {
		updates["issuer_name"] = *input.IssuerName
	}
	if input.IssuerPostalCode != nil {
		updates["issuer_postal_code"] = *input.IssuerPostalCode
	}
	if input.IssuerAddressLine1 != nil {
		updates["issuer_address_line1"] = *input.IssuerAddressLine1
	}
	if input.IssuerAddressLine2 != nil {
		updates["issuer_address_line2"] = *input.IssuerAddressLine2
	}
	if input.IssuerEmail != nil {
		updates["issuer_email"] = *input.IssuerEmail
	}
	if input.BankName != nil {
		updates["bank_name"] = *input.BankName
	}
	if input.BankBranchName != nil {
		updates["bank_branch_name"] = *input.BankBranchName
	}
	if input.BankAccountType != nil {
		updates["bank_account_type"] = *input.BankAccountType
	}
	if input.BankAccountNumber != nil {
		updates["bank_account_number"] = *input.BankAccountNumber
	}
	if input.BankAccountHolderName != nil {
		updates["bank_account_holder_name"] = *input.BankAccountHolderName
	}
	if len(updates) == 0 {
		return year, nil
	}
	if err := db.DB.Model(&model.Year{}).Where("id = ?", yearID).Updates(updates).Error; err != nil {
		return nil, err
	}
	return s.repo.GetByID(yearID)
}

func copyDocumentIssuer(target, source *model.Year) {
	target.IssuerName = source.IssuerName
	target.IssuerPostalCode = source.IssuerPostalCode
	target.IssuerAddressLine1 = source.IssuerAddressLine1
	target.IssuerAddressLine2 = source.IssuerAddressLine2
	target.IssuerEmail = source.IssuerEmail
	target.BankName = source.BankName
	target.BankBranchName = source.BankBranchName
	target.BankAccountType = source.BankAccountType
	target.BankAccountNumber = source.BankAccountNumber
	target.BankAccountHolderName = source.BankAccountHolderName
}
