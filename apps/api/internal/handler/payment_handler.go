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
		return c.JSON(http.StatusNotFound, map[string]interface{}{"error": "payment not found"})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": p, "message": "success"})
}

func updatePayment(c echo.Context) error {
	pid := c.Param("paymentId")
	var req model.Payment
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}
	req.ID = pid
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
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	// reload payment to return correct timestamps and stored values
	updated, err := svc.GetByID(req.ID)
	if err != nil {
		// if reload fails, still return success but include request payload
		return c.JSON(http.StatusOK, map[string]interface{}{"data": req, "message": "updated"})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": updated, "message": "updated"})
}
