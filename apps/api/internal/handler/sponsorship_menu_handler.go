package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
)

func RegisterSponsorshipMenuRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/years/:yearId/sponsorship-menus", listSponsorshipMenus)
	r.POST("/years/:yearId/sponsorship-menus", createSponsorshipMenu)
	r.PATCH("/sponsorship-menus/:menuId", updateSponsorshipMenu)
}

func listSponsorshipMenus(c echo.Context) error {
	yearId := c.Param("yearId")
	svc := service.NewSponsorshipMenuService()
	list, err := svc.ListByYear(yearId)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": list, "message": "success"})
}

func createSponsorshipMenu(c echo.Context) error {
	yearId := c.Param("yearId")
	var req model.SponsorshipMenu
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}
	req.YearID = yearId
	svc := service.NewSponsorshipMenuService()
	if err := svc.Create(&req); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": req, "message": "created"})
}

func updateSponsorshipMenu(c echo.Context) error {
	id := c.Param("menuId")
	var req model.SponsorshipMenu
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"error": err.Error()})
	}
	req.ID = id
	svc := service.NewSponsorshipMenuService()
	if err := svc.Update(&req); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": req, "message": "updated"})
}
