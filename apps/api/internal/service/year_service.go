package service

import (
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

func (s *YearService) Create(y *model.Year) error {
	return db.WithTx(func(tx *gorm.DB) error {
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

		precedingID, _ := findPrecedingYearID(tx, y.ID)

		for _, c := range companies {
			status := "NEW"
			if precedingID != "" {
				var count int64
				tx.Table("yearly_companies").
					Joins("JOIN sponsorship_contracts ON sponsorship_contracts.yearly_company_id = yearly_companies.id").
					Where("yearly_companies.company_id = ? AND yearly_companies.year_id = ?", c.ID, precedingID).
					Count(&count)
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
			if err := tx.Create(yc).Error; err != nil {
				return err
			}
		}

		return nil
	})
}
