package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// Year
type Year struct {
	ID        string         `gorm:"type:char(36);primaryKey" json:"id"`
	Name      string         `gorm:"size:32;not null" json:"name"`
	StartDate time.Time      `json:"startDate"`
	EndDate   time.Time      `json:"endDate"`
	IsActive  bool           `gorm:"not null;default:false" json:"isActive"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (y *Year) BeforeCreate(tx *gorm.DB) (err error) {
	if y.ID == "" {
		y.ID = uuid.NewString()
	}
	return nil
}

// Company
type Company struct {
	ID                   string         `gorm:"type:char(36);primaryKey" json:"id"`
	CompanyName          string         `gorm:"size:255;not null;unique" json:"companyName"`
	CompanyNameKana      string         `gorm:"size:255" json:"companyNameKana"`
	PostalCode           string         `gorm:"size:20" json:"postalCode"`
	Address              string         `gorm:"size:512" json:"address"`
	PhoneNumber          string         `gorm:"size:64" json:"phoneNumber"`
	Website              string         `gorm:"size:255" json:"website"`
	ContactPersonName    string         `gorm:"size:255" json:"contactPersonName"`
	ContactEmailOrForm   string         `gorm:"size:512" json:"contactEmailOrForm"`
	FirstSponsorshipYear string         `gorm:"size:16" json:"firstSponsorshipYear"`
	Memo                 string         `gorm:"type:text" json:"memo"`
	CreatedAt            time.Time      `json:"createdAt"`
	UpdatedAt            time.Time      `json:"updatedAt"`
	DeletedAt            gorm.DeletedAt `gorm:"index" json:"-"`
}

func (c *Company) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == "" {
		c.ID = uuid.NewString()
	}
	return nil
}

// YearlyCompany
type YearlyCompany struct {
	ID            string         `gorm:"type:char(36);primaryKey" json:"id"`
	YearID        string         `gorm:"type:char(36);not null;index" json:"yearId"`
	CompanyID     string         `gorm:"type:char(36);not null;index" json:"companyId"`
	CompanyStatus string         `gorm:"size:32" json:"companyStatus"`
	Phase         string         `gorm:"size:32" json:"phase"`
	Progress      string         `gorm:"size:32" json:"progress"`
	Notes         string         `gorm:"type:text" json:"notes"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

func (y *YearlyCompany) BeforeCreate(tx *gorm.DB) (err error) {
	if y.ID == "" {
		y.ID = uuid.NewString()
	}
	return nil
}

// YearlyCompanyResponse is the returned DTO containing joined fields
type YearlyCompanyResponse struct {
	YearlyCompany
	CompanyName        string  `json:"companyName"`
	AssignedMemberID   *string `json:"assignedMemberId"`
	AssignedMemberName *string `json:"assignedMemberName"`
}

// SponsorshipContract
type SponsorshipContract struct {
	ID              string          `gorm:"type:char(36);primaryKey" json:"id"`
	YearlyCompanyID string          `gorm:"type:char(36);not null;uniqueIndex" json:"yearlyCompanyId"`
	ContractDate    *time.Time      `json:"contractDate"`
	TotalAmount     decimal.Decimal `json:"totalAmount"`
	AssigneeID      string          `gorm:"type:char(36)" json:"assigneeId"`
	Remarks         string          `gorm:"type:text" json:"remarks"`
	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
	DeletedAt       gorm.DeletedAt  `gorm:"index" json:"-"`
}

func (s *SponsorshipContract) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}

// SponsorshipMenu (master per Year)
type SponsorshipMenu struct {
	ID                 string          `gorm:"type:char(36);primaryKey" json:"id"`
	YearID             string          `gorm:"type:char(36);not null;index" json:"yearId"`
	Name               string          `gorm:"size:255;not null" json:"name"`
	DefaultPrice       decimal.Decimal `json:"defaultPrice"`
	RequiresSubmission bool            `gorm:"not null;default:false" json:"requiresSubmission"`
	IsActive           bool            `gorm:"not null;default:true" json:"isActive"`
	CreatedAt          time.Time       `json:"createdAt"`
	UpdatedAt          time.Time       `json:"updatedAt"`
	DeletedAt          gorm.DeletedAt  `gorm:"index" json:"-"`
}

