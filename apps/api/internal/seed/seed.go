// Package seed loads fictitious development data into an AdAdd database, so
// the API, the frontend in API mode, and E2E tests can start from a known
// state (spec/development.md#Development Seed).
//
// Every row has a fixed ID and each step only creates what is missing, so
// running Run again leaves the database unchanged. Business state (Yearly
// Company generation and companyStatus, contracts, totals, payments) is
// created through the services, so it follows the real business rules.
package seed

import (
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/shopspring/decimal"
)

// IDs that the frontend development stub and tests refer to.
const (
	PreviousYearID = "year_2025"
	CurrentYearID  = "year_2026"

	AdministratorUserID       = "user_001"
	SponsorshipMemberUserID   = "user_002"
	FinanceUserID             = "user_003"
	InactiveUserID            = "user_004"
	SecondSponsorshipMemberID = "user_005"
	AdvisorUserID             = "user_006"
)

type seedUser struct {
	user  model.User
	roles []string
}

var users = []seedUser{
	{model.User{ID: AdministratorUserID, StudentID: "b1234567", Name: "田中", Email: "tanaka@example.com", IsActive: true}, []string{"ADMINISTRATOR"}},
	{model.User{ID: SponsorshipMemberUserID, StudentID: "b2345678", Name: "鈴木", Email: "suzuki@example.com", IsActive: true}, []string{"SPONSORSHIP_MEMBER"}},
	{model.User{ID: FinanceUserID, StudentID: "b3456789", Name: "佐藤", Email: "sato@example.com", IsActive: true}, []string{"FINANCE_DEPARTMENT"}},
	{model.User{ID: InactiveUserID, StudentID: "b4567890", Name: "高橋", Email: "takahashi@example.com", IsActive: false}, nil},
	{model.User{ID: SecondSponsorshipMemberID, StudentID: "b5678901", Name: "山田", Email: "yamada@example.com", IsActive: true}, []string{"SPONSORSHIP_MEMBER"}},
	{model.User{ID: AdvisorUserID, StudentID: "b6789012", Name: "伊藤", Email: "ito@example.com", IsActive: true}, []string{"ADVISOR"}},
}

// Companies that already existed in the previous Year.
var previousYearCompanies = []model.Company{
	{ID: "c_001", CompanyName: "株式会社長岡テクノ", CompanyNameKana: "ナガオカテクノ", PostalCode: "940-2188", Address: "新潟県長岡市上富岡町1603-1", PhoneNumber: "0258-00-0000", Website: "https://example.com", ContactPersonName: "山田太郎", ContactEmailOrForm: "yamada@example.com", FirstSponsorshipYear: "2015"},
	{ID: "c_002", CompanyName: "越後電機株式会社", CompanyNameKana: "エチゴデンキ", PostalCode: "940-0000", Address: "新潟県長岡市", PhoneNumber: "0258-00-0001", ContactPersonName: "佐藤花子", ContactEmailOrForm: "sato@example.com", FirstSponsorshipYear: "2020"},
	{ID: "c_003", CompanyName: "信濃川建設株式会社", CompanyNameKana: "シナノガワケンセツ", PostalCode: "940-0001", Address: "新潟県長岡市", PhoneNumber: "0258-00-0002", ContactPersonName: "鈴木一郎", ContactEmailOrForm: "https://example.com/contact"},
}

// Companies registered after the previous Year ended.
var newCompanies = []model.Company{
	{ID: "c_004", CompanyName: "北越フーズ株式会社", CompanyNameKana: "ホクエツフーズ", PostalCode: "940-0002", Address: "新潟県長岡市", PhoneNumber: "0258-00-0003"},
	{ID: "c_005", CompanyName: "魚沼食品株式会社", CompanyNameKana: "ウオヌマショクヒン", PostalCode: "949-7300", Address: "新潟県魚沼市", PhoneNumber: "025-000-0000"},
}

func intPointer(value int) *int { return &value }

