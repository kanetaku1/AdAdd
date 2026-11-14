package handler

import (
	"errors"
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

const pastYearReadOnlyMessage = "過去の年度は閲覧のみです（入金確認を除く）"

func PastYearWriteGuard(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if c.Request().Method == http.MethodPatch && c.Path() == "/payments/:paymentId" {
			return next(c)
		}

		yearID, scoped, err := pastYearIDForRequest(c)
		if err != nil {
			return respondInternalServerError(c, err)
		}
		if !scoped || yearID == "" {
			return next(c)
		}

		active, found, err := isActiveYear(yearID)
		if err != nil {
			return respondInternalServerError(c, err)
		}
		if found && !active {
			return respondConflict(c, pastYearReadOnlyMessage)
		}
		return next(c)
	}
}

func RejectPastYearWrite(c echo.Context, yearID string) (bool, error) {
	active, found, err := isActiveYear(yearID)
	if err != nil {
		return false, respondInternalServerError(c, err)
	}
	if found && !active {
		return false, respondConflict(c, pastYearReadOnlyMessage)
	}
	return true, nil
}

func pastYearIDForRequest(c echo.Context) (string, bool, error) {
	if c.Request().Method == http.MethodGet ||
		c.Request().Method == http.MethodHead ||
		c.Request().Method == http.MethodOptions {
		return "", false, nil
	}

	path := c.Path()
	switch path {
	case "/years/:yearId":
		if c.Request().Method == http.MethodPatch {
			return c.Param("yearId"), true, nil
		}
	case "/years/:yearId/document-issuer",
		"/years/:yearId/companies",
		"/years/:yearId/sponsorship-menus",
		"/years/:yearId/sponsorship-menus/copy-from-previous-year":
		return c.Param("yearId"), true, nil
	case "/yearly-companies/:id/company-status",
		"/yearly-companies/:id/phase",
		"/yearly-companies/:id/progress",
		"/yearly-companies/:id/company-contact",
		"/yearly-companies/:id/assignments",
		"/yearly-companies/:id/contract":
		yearID, err := yearlyCompanyYearID(c.Param("id"))
		return yearID, true, err
	case "/contracts/:contractId",
		"/contracts/:contractId/menus",
		"/contracts/:contractId/payment":
		yearID, err := contractYearID(c.Param("contractId"))
		return yearID, true, err
	case "/contract-menus/:id",
		"/contract-menus/:id/status",
		"/contract-menus/:id/production",
		"/contract-menus/:id/drive-upload",
		"/contract-menus/:id/production/files",
		"/contract-menus/:id/production/files/:fileId",
		"/contract-menus/:id/files/:fileId":
		yearID, err := contractMenuYearID(c.Param("id"))
		return yearID, true, err
	case "/sponsorship-menus/:menuId":
		yearID, err := sponsorshipMenuYearID(c.Param("menuId"))
		return yearID, true, err
	case "/advisor-assignments/:id":
		yearID, err := advisorAssignmentYearID(c.Param("id"))
		return yearID, true, err
	}
	return "", false, nil
}

func isActiveYear(yearID string) (bool, bool, error) {
	var row struct {
		IsActive bool `gorm:"column:is_active"`
	}
	err := db.DB.Table("years").
		Select("is_active").
		Where("id = ? AND deleted_at IS NULL", yearID).
		Take(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, false, nil
	}
	if err != nil {
		return false, false, err
	}
	return row.IsActive, true, nil
}

func yearlyCompanyYearID(yearlyCompanyID string) (string, error) {
	var yearID string
	err := db.DB.Table("yearly_companies").
		Select("year_id").
		Where("id = ? AND deleted_at IS NULL", yearlyCompanyID).
		Scan(&yearID).Error
	return yearID, err
}

func contractYearID(contractID string) (string, error) {
	var yearID string
	err := db.DB.Table("sponsorship_contracts").
		Select("yearly_companies.year_id").
		Joins("JOIN yearly_companies ON yearly_companies.id = sponsorship_contracts.yearly_company_id AND yearly_companies.deleted_at IS NULL").
		Where("sponsorship_contracts.id = ? AND sponsorship_contracts.deleted_at IS NULL", contractID).
		Scan(&yearID).Error
	return yearID, err
}

func contractMenuYearID(contractMenuID string) (string, error) {
	var yearID string
	err := db.DB.Table("contract_menus").
		Select("yearly_companies.year_id").
		Joins("JOIN sponsorship_contracts ON sponsorship_contracts.id = contract_menus.contract_id AND sponsorship_contracts.deleted_at IS NULL").
		Joins("JOIN yearly_companies ON yearly_companies.id = sponsorship_contracts.yearly_company_id AND yearly_companies.deleted_at IS NULL").
		Where("contract_menus.id = ? AND contract_menus.deleted_at IS NULL", contractMenuID).
		Scan(&yearID).Error
	return yearID, err
}

func sponsorshipMenuYearID(menuID string) (string, error) {
	var yearID string
	err := db.DB.Table("sponsorship_menus").
		Select("year_id").
		Where("id = ? AND deleted_at IS NULL", menuID).
		Scan(&yearID).Error
	return yearID, err
}

func advisorAssignmentYearID(assignmentID string) (string, error) {
	var yearID string
	err := db.DB.Table("advisor_assignments").
		Select("year_id").
		Where("id = ? AND deleted_at IS NULL", assignmentID).
		Scan(&yearID).Error
	return yearID, err
}
