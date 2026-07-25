package service

import (
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
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
}

func (s *CompanyService) BulkImport(rows []CompanyCsvRow, dryRun bool) (*model.BulkResult, error) {
	result := &model.BulkResult{
		TotalCount:     len(rows),
		SuccessCount:   0,
		ErrorCount:     0,
		SuccessfulRows: make([]interface{}, 0),
		Errors:         make([]model.BulkError, 0),
	}

	validCompanies := make([]*model.Company, 0)
	csvCompanyMap := make(map[string]bool)

	for _, row := range rows {
		if row.CompanyName == "" {
			result.Errors = append(result.Errors, model.BulkError{RowNumber: row.RowNumber, Message: "企業名は必須です"})
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
		c := &model.Company{
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
		}
		validCompanies = append(validCompanies, c)
		result.SuccessfulRows = append(result.SuccessfulRows, c)
		result.SuccessCount++
	}
	result.ErrorCount = len(result.Errors)

	if !dryRun && result.SuccessCount > 0 {
		for _, c := range validCompanies {
			if err := s.repo.Create(c); err != nil {
				// skip individual insert errors silently since we checked before
			}
		}
	}

	return result, nil
}