func sponsorshipMenus(yearID, idPrefix string) []model.SponsorshipMenu {
	return []model.SponsorshipMenu{
		{ID: idPrefix + "001", YearID: yearID, Name: "パンフレット広告 1P", DefaultPrice: decimal.NewFromInt(80000), RequiresSubmission: true, IsActive: true},
		{ID: idPrefix + "002", YearID: yearID, Name: "企業ブース", DefaultPrice: decimal.NewFromInt(50000), RequiresSubmission: false, IsActive: true, MaxQuantity: intPointer(8)},
		{ID: idPrefix + "003", YearID: yearID, Name: "ホームページ広告", DefaultPrice: decimal.NewFromInt(15000), RequiresSubmission: true, IsActive: true},
	}
}

// Sponsorship Menu IDs. The current Year uses the frontend mock IDs.
const (
	previousPamphletMenuID = "menu_2025_001"
	previousHomepageMenuID = "menu_2025_003"
	currentPamphletMenuID  = "menu_001"
	currentBoothMenuID     = "menu_002"
	currentHomepageMenuID  = "menu_003"
)

// Run loads the seed data. It writes a line per step to out.
func Run(out io.Writer) error {
	steps := []struct {
		name string
		run  func() error
	}{
		{"users and roles", ensureUsers},
		{"companies (previous Year)", func() error { return ensureCompanies(previousYearCompanies) }},
		{"Year 2025", func() error { return ensureYear(PreviousYearID, "2025", date(2025, 4, 1), date(2025, 11, 30)) }},
		{"Sponsorship Menus 2025", func() error { return ensureSponsorshipMenus(sponsorshipMenus(PreviousYearID, "menu_2025_")) }},
		{"contracts 2025", ensurePreviousYearContracts},
		{"companies (new)", func() error { return ensureCompanies(newCompanies) }},
		{"Year 2026", func() error { return ensureYear(CurrentYearID, "2026", date(2026, 4, 1), date(2026, 11, 30)) }},
		{"Sponsorship Menus 2026", func() error { return ensureSponsorshipMenus(sponsorshipMenus(CurrentYearID, "menu_")) }},
		{"assignments 2026", ensureCurrentYearAssignments},
		{"advisor assignments 2026", ensureCurrentYearAdvisorAssignments},
		{"contracts 2026", ensureCurrentYearContracts},
	}
	for _, step := range steps {
		if err := step.run(); err != nil {
			return fmt.Errorf("seed %s: %w", step.name, err)
		}
		fmt.Fprintf(out, "seeded %s\n", step.name)
	}
	return nil
}

func date(year int, month time.Month, day int) time.Time {
	return time.Date(year, month, day, 0, 0, 0, 0, time.Local)
}

