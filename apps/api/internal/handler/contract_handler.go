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
		return respondNotFound(c, "contract not found")
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": ct, "message": "success"})
}

func createContract(c echo.Context) error {
	yearlyId := c.Param("id")
	var req model.SponsorshipContract
	if err := c.Bind(&req); err != nil {
		return respondBadRequest(c, err.Error())
	}
	req.YearlyCompanyID = yearlyId
	// assigneeId is never accepted from the client — only from CompanyAssignment
	req.AssigneeID = ""
	asvc := service.NewAssignmentService()
	if a, err := asvc.GetByYearlyCompany(yearlyId); err == nil && a != nil {
		req.AssigneeID = a.UserID
	}

	if req.TotalAmount.IsNegative() {
		return respondBadRequest(c, "totalAmount must be non-negative")
	}
	if req.YearlyCompanyID == "" {
		return respondBadRequest(c, "yearlyCompanyId is required")
	}

	svc := service.NewContractService()
	actorID := ""
	if uid := c.Get("userId"); uid != nil {
		actorID, _ = uid.(string)
	}
	if err := svc.CreateWithUser(&req, actorID); err != nil {
		if err == service.ErrContractExists {
			return respondConflict(c, "contract already exists for this YearlyCompany")
		}
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": req, "message": "created"})
}

func updateContract(c echo.Context) error {
	cid := c.Param("contractId")
	svc := service.NewContractService()
	existing, err := svc.GetByID(cid)
	if err != nil {
		return respondNotFound(c, "contract not found")
	}

	var patch model.SponsorshipContract
	if err := c.Bind(&patch); err != nil {
		return respondBadRequest(c, err.Error())
	}
	if patch.ContractDate != nil {
		existing.ContractDate = patch.ContractDate
	}
	if patch.Remarks != "" {
		existing.Remarks = patch.Remarks
	}
	// totalAmount and assigneeId remain server-owned

	if err := svc.Update(existing); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": existing, "message": "updated"})
}
