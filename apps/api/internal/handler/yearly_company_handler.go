package handler

import (
	"errors"
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/label"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func RegisterYearlyCompanyRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/years/:yearId/companies", listYearlyCompanies)
	r.GET("/yearly-companies/:id", getYearlyCompany)
	r.GET("/yearly-companies/:id/progress", getProgress)
	// Create and updates require staff or admin
	rStaff := e.Group("")
	rStaff.Use(RequireRoles("SPONSORSHIP_MEMBER", "ADMINISTRATOR"))
	rStaff.POST("/years/:yearId/companies", createYearlyCompany)
	rStaff.PATCH("/yearly-companies/:id/company-status", updateCompanyStatus)
	rStaff.PATCH("/yearly-companies/:id/phase", updatePhase)
	rStaff.PATCH("/yearly-companies/:id/progress", updateProgress)
	rStaff.PATCH("/yearly-companies/:id/company-contact", updateCompanyContact)
}

func getYearlyCompany(c echo.Context) error {
	id := c.Param("id")
	svc := service.NewYearlyCompanyService()
	yc, err := svc.GetByID(id)
	if err != nil {
		return respondNotFound(c, "yearly company not found")
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": yc, "message": "success"})
}

func getProgress(c echo.Context) error {
	id := c.Param("id")
	svc := service.NewYearlyCompanyService()
	yc, err := svc.GetByID(id)
	if err != nil {
		return respondNotFound(c, "yearly company not found")
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"data":    map[string]string{"progress": yc.Progress},
		"message": "success",
	})
}

func updateProgress(c echo.Context) error {
	id := c.Param("id")
	var body struct {
		Progress string `json:"progress"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	if err := ValidateProgress(body.Progress); err != nil {
		return respondBadRequest(c, err.Error())
	}
	svc := service.NewYearlyCompanyService()
	yc, err := svc.GetByID(id)
	if err != nil {
		return respondNotFound(c, "yearly company not found")
	}
	oldVal := yc.Progress
	yc.Progress = body.Progress

	userID := ""
	if uid := c.Get("userId"); uid != nil {
		userID = uid.(string)
	}
	logEntry := &model.ActivityLog{
		YearlyCompanyID: yc.ID,
		UserID:          userID,
		Action:          model.EventProgressUpdated,
		Description:     label.StatusChange("進捗", label.Progress(oldVal), label.Progress(yc.Progress)),
	}

	if err := svc.UpdateWithLog(&yc.YearlyCompany, logEntry); err != nil {
		return respondInternalServerError(c, err)
	}
	service.NotifyAssigneeOnConfirmedAsync(id, oldVal, body.Progress)
	return c.JSON(http.StatusOK, map[string]interface{}{"data": yc, "message": "updated"})
}

func listYearlyCompanies(c echo.Context) error {
	yearId := c.Param("yearId")
	svc := service.NewYearlyCompanyService()
	list, err := svc.ListByYear(yearId)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": list, "message": "success"})
}

func createYearlyCompany(c echo.Context) error {
	yearId := c.Param("yearId")
	var req model.YearlyCompany
	if err := c.Bind(&req); err != nil {
		return respondBadRequest(c, err.Error())
	}
	// validation
	if req.CompanyID == "" {
		return respondBadRequest(c, "companyId is required")
	}
	req.YearID = yearId
	svc := service.NewYearlyCompanyService()
	if err := svc.Create(&req); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": req, "message": "created"})
}

func updateCompanyStatus(c echo.Context) error {
	id := c.Param("id")
	var body struct {
		CompanyStatus string `json:"companyStatus"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	if err := ValidateCompanyStatus(body.CompanyStatus); err != nil {
		return respondBadRequest(c, err.Error())
	}
	svc := service.NewYearlyCompanyService()
	yc, err := svc.GetByID(id)
	if err != nil {
		return respondNotFound(c, "yearly company not found")
	}
	oldVal := yc.CompanyStatus
	yc.CompanyStatus = body.CompanyStatus

	userID := ""
	if uid := c.Get("userId"); uid != nil {
		userID = uid.(string)
	}
	logEntry := &model.ActivityLog{
		YearlyCompanyID: yc.ID,
		UserID:          userID,
		Action:          model.EventCompanyStatusUpdated,
		Description:     label.StatusChange("企業ステータス", label.CompanyStatus(oldVal), label.CompanyStatus(yc.CompanyStatus)),
	}

	if err := svc.UpdateWithLog(&yc.YearlyCompany, logEntry); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": yc, "message": "updated"})
}

func updatePhase(c echo.Context) error {
	id := c.Param("id")
	var body struct {
		Phase string `json:"phase"`
	}
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	if err := ValidatePhase(body.Phase); err != nil {
		return respondBadRequest(c, err.Error())
	}
	svc := service.NewYearlyCompanyService()
	yc, err := svc.GetByID(id)
	if err != nil {
		return respondNotFound(c, "yearly company not found")
	}
	oldVal := yc.Phase
	yc.Phase = body.Phase

	userID := ""
	if uid := c.Get("userId"); uid != nil {
		userID = uid.(string)
	}
	logEntry := &model.ActivityLog{
		YearlyCompanyID: yc.ID,
		UserID:          userID,
		Action:          model.EventPhaseUpdated,
		Description:     label.StatusChange("フェーズ", label.Phase(oldVal), label.Phase(yc.Phase)),
	}

	if err := svc.UpdateWithLog(&yc.YearlyCompany, logEntry); err != nil {
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": yc, "message": "updated"})
}

func updateCompanyContact(c echo.Context) error {
	id := c.Param("id")
	var body model.CompanyContactInput
	if err := c.Bind(&body); err != nil {
		return respondBadRequest(c, err.Error())
	}
	svc := service.NewYearlyCompanyService()
	yc, err := svc.UpdateContact(id, body)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return respondNotFound(c, "yearly company not found")
		}
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": yc, "message": "updated"})
}
