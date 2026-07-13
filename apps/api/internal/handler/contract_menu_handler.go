package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
)

func RegisterContractMenuRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/contracts/:contractId/menus", listContractMenus)
	r.POST("/contracts/:contractId/menus", addContractMenu)
	r.PATCH("/contract-menus/:id/status", updateContractMenuStatus)
	r.PATCH("/contract-menus/:id/production", uploadContractMenuProduction)
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
	var req model.ContractMenu
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}
	req.ContractID = contractId
	svc := service.NewContractMenuService()
	if err := svc.Create(&req); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": req, "message": "created"})
}

func updateContractMenuStatus(c echo.Context) error {
	id := c.Param("id")
	var body struct{ Status string `json:"status"` }
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
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
	if err := svc.Update(cm); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": cm, "message": "updated"})
}
