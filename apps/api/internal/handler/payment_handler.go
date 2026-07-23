package handler

import (
	"net/http"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

func RegisterPaymentRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/contracts/:contractId/payment", getPaymentByContract)
	r.GET("/years/:yearId/payments", listPaymentsAcrossYear)

	// Create payment records (staff or admin or finance)
	rc := e.Group("")
	rc.Use(RequireRoles("staff", "admin", "finance"))
	rc.POST("/contracts/:contractId/payment", createPayment)

	// Only finance or admin can update payments
	rp := e.Group("")
	rp.Use(RequireRoles("finance", "admin"))
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
	var req model.Payment
	if err := c.Bind(&req); err != nil {
		return respondBadRequest(c, err.Error())
	}
	req.ID = pid
	if err := ValidatePaymentStatus(req.Status); err != nil {
		return respondBadRequest(c, err.Error())
	}
	if !req.Amount.IsZero() && !validateNonNegativeAmount(req.Amount) {
		return respondBadRequest(c, "amount must be non-negative")
	}
	// set confirmedAt/confirmedById server-side when status becomes CONFIRMED
	if req.Status == "CONFIRMED" {
		now := time.Now()
		req.ConfirmedAt = &now
		if uid := c.Get("userId"); uid != nil && uid != "" {
			req.ConfirmedByID = uid.(string)
		}
	}
	svc := service.NewPaymentService()
	if err := svc.Update(&req); err != nil {
		return respondInternalServerError(c, err)
	}
	// reload payment to return correct timestamps and stored values
	updated, err := svc.GetByID(req.ID)
	if err != nil {
		// if reload fails, still return success but include request payload
		return c.JSON(http.StatusOK, map[string]interface{}{"data": req, "message": "updated"})
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

	if contract.TotalAmount.IsZero() {
		return respondBadRequest(c, "cannot create payment for contract with zero total amount")
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
