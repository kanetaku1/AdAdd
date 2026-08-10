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

func RegisterSponsorshipMenuRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/years/:yearId/sponsorship-menus", listSponsorshipMenus)
	// manage menus requires staff or admin
	rStaff := e.Group("")
	rStaff.Use(RequireRoles("SPONSORSHIP_MEMBER", "ADMINISTRATOR"))
	rStaff.POST("/years/:yearId/sponsorship-menus", createSponsorshipMenu)
	rStaff.PATCH("/sponsorship-menus/:menuId", updateSponsorshipMenu)
	rStaff.DELETE("/sponsorship-menus/:menuId", deleteSponsorshipMenu)
}

func listSponsorshipMenus(c echo.Context) error {
	yearId := c.Param("yearId")
	svc := service.NewSponsorshipMenuService()
	list, err := svc.ListByYear(yearId)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": list, "message": "success"})
}

func createSponsorshipMenu(c echo.Context) error {
	yearId := c.Param("yearId")
	var req model.SponsorshipMenu
	if err := c.Bind(&req); err != nil {
		return respondBadRequest(c, err.Error())
	}
	// validation
	if req.Name == "" {
		return respondBadRequest(c, "name is required")
	}
	if !validateNonNegativeAmount(req.DefaultPrice) {
		return respondBadRequest(c, "defaultPrice must be non-negative")
	}
	req.YearID = yearId
	svc := service.NewSponsorshipMenuService()
	if err := svc.Create(&req); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": req, "message": "created"})
}

func updateSponsorshipMenu(c echo.Context) error {
	id := c.Param("menuId")
	var req struct {
		Name               string          `json:"name"`
		DefaultPrice       decimal.Decimal `json:"defaultPrice"`
		RequiresSubmission bool            `json:"requiresSubmission"`
		IsActive           bool            `json:"isActive"`
	}
	if err := c.Bind(&req); err != nil {
		return respondBadRequest(c, err.Error())
	}

	svc := service.NewSponsorshipMenuService()
	existing, err := svc.GetByID(id)
	if err != nil {
		return respondNotFound(c, "sponsorship menu not found")
	}

	existing.Name = req.Name
	existing.DefaultPrice = req.DefaultPrice
	existing.RequiresSubmission = req.RequiresSubmission
	existing.IsActive = req.IsActive

	if err := svc.Update(existing); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": existing, "message": "updated"})
}

func deleteSponsorshipMenu(c echo.Context) error {
	id := c.Param("menuId")
	svc := service.NewSponsorshipMenuService()
	if err := svc.Delete(id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return respondNotFound(c, "sponsorship menu not found")
		}
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"message": "deleted"})
}
