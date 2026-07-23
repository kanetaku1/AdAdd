package handler

import (
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

func RegisterSponsorshipMenuRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/years/:yearId/sponsorship-menus", listSponsorshipMenus)
	// manage menus requires staff or admin
	rStaff := e.Group("")
	rStaff.Use(RequireRoles("staff", "admin"))
	rStaff.POST("/years/:yearId/sponsorship-menus", createSponsorshipMenu)
	rStaff.PATCH("/sponsorship-menus/:menuId", updateSponsorshipMenu)
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
	var req model.SponsorshipMenu
	if err := c.Bind(&req); err != nil {
		return respondBadRequest(c, err.Error())
	}
	req.ID = id
	svc := service.NewSponsorshipMenuService()
	if err := svc.Update(&req); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": req, "message": "updated"})
}
