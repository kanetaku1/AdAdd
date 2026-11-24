package handler

import (
	"errors"
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func getContractMenuReviewWorkflow(c echo.Context) error {
	workflow, err := service.NewContractMenuService().GetReviewWorkflow(c.Param("id"))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return respondNotFound(c, "contract menu not found")
		}
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": workflow, "message": "success"})
}

func reviewContractMenuSubmission(c echo.Context) error {
	var body struct {
		Files []struct {
			FileID string          `json:"fileId"`
			Items  map[string]bool `json:"items"`
		} `json:"files"`
	}
	if err := c.Bind(&body); err != nil {
		return respondRequestBodyError(c, err, "invalid request body")
	}

	inputs := make([]service.ContractMenuFileReviewInput, 0, len(body.Files))
	for _, file := range body.Files {
		inputs = append(inputs, service.ContractMenuFileReviewInput{FileID: file.FileID, Items: file.Items})
	}
	userID, _ := c.Get("userId").(string)
	result, err := service.NewContractMenuService().ReviewSubmission(
		c.Param("id"), c.Param("submissionId"), userID, inputs,
	)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			return respondNotFound(c, "contract menu or submission not found")
		case errors.Is(err, service.ErrPastYearReadOnly),
			errors.Is(err, service.ErrInvalidContractMenuReview):
			return respondConflict(c, err.Error())
		default:
			return respondInternalServerError(c, err)
		}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": result, "message": "reviewed"})
}
