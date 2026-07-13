package handler

import (
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

func RegisterContractRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/yearly-companies/:id/contract", getContractByYearlyCompany)
	// Create/update contracts: only staff or admin
	rc := e.Group("")
	rc.Use(RequireRoles("staff", "admin"))
	rc.POST("/yearly-companies/:id/contract", createContract)
	rc.PATCH("/contracts/:contractId", updateContract)
}

func getContractByYearlyCompany(c echo.Context) error {
	id := c.Param("id")
	svc := service.NewContractService()
	ct, err := svc.GetByYearlyCompanyID(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]interface{}{"error": "contract not found"})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": ct, "message": "success"})
}

func createContract(c echo.Context) error {
	yearlyId := c.Param("id")
	var req model.SponsorshipContract
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}
	req.YearlyCompanyID = yearlyId
	// set assignee from context if available (assignee is typically carried over from assignment)
	uid := c.Get("userId")
	if uid != nil && uid != "" {
		req.AssigneeID = uid.(string)
	}
	svc := service.NewContractService()
	if err := svc.Create(&req); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": req, "message": "created"})
}

func updateContract(c echo.Context) error {
	cid := c.Param("contractId")
	var req model.SponsorshipContract
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}
	// ensure ID
	req.ID = cid
	svc := service.NewContractService()
	if err := svc.Update(&req); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": req, "message": "updated"})
}
