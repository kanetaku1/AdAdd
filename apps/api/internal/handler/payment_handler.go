package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
)

func RegisterPaymentRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/contracts/:contractId/payment", getPaymentByContract)
	r.PATCH("/payments/:paymentId", updatePayment)
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
	// Business rule: only Finance can update — RBAC not yet implemented
	svc := service.NewPaymentService()
	if err := svc.Update(&req); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": req, "message": "updated"})
}
