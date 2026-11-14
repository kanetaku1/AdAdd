package handler

import (
	"errors"
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

func RegisterContractRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/yearly-companies/:id/contract", getContractByYearlyCompany)
	rc := e.Group("")
	rc.Use(RequireRoles("SPONSORSHIP_MEMBER", "ADMINISTRATOR"))
	rc.POST("/yearly-companies/:id/contract", createContract)
	rc.PATCH("/contracts/:contractId", updateContract)
}

func getContractByYearlyCompany(c echo.Context) error {
	id := c.Param("id")
	svc := service.NewContractService()
	ct, err := svc.GetByYearlyCompanyID(id)
	if err != nil {
		return respondNotFound(c, "contract not found")
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": ct, "message": "success"})
}

// contractMenuRequest is one Contract Menu line in Create Contract and
// Add Contract Menu (spec/api.md#Add Contract Menu).
type contractMenuRequest struct {
	SponsorshipMenuID  string           `json:"sponsorshipMenuId"`
	Quantity           int              `json:"quantity"`
	UnitPrice          *decimal.Decimal `json:"unitPrice"`
	IsGoodsSponsorship bool             `json:"isGoodsSponsorship"`
	ProductionType     *string          `json:"productionType"`
	Remarks            string           `json:"remarks"`
}

func (r contractMenuRequest) toInput() service.ContractMenuInput {
	productionType := ""
	if r.ProductionType != nil {
		productionType = *r.ProductionType
	}
	return service.ContractMenuInput{
		SponsorshipMenuID:  r.SponsorshipMenuID,
		Quantity:           r.Quantity,
		UnitPrice:          r.UnitPrice,
		IsGoodsSponsorship: r.IsGoodsSponsorship,
		ProductionType:     productionType,
		Remarks:            r.Remarks,
	}
}

func createContract(c echo.Context) error {
	yearlyCompanyID := c.Param("id")
	// A request-only struct: totalAmount, assigneeId, and id are never
	// accepted from the client (spec/api.md#Create Contract).
	var body struct {
		ContractDate  *model.Date           `json:"contractDate"`
		Remarks       string                `json:"remarks"`
		ContractMenus []contractMenuRequest `json:"contractMenus"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}

	input := service.ContractCreationInput{
		YearlyCompanyID: yearlyCompanyID,
		ContractDate:    body.ContractDate,
		Remarks:         body.Remarks,
		ContractMenus:   make([]service.ContractMenuInput, 0, len(body.ContractMenus)),
	}
	for _, menu := range body.ContractMenus {
		input.ContractMenus = append(input.ContractMenus, menu.toInput())
	}
	// The assignee is always the Yearly Company's current CompanyAssignment.
	if assignment, err := service.NewAssignmentService().GetByYearlyCompany(yearlyCompanyID); err == nil && assignment != nil {
		input.AssigneeID = assignment.UserID
	}

	actorID, _ := c.Get("userId").(string)
	created, err := service.NewContractService().CreateWithMenus(input, actorID)
	if err != nil {
		return respondContractWriteError(c, err)
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": created, "message": "created"})
}

func updateContract(c echo.Context) error {
	var body struct {
		ContractDate *model.Date `json:"contractDate"`
		Remarks      *string     `json:"remarks"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	// totalAmount and assigneeId remain server-owned

	actorID, _ := c.Get("userId").(string)
	updated, err := service.NewContractService().Update(c.Param("contractId"), service.ContractUpdateInput{
		ContractDate: body.ContractDate,
		Remarks:      body.Remarks,
	}, actorID)
	if err != nil {
		return respondContractWriteError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": updated, "message": "updated"})
}

// respondContractWriteError maps the business errors of contract and
// Contract Menu writes to 404 / 400 / 409 (Issue #165); anything else is 500.
func respondContractWriteError(c echo.Context, err error) error {
	switch {
	case errors.Is(err, service.ErrYearlyCompanyNotFound):
		return respondNotFound(c, "年度別企業が見つかりません")
	case errors.Is(err, service.ErrContractNotFound):
		return respondNotFound(c, "契約が見つかりません")
	case errors.Is(err, gorm.ErrRecordNotFound):
		return respondNotFound(c, "契約メニューが見つかりません")
	case errors.Is(err, service.ErrContractMenusRequired):
		return respondBadRequest(c, "協賛メニューを1件以上指定してください")
	case errors.Is(err, service.ErrInvalidContractMenu):
		return respondBadRequest(c, "契約メニューの入力が不正です: "+err.Error())
	case errors.Is(err, service.ErrSponsorshipMenuNotFound):
		return respondBadRequest(c, "協賛メニューが見つかりません: "+err.Error())
	case errors.Is(err, service.ErrSponsorshipMenuYearMismatch):
		return respondBadRequest(c, "契約と異なる年度の協賛メニューは追加できません: "+err.Error())
	case errors.Is(err, service.ErrContractExists):
		return respondConflict(c, "この企業には既に契約が存在します")
	case errors.Is(err, service.ErrSponsorshipMenuInactive):
		return respondConflict(c, "無効になっている協賛メニューは追加できません: "+err.Error())
	case errors.Is(err, service.ErrConfirmedPaymentAmountMismatch):
		return respondConflict(c, "入金確認済みのため、契約金額が変わる変更はできません")
	default:
		return respondInternalServerError(c, err)
	}
}
