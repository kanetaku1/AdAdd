package handler

import (
	"errors"
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
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
		Status string `json:"status"`
	}
	if err := c.Bind(&req); err != nil {
		return respondBadRequest(c, err.Error())
	}
	if err := ValidatePaymentStatus(req.Status); err != nil {
		return respondBadRequest(c, err.Error())
	}

	updateModel := model.Payment{
		ID:     pid,
		Status: req.Status,
	}
	if uid := c.Get("userId"); uid != nil && uid != "" {
		updateModel.ConfirmedByID = uid.(string)
	}

	svc := service.NewPaymentService()
	if err := svc.Update(&updateModel); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return respondNotFound(c, "入金が見つかりません")
		}
		return respondInternalServerError(c, err)
	}

	// reload payment to return correct timestamps and stored values
	updated, err := svc.GetByID(updateModel.ID)
	if err != nil {
		// if reload fails, still return success but include request payload
		return c.JSON(http.StatusOK, map[string]interface{}{"data": updateModel, "message": "updated"})
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