func (m *SponsorshipMenu) BeforeCreate(tx *gorm.DB) (err error) {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

// ContractMenu
type ContractMenu struct {
	ID                 string          `gorm:"type:char(36);primaryKey" json:"id"`
	ContractID         string          `gorm:"type:char(36);not null;index" json:"contractId"`
	SponsorshipMenuID  string          `gorm:"type:char(36);not null;index" json:"sponsorshipMenuId"`
	Quantity           int             `gorm:"not null;default:1" json:"quantity"`
	UnitPrice          decimal.Decimal `json:"unitPrice"`
	IsGoodsSponsorship bool            `gorm:"not null;default:false" json:"isGoodsSponsorship"`
	ProductionType     string          `gorm:"size:32" json:"productionType"`
	Status             string          `gorm:"size:32" json:"status"`
	DriveFolderID      string          `gorm:"size:512" json:"driveFolderId"`
	DriveURL           string          `gorm:"size:1024" json:"driveUrl"`
	SubmittedAt        *time.Time      `json:"submittedAt"`
	Remarks            string          `gorm:"type:text" json:"remarks"`
	CreatedAt          time.Time       `json:"createdAt"`
	UpdatedAt          time.Time       `json:"updatedAt"`
	DeletedAt          gorm.DeletedAt  `gorm:"index" json:"-"`
}

func (cm *ContractMenu) BeforeCreate(tx *gorm.DB) (err error) {
	if cm.ID == "" {
		cm.ID = uuid.NewString()
	}
	return nil
}

// ContractMenuResponse is the returned DTO containing joined fields
type ContractMenuResponse struct {
	ContractMenu
	CompanyName         string `gorm:"column:company_name" json:"companyName"`
	YearlyCompanyID     string `gorm:"column:yearly_company_id" json:"yearlyCompanyId"`
	SponsorshipMenuName string `gorm:"column:sponsorship_menu_name" json:"sponsorshipMenuName"`
}

// Payment
type Payment struct {
	ID            string          `gorm:"type:char(36);primaryKey" json:"id"`
	ContractID    string          `gorm:"type:char(36);not null;uniqueIndex" json:"contractId"`
	Amount        decimal.Decimal `json:"amount"`
	Status        string          `gorm:"size:32" json:"status"`
	ConfirmedAt   *time.Time      `json:"confirmedAt"`
	ConfirmedByID string          `gorm:"type:char(36)" json:"confirmedById"`
	CreatedAt     time.Time       `json:"createdAt"`
	UpdatedAt     time.Time       `json:"updatedAt"`
	DeletedAt     gorm.DeletedAt  `gorm:"index" json:"-"`
}

func (p *Payment) BeforeCreate(tx *gorm.DB) (err error) {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	return nil
}

// CompanyAssignment (table: assignments) — 0..1 per YearlyCompany
type CompanyAssignment struct {
	ID              string         `gorm:"type:char(36);primaryKey" json:"id"`
	YearlyCompanyID string         `gorm:"type:char(36);not null;uniqueIndex:ux_assignment_yearly_company" json:"yearlyCompanyId"`
	UserID          string         `gorm:"type:char(36);not null;index" json:"userId"`
	Role            string         `gorm:"size:32" json:"role"`
	AssignedAt      time.Time      `json:"assignedAt"`
	CreatedAt       time.Time      `json:"createdAt"`
	UpdatedAt       time.Time      `json:"updatedAt"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

func (CompanyAssignment) TableName() string { return "assignments" }

func (a *CompanyAssignment) BeforeCreate(tx *gorm.DB) (err error) {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}

// AdvisorAssignment — multiple Advisors per Member per Year; unique (yearId, memberId, advisorId)
type AdvisorAssignment struct {
	ID         string         `gorm:"type:char(36);primaryKey" json:"id"`
	YearID     string         `gorm:"type:char(36);not null;uniqueIndex:ux_advisor_year_member_advisor" json:"yearId"`
	AdvisorID  string         `gorm:"type:char(36);not null;uniqueIndex:ux_advisor_year_member_advisor" json:"advisorId"`
	MemberID   string         `gorm:"type:char(36);not null;uniqueIndex:ux_advisor_year_member_advisor" json:"memberId"`
	AssignedAt time.Time      `json:"assignedAt"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (aa *AdvisorAssignment) BeforeCreate(tx *gorm.DB) (err error) {
	if aa.ID == "" {
		aa.ID = uuid.NewString()
	}
	return nil
}

// ActivityLog
type ActivityLog struct {
	ID              string    `gorm:"type:char(36);primaryKey" json:"id"`
	YearlyCompanyID string    `gorm:"type:char(36);not null;index" json:"yearlyCompanyId"`
	UserID          string    `gorm:"type:char(36);not null;index" json:"userId"`
	Action          string    `gorm:"size:255;not null" json:"action"`
	Description     string    `gorm:"type:text" json:"description"`
	CreatedAt       time.Time `json:"createdAt"`
}

// User
type User struct {
	ID        string         `gorm:"type:char(36);primaryKey" json:"id"`
	StudentID string         `gorm:"size:64" json:"studentId"`
	Name      string         `gorm:"size:255" json:"name"`
	Email     string         `gorm:"size:255;uniqueIndex" json:"email"`
	SlackID   string         `gorm:"size:255" json:"slackId"`
	IsActive  bool           `gorm:"not null;default:true" json:"isActive"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	if u.ID == "" {
		u.ID = uuid.NewString()
	}
	return nil
}