func exists(value any, query string, args ...any) (bool, error) {
	var count int64
	if err := db.DB.Model(value).Where(query, args...).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func ensureUsers() error {
	for _, seedUser := range users {
		user := seedUser.user
		found, err := exists(&model.User{}, "id = ?", user.ID)
		if err != nil {
			return err
		}
		if !found {
			if err := db.DB.Create(&user).Error; err != nil {
				return err
			}
			// Inactive must be written explicitly: `default:true` replaces the
			// zero value on create (and GORM writes it back into user).
			if !seedUser.user.IsActive {
				if err := db.DB.Model(&model.User{}).Where("id = ?", user.ID).Update("is_active", false).Error; err != nil {
					return err
				}
			}
		}

		for _, code := range seedUser.roles {
			var role model.Role
			if err := db.DB.First(&role, "code = ?", code).Error; err != nil {
				return fmt.Errorf("role %s: %w", code, err)
			}
			granted, err := exists(&model.UserRole{}, "user_id = ? AND role_id = ?", user.ID, role.ID)
			if err != nil {
				return err
			}
			if !granted {
				if err := db.DB.Create(&model.UserRole{UserID: user.ID, RoleID: role.ID, AssignedAt: time.Now()}).Error; err != nil {
					return err
				}
			}
		}
	}
	return nil
}

func ensureCompanies(companies []model.Company) error {
	for _, company := range companies {
		found, err := exists(&model.Company{}, "id = ?", company.ID)
		if err != nil {
			return err
		}
		if !found {
			if err := db.DB.Create(&company).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

// ensureYear creates the Year through YearService, which also generates a
// Yearly Company for every existing Company with its companyStatus computed
// (UC-01, spec/domain.md#Company Status).
func ensureYear(id, name string, startDate, endDate time.Time) error {
	found, err := exists(&model.Year{}, "id = ?", id)
	if err != nil || found {
		return err
	}
	return service.NewYearService().Create(&model.Year{ID: id, Name: name, StartDate: startDate, EndDate: endDate})
}

func ensureSponsorshipMenus(menus []model.SponsorshipMenu) error {
	for _, menu := range menus {
		found, err := exists(&model.SponsorshipMenu{}, "id = ?", menu.ID)
		if err != nil {
			return err
		}
		if !found {
			if err := db.DB.Create(&menu).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

func yearlyCompanyID(yearID, companyID string) (string, error) {
	var yearlyCompany model.YearlyCompany
	if err := db.DB.First(&yearlyCompany, "year_id = ? AND company_id = ?", yearID, companyID).Error; err != nil {
		return "", fmt.Errorf("yearly company for %s in %s: %w", companyID, yearID, err)
	}
	return yearlyCompany.ID, nil
}

type contractMenuInput struct {
	sponsorshipMenuID  string
	unitPrice          int64
	isGoodsSponsorship bool
	productionType     string
	status             string
}

type contractInput struct {
	id           string
	yearID       string
	companyID    string
	assigneeID   string
	contractDate time.Time
	menus        []contractMenuInput
	// paymentStatus is empty when no Payment should be registered.
	paymentStatus string
	// progress is the Yearly Company progress after the contract is set up.
	progress string
}

// ensureContract creates the contract, its Contract Menus, and its Payment
// through the services, so totalAmount and progress follow the business rules.
func ensureContract(input contractInput) error {
	yearlyCompany, err := yearlyCompanyID(input.yearID, input.companyID)
	if err != nil {
		return err
	}
	found, err := exists(&model.SponsorshipContract{}, "id = ?", input.id)
	if err != nil || found {
		return err
	}

	contractDate := model.Date(input.contractDate)
	contract := &model.SponsorshipContract{
		ID:              input.id,
		YearlyCompanyID: yearlyCompany,
		ContractDate:    &contractDate,
		AssigneeID:      input.assigneeID,
	}
	if err := service.NewContractService().CreateWithUser(contract, AdministratorUserID); err != nil {
		return err
	}

	contractMenuService := service.NewContractMenuService()
	for _, menu := range input.menus {
		if err := contractMenuService.Create(&model.ContractMenu{
			ContractID:         input.id,
			SponsorshipMenuID:  menu.sponsorshipMenuID,
			Quantity:           1,
			UnitPrice:          decimal.NewFromInt(menu.unitPrice),
			IsGoodsSponsorship: menu.isGoodsSponsorship,
			ProductionType:     menu.productionType,
			Status:             menu.status,
		}, true); err != nil {
			return err
		}
	}

	if input.paymentStatus != "" {
		if err := ensurePayment(input.id, input.paymentStatus); err != nil {
			return err
		}
	}

	if input.progress != "" {
		return db.DB.Model(&model.YearlyCompany{}).Where("id = ?", yearlyCompany).Update("progress", input.progress).Error
	}
	return nil
}

func ensurePayment(contractID, status string) error {
	var contract model.SponsorshipContract
	if err := db.DB.First(&contract, "id = ?", contractID).Error; err != nil {
		return err
	}
	paymentService := service.NewPaymentService()
	payment := &model.Payment{ContractID: contractID, Amount: contract.TotalAmount, Status: "WAITING"}
	if err := paymentService.Create(payment); err != nil {
		return err
	}
	if status == "CONFIRMED" {
		return paymentService.Update(&model.Payment{ID: payment.ID, Status: "CONFIRMED", ConfirmedByID: FinanceUserID})
	}
	return nil
}

// In 2025, c_001 and c_002 had contracts and c_003 was contacted without one,
// so in 2026 c_001 and c_002 become Continuing and c_003 stays New.
func ensurePreviousYearContracts() error {
	contracts := []contractInput{
		{
			id: "contract_2025_c_001", yearID: PreviousYearID, companyID: "c_001",
			assigneeID: SponsorshipMemberUserID, contractDate: date(2025, 6, 10),
			menus: []contractMenuInput{
				{sponsorshipMenuID: previousPamphletMenuID, unitPrice: 80000, productionType: "COMPANY", status: "SUBMITTED"},
			},
			paymentStatus: "CONFIRMED", progress: "RECEIPT_SENT",
		},
		{
			id: "contract_2025_c_002", yearID: PreviousYearID, companyID: "c_002",
			assigneeID: SecondSponsorshipMemberID, contractDate: date(2025, 7, 1),
			menus: []contractMenuInput{
				{sponsorshipMenuID: previousHomepageMenuID, unitPrice: 15000, productionType: "COMPANY", status: "SUBMITTED"},
			},
			paymentStatus: "CONFIRMED", progress: "RECEIPT_SENT",
		},
	}
	for _, contract := range contracts {
		if err := ensureContract(contract); err != nil {
			return err
		}
	}

	yearlyCompany, err := yearlyCompanyID(PreviousYearID, "c_003")
	if err != nil {
		return err
	}
	return db.DB.Model(&model.YearlyCompany{}).
		Where("id = ? AND progress = ?", yearlyCompany, "NOT_CONTACTED").
		Update("progress", "DECLINED").Error
}

func ensureCurrentYearAssignments() error {
	assignments := map[string]string{
		"c_001": SponsorshipMemberUserID,
		"c_002": SecondSponsorshipMemberID,
		"c_003": SponsorshipMemberUserID,
	}
	assignmentService := service.NewAssignmentService()
	for _, companyID := range []string{"c_001", "c_002", "c_003"} {
		yearlyCompany, err := yearlyCompanyID(CurrentYearID, companyID)
		if err != nil {
			return err
		}
		existing, err := assignmentService.GetByYearlyCompany(yearlyCompany)
		if err != nil {
			return err
		}
		if existing != nil {
			continue
		}
		if _, err := assignmentService.AssignOrClear(yearlyCompany, assignments[companyID], AdministratorUserID); err != nil {
			return err
		}
	}
	return nil
}

func ensureCurrentYearAdvisorAssignments() error {
	advisorService := service.NewAdvisorService()
	for _, memberID := range []string{SponsorshipMemberUserID, SecondSponsorshipMemberID} {
		err := advisorService.Create(&model.AdvisorAssignment{
			YearID:     CurrentYearID,
			AdvisorID:  AdvisorUserID,
			MemberID:   memberID,
			AssignedAt: time.Now(),
		})
		if err != nil && !errors.Is(err, service.ErrAdvisorAssignmentExists) {
			return err
		}
	}
	return nil
}

// In 2026, c_001 has a contract with a goods sponsorship line and a Payment
// waiting for Finance; c_002 has been sent materials; the rest are untouched.
func ensureCurrentYearContracts() error {
	if err := ensureContract(contractInput{
		id: "contract_2026_c_001", yearID: CurrentYearID, companyID: "c_001",
		assigneeID: SponsorshipMemberUserID, contractDate: date(2026, 6, 15),
		menus: []contractMenuInput{
			{sponsorshipMenuID: currentPamphletMenuID, unitPrice: 80000, productionType: "COMPANY", status: "PRODUCING"},
			{sponsorshipMenuID: currentHomepageMenuID, unitPrice: 15000, productionType: "COMPANY", status: "WAITING"},
			{sponsorshipMenuID: currentBoothMenuID, unitPrice: 0, isGoodsSponsorship: true, status: "WAITING"},
		},
		paymentStatus: "WAITING", progress: "INVOICE_SENT",
	}); err != nil {
		return err
	}

	yearlyCompany, err := yearlyCompanyID(CurrentYearID, "c_002")
	if err != nil {
		return err
	}
	return db.DB.Model(&model.YearlyCompany{}).
		Where("id = ? AND progress = ?", yearlyCompany, "NOT_CONTACTED").
		Updates(map[string]any{"progress": "MATERIALS_SENT", "phase": "PHASE_1"}).Error
}
