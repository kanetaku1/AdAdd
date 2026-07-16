package handler

import (
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
	"github.com/shopspring/decimal"
)

func RegisterContractMenuRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/contracts/:contractId/menus", listContractMenus)
	// staff and admin manage contract menus
	rStaff := e.Group("")
	rStaff.Use(RequireRoles("staff", "admin"))
	rStaff.POST("/contracts/:contractId/menus", addContractMenu)
	rStaff.DELETE("/contract-menus/:id", deleteContractMenu)
	rStaff.PATCH("/contract-menus/:id/status", updateContractMenuStatus)
	rStaff.PATCH("/contract-menus/:id/production", uploadContractMenuProduction)
}

func listContractMenus(c echo.Context) error {
	contractId := c.Param("contractId")
	svc := service.NewContractMenuService()
	list, err := svc.ListByContract(contractId)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": list, "message": "success"})
}

func addContractMenu(c echo.Context) error {
	contractId := c.Param("contractId")
	var body struct {
		SponsorshipMenuID  string           `json:"sponsorshipMenuId"`
		Quantity           int              `json:"quantity"`
		UnitPrice          *decimal.Decimal `json:"unitPrice"`
		IsGoodsSponsorship bool             `json:"isGoodsSponsorship"`
		ProductionType     string           `json:"productionType"`
		Remarks            string           `json:"remarks"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}
	if body.SponsorshipMenuID == "" {
		return badRequest(c, "sponsorshipMenuId is required")
	}
	if body.Quantity <= 0 {
		return badRequest(c, "quantity must be > 0")
	}
	if body.UnitPrice != nil && !validateNonNegativeAmount(*body.UnitPrice) {
		return badRequest(c, "unitPrice must be non-negative")
	}

	req := &model.ContractMenu{
		ContractID:         contractId,
		SponsorshipMenuID:  body.SponsorshipMenuID,
		Quantity:           body.Quantity,
		IsGoodsSponsorship: body.IsGoodsSponsorship,
		ProductionType:     body.ProductionType,
		Remarks:            body.Remarks,
	}
	if body.UnitPrice != nil {
		req.UnitPrice = *body.UnitPrice
	}

	svc := service.NewContractMenuService()
	if err := svc.Create(req, body.UnitPrice != nil); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": req, "message": "created"})
}

func deleteContractMenu(c echo.Context) error {
	id := c.Param("id")
	svc := service.NewContractMenuService()
	if err := svc.Delete(id); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"message": "deleted"})
}

func updateContractMenuStatus(c echo.Context) error {
	id := c.Param("id")
	var body struct {
		Status string `json:"status"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}
	// validate status
	allowed := []string{"WAITING", "REQUESTED", "PRODUCING", "COMPLETED", "SUBMITTED"}
	if !validateStatus(body.Status, allowed) {
		return badRequest(c, "invalid status")
	}
	svc := service.NewContractMenuService()
	cm, err := svc.GetByID(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]interface{}{"error": "contract menu not found"})
	}
	cm.Status = body.Status
	if err := svc.Update(cm); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": cm, "message": "updated"})
}

func uploadContractMenuProduction(c echo.Context) error {
	id := c.Param("id")
	var body struct {
		DriveFolderUrl string `json:"driveFolderUrl"`
		Remarks        string `json:"remarks"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}
	svc := service.NewContractMenuService()
	cm, err := svc.GetByID(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]interface{}{"error": "contract menu not found"})
	}
	cm.DriveURL = body.DriveFolderUrl
	cm.Remarks = body.Remarks
	cm.Status = "SUBMITTED"
	userId := ""
	if uid := c.Get("userId"); uid != nil {
		userId = uid.(string)
	}
	if err := svc.UpdateWithUser(cm, userId); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": cm, "message": "updated"})
}
