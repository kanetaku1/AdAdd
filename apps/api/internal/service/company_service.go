package service

import (
	"errors"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"gorm.io/gorm"
)

type CompanyService struct {
	repo *repository.CompanyRepository
}

func NewCompanyService() *CompanyService {
	return &CompanyService{repo: repository.NewCompanyRepository()}
}

func (s *CompanyService) ListAll() ([]model.Company, error) {
	return s.repo.ListAll()
}

func (s *CompanyService) Create(c *model.Company) error {
	return s.repo.Create(c)
}

func (s *CompanyService) GetByID(id string) (*model.Company, error) {
	return s.repo.GetByID(id)
}

func (s *CompanyService) Update(c *model.Company) error {
	return s.repo.Update(c)
}

type CompanyCsvRow struct {
	RowNumber            int
	CompanyName          string
	CompanyNameKana      string
	PostalCode           string
	Address              string
	PhoneNumber          string
	Website              string
	ContactPersonName    string
	ContactEmailOrForm   string
	FirstSponsorshipYear string
	Memo                 string
	PreviousYearContract string
}

// CompanyImportRow is one created (or, in preview, to-be-created) Company.
// CompanyStatus is the status its Yearly Company gets in the active Year;
// empty when no Year is active (spec/api.md#Bulk Import Companies).
type CompanyImportRow struct {
	model.Company
	CompanyStatus string `json:"companyStatus,omitempty"`
}

// previousYearContract values accepted in the CSV. Empty means なし.
const (
	previousYearContractYes = "あり"
	previousYearContractNo  = "なし"
)

func (s *CompanyService) BulkImport(rows []CompanyCsvRow, dryRun bool) (*model.BulkResult, error) {
	result := &model.BulkResult{
		TotalCount:     len(rows),
		SuccessCount:   0,
		ErrorCount:     0,
		SuccessfulRows: make([]interface{}, 0),
		Errors:         make([]model.BulkError, 0),
	}

	activeYear, err := repository.NewYearRepository().FindActive()
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	validRows := make([]*CompanyImportRow, 0)
	csvCompanyMap := make(map[string]bool)

	for _, row := range rows {
		if row.CompanyName == "" {
			result.Errors = append(result.Errors, model.BulkError{RowNumber: row.RowNumber, Message: "企業名は必須です"})
			continue
		}
		if row.PreviousYearContract != "" && row.PreviousYearContract != previousYearContractYes && row.PreviousYearContract != previousYearContractNo {
			result.Errors = append(result.Errors, model.BulkError{RowNumber: row.RowNumber, Message: "前年度契約は「あり」「なし」または空欄で指定してください: " + row.PreviousYearContract})
			continue
		}
		if row.PreviousYearContract == previousYearContractYes && activeYear == nil {
			result.Errors = append(result.Errors, model.BulkError{RowNumber: row.RowNumber, Message: "前年度契約を反映する年度がありません。先に年度を作成してください"})
			continue
		}
		if csvCompanyMap[row.CompanyName] {
			result.Errors = append(result.Errors, model.BulkError{RowNumber: row.RowNumber, Message: "CSV内に同じ企業名が存在します"})
			continue
		}

		existing, _ := s.repo.FindByCompanyName(row.CompanyName)
		if existing != nil {
			result.Errors = append(result.Errors, model.BulkError{RowNumber: row.RowNumber, Message: "すでに登録されている企業名です: " + row.CompanyName})
			continue
		}

		csvCompanyMap[row.CompanyName] = true
		importRow := &CompanyImportRow{
			Company: model.Company{
				CompanyName:          row.CompanyName,
				CompanyNameKana:      row.CompanyNameKana,
				PostalCode:           row.PostalCode,
				Address:              row.Address,
				PhoneNumber:          row.PhoneNumber,
				Website:              row.Website,
				ContactPersonName:    row.ContactPersonName,
				ContactEmailOrForm:   row.ContactEmailOrForm,
				FirstSponsorshipYear: row.FirstSponsorshipYear,
				Memo:                 row.Memo,
			},
		}
		if activeYear != nil {
			// History from before AdAdd (spec/domain.md#Company Status): the
			// fact decides the status; the status itself is never input.
			importRow.CompanyStatus = "NEW"
			if row.PreviousYearContract == previousYearContractYes {
				importRow.CompanyStatus = "CONTINUING"
			}
		}
		validRows = append(validRows, importRow)
	}

	if !dryRun && len(validRows) > 0 {
		// All or nothing: a success response means every row was created.
		err := db.WithTx(func(tx *gorm.DB) error {
			for _, r := range validRows {
				if err := tx.Create(&r.Company).Error; err != nil {
					return err
				}
				if activeYear == nil {
					continue
				}
				yc := &model.YearlyCompany{
					YearID:        activeYear.ID,
					CompanyID:     r.Company.ID,
					CompanyStatus: r.CompanyStatus,
					Phase:         "PHASE_3",
					Progress:      "NOT_CONTACTED",
				}
				model.CopyContactFromCompany(yc, &r.Company)
				if err := tx.Create(yc).Error; err != nil {
					return err
				}
			}
			return nil
		})
		if err != nil {
			return nil, err
		}
	}

	for _, r := range validRows {
		result.SuccessfulRows = append(result.SuccessfulRows, r)
	}
	result.SuccessCount = len(validRows)
	result.ErrorCount = len(result.Errors)
	return result, nil
}

// ErrCompanyInUse is returned when deleting a Company that has a Yearly
// Company — its sponsorship history must not be lost (spec/api.md#Delete Company).
var ErrCompanyInUse = errors.New("company has yearly companies")

func (s *CompanyService) Delete(id string) error {
	if _, err := s.repo.GetByID(id); err != nil {
		return err
	}
	inUse, err := s.repo.HasYearlyCompanies(id)
	if err != nil {
		return err
	}
	if inUse {
		return ErrCompanyInUse
	}
	return s.repo.Delete(id)
}
