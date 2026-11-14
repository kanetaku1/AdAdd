package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

func RegisterPaymentRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/contracts/:contractId/payment", getPaymentByContract)
	r.GET("/years/:yearId/payments", listPaymentsAcrossYear)

	// Create payment records (staff or admin or finance)
	rc := e.Group("")
	rc.Use(RequireRoles("SPONSORSHIP_MEMBER", "ADMINISTRATOR", "FINANCE_DEPARTMENT"))
	rc.POST("/contracts/:contractId/payment", createPayment)

	// Only finance or admin can update payments
	rp := e.Group("")
	rp.Use(RequireRoles("FINANCE_DEPARTMENT", "ADMINISTRATOR"))
	rp.PATCH("/payments/:paymentId", updatePayment)
}

func getPaymentByContract(c echo.Context) error {
	contractId := c.Param("contractId")
	svc := service.NewPaymentService()
	p, err := svc.GetByContractID(contractId)
	if err != nil {
		return respondNotFound(c, "payment not found")
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": p, "message": "success"})
}

func listPaymentsAcrossYear(c echo.Context) error {
	yearId := c.Param("yearId")
	filters := make(map[string]interface{})
	if q := c.QueryParam("status"); q != "" {
		filters["status"] = q
	}
	svc := service.NewPaymentService()
	list, err := svc.ListAcrossYear(yearId, filters)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": list, "message": "success"})
}

func updatePayment(c echo.Context) error {
	pid := c.Param("paymentId")
	var req struct {
		Status         *string         `json:"status"`
		ReceivedAmount json.RawMessage `json:"receivedAmount"`
		Remarks        *string         `json:"remarks"`
	}
	if err := c.Bind(&req); err != nil {
		return respondBadRequest(c, err.Error())
	}

	if req.Status != nil {
		if err := ValidatePaymentStatus(*req.Status); err != nil {
			return respondBadRequest(c, err.Error())
		}
	}
	if req.Status == nil && len(req.ReceivedAmount) == 0 && req.Remarks == nil {
		return respondBadRequest(c, "at least one payment field is required")
	}

	var receivedAmount *decimal.Decimal
	receivedAmountGiven := len(req.ReceivedAmount) > 0
	if receivedAmountGiven && string(req.ReceivedAmount) != "null" {
		var amount decimal.Decimal
		if err := json.Unmarshal(req.ReceivedAmount, &amount); err != nil {
			return respondBadRequest(c, "receivedAmount must be a number or null")
		}
		if amount.IsNegative() {
			return respondBadRequest(c, "receivedAmount must not be negative")
		}
		receivedAmount = &amount
	}

	updateModel := model.Payment{
		ID:                  pid,
		ReceivedAmount:      receivedAmount,
		ReceivedAmountGiven: receivedAmountGiven,
	}
	if req.Status != nil {
		updateModel.Status = *req.Status
	}
	if req.Remarks != nil {
		updateModel.Remarks = *req.Remarks
		updateModel.RemarksGiven = true
	}
	if uid, ok := c.Get("userId").(string); ok {
		updateModel.ConfirmedByID = uid
	}

	svc := service.NewPaymentService()
	if err := svc.Update(&updateModel); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return respondNotFound(c, "入金が見つかりません")
		}
		if errors.Is(err, service.ErrReceivedAmountRequired) {
			return respondBadRequest(c, err.Error())
		}
		return respondInternalServerError(c, err)
	}

	updated, err := svc.GetByID(updateModel.ID)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": updated, "message": "updated"})
}

func createPayment(c echo.Context) error {
	contractId := c.Param("contractId")

	csvc := service.NewContractService()
	contract, err := csvc.GetByID(contractId)
	if err != nil {
		return respondNotFound(c, "contract not found")
	}

	// A goods-sponsorship-only contract, or one with no Contract Menu, has no
	// Payment (spec/model.md#Payment).
	contractMenus, err := service.NewContractMenuService().ListByContract(contractId)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	if len(contractMenus) == 0 {
		return respondConflict(c, "契約メニューがない契約には入金を登録できません")
	}
	if contract.TotalAmount.IsZero() {
		return respondConflict(c, "契約金額が0円（物品協賛のみ）の契約には入金を登録できません")
	}

	psvc := service.NewPaymentService()
	// check if payment already exists
	if existing, err := psvc.GetByContractID(contractId); err == nil && existing != nil {
		return respondConflict(c, "payment already exists for this contract")
	}

	payment := &model.Payment{
		ContractID: contractId,
		Amount:     contract.TotalAmount,
		Status:     "WAITING",
	}

	if err := psvc.Create(payment); err != nil {
		return respondInternalServerError(c, err)
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{"data": payment, "message": "created"})
}
