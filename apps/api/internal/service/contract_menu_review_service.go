package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ContractMenuChecklistItem struct {
	Code  string `json:"code"`
	Label string `json:"label"`
}

var ContractMenuReviewChecklist = []ContractMenuChecklistItem{
	{Code: "FILE_OPENS", Label: "ファイルを問題なく開ける"},
	{Code: "FORMAT_CORRECT", Label: "指定されたファイル形式である"},
	{Code: "SIZE_RESOLUTION_CORRECT", Label: "サイズ・解像度が要件を満たす"},
	{Code: "CONTENT_COMPLETE", Label: "必要な内容がすべて揃っている"},
}

type ContractMenuFileReviewInput struct {
	FileID string
	Items  map[string]bool
}

type ContractMenuReviewWorkflow struct {
	Checklist   []ContractMenuChecklistItem       `json:"checklist"`
	Submissions []model.ContractMenuSubmission    `json:"submissions"`
	Events      []model.ContractMenuWorkflowEvent `json:"events"`
}

type ContractMenuReviewResult struct {
	Status        string                      `json:"status"`
	SlackDelivery SlackDeliveryResult         `json:"slackDelivery"`
	Workflow      *ContractMenuReviewWorkflow `json:"workflow"`
}

func (s *ContractMenuService) GetReviewWorkflow(contractMenuID string) (*ContractMenuReviewWorkflow, error) {
	if _, err := s.repo.GetByID(contractMenuID); err != nil {
		return nil, err
	}

	var submissions []model.ContractMenuSubmission
	if err := db.DB.Where("contract_menu_id = ?", contractMenuID).
		Preload("Files", func(q *gorm.DB) *gorm.DB { return q.Order("created_at ASC, id ASC") }).
		Preload("Reviews", func(q *gorm.DB) *gorm.DB { return q.Order("reviewed_at ASC, id ASC") }).
		Preload("Reviews.Items", func(q *gorm.DB) *gorm.DB { return q.Order("created_at ASC, id ASC") }).
		Order("submission_sequence ASC").Find(&submissions).Error; err != nil {
		return nil, err
	}

	var events []model.ContractMenuWorkflowEvent
	if err := db.DB.Table("contract_menu_workflow_events AS events").
		Select("events.*, users.name AS actor_name").
		Joins("LEFT JOIN users ON users.id = events.actor_id AND users.deleted_at IS NULL").
		Where("events.contract_menu_id = ?", contractMenuID).
		Order("events.created_at ASC, events.id ASC").Scan(&events).Error; err != nil {
		return nil, err
	}

	return &ContractMenuReviewWorkflow{
		Checklist:   ContractMenuReviewChecklist,
		Submissions: submissions,
		Events:      events,
	}, nil
}

func validateContractMenuReviewInputs(files []model.ContractMenuDriveFile, inputs []ContractMenuFileReviewInput) (map[string]ContractMenuFileReviewInput, bool, []string, error) {
	if len(files) == 0 || len(inputs) != len(files) {
		return nil, false, nil, fmt.Errorf("%w: every file must be reviewed", ErrInvalidContractMenuReview)
	}

	byFile := make(map[string]ContractMenuFileReviewInput, len(inputs))
	for _, input := range inputs {
		if input.FileID == "" {
			return nil, false, nil, fmt.Errorf("%w: fileId is required", ErrInvalidContractMenuReview)
		}
		if _, duplicate := byFile[input.FileID]; duplicate {
			return nil, false, nil, fmt.Errorf("%w: duplicate fileId", ErrInvalidContractMenuReview)
		}
		byFile[input.FileID] = input
	}

	allPassed := true
	missingLabels := make([]string, 0)
	for _, file := range files {
		input, ok := byFile[file.ID]
		if !ok || len(input.Items) != len(ContractMenuReviewChecklist) {
			return nil, false, nil, fmt.Errorf("%w: checklist is incomplete", ErrInvalidContractMenuReview)
		}
		for _, definition := range ContractMenuReviewChecklist {
			checked, exists := input.Items[definition.Code]
			if !exists {
				return nil, false, nil, fmt.Errorf("%w: checklist is incomplete", ErrInvalidContractMenuReview)
			}
			if !checked {
				allPassed = false
				missingLabels = append(missingLabels, file.DriveFileName+": "+definition.Label)
			}
		}
	}
	return byFile, allPassed, missingLabels, nil
}

func (s *ContractMenuService) ReviewSubmission(contractMenuID, submissionID, reviewerID string, inputs []ContractMenuFileReviewInput) (*ContractMenuReviewResult, error) {
	targetStatus := ""
	yearlyCompanyID := ""
	missingItems := make([]string, 0)
	err := db.WithTx(func(tx *gorm.DB) error {
		if err := ensureContractMenuActiveYear(tx, contractMenuID); err != nil {
			return err
		}

		var menu model.ContractMenu
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&menu, "id = ?", contractMenuID).Error; err != nil {
			return err
		}
		var current model.ContractMenuSubmission
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("contract_menu_id = ?", contractMenuID).
			Order("submission_sequence DESC").First(&current).Error; err != nil {
			return err
		}
		if current.ID != submissionID || current.ReviewStatus != "PENDING" || current.Kind == "FINAL_DATA" {
			return fmt.Errorf("%w: submission is not reviewable", ErrInvalidContractMenuReview)
		}

		var files []model.ContractMenuDriveFile
		if err := tx.Where("submission_id = ?", submissionID).
			Order("created_at ASC, id ASC").Find(&files).Error; err != nil {
			return err
		}
		byFile, allPassed, missingLabels, err := validateContractMenuReviewInputs(files, inputs)
		if err != nil {
			return err
		}
		missingItems = missingLabels

		now := time.Now()
		for _, file := range files {
			input := byFile[file.ID]
			result := "APPROVED"
			for _, checked := range input.Items {
				if !checked {
					result = "CHANGES_REQUESTED"
					break
				}
			}
			review := &model.ContractMenuFileReview{
				SubmissionID:            submissionID,
				ContractMenuDriveFileID: file.ID,
				ReviewerID:              optionalUserID(reviewerID),
				Result:                  result,
				ReviewedAt:              now,
			}
			if err := tx.Create(review).Error; err != nil {
				return err
			}
			for _, definition := range ContractMenuReviewChecklist {
				item := &model.ContractMenuFileReviewItem{
					ReviewID: review.ID, ItemCode: definition.Code, Label: definition.Label,
					IsChecked: input.Items[definition.Code],
				}
				if err := tx.Create(item).Error; err != nil {
					return err
				}
			}
		}

		reviewStatus := "CHANGES_REQUESTED"
		targetStatus = "WAITING"
		if allPassed {
			reviewStatus = "APPROVED"
			targetStatus = "COMPLETED"
			if menu.ProductionType != nil && *menu.ProductionType == "INTERNAL" {
				targetStatus = "MATERIAL_COMPLETED"
			}
		}
		if err := tx.Model(&current).Updates(map[string]interface{}{
			"review_status":  reviewStatus,
			"reviewed_by_id": optionalUserID(reviewerID),
			"reviewed_at":    now,
		}).Error; err != nil {
			return err
		}
		if err := tx.Model(&menu).Update("status", targetStatus).Error; err != nil {
			return err
		}

		logContext, err := loadContractMenuFileLogContext(tx, contractMenuID)
		if err != nil {
			return err
		}
		if menu.Status != targetStatus {
			if err := writeActivityLog(tx, logContext.YearlyCompanyID, reviewerID, model.EventContractMenuStatusUpdated,
				contractMenuStatusLogMessage(logContext.MenuName, menu.Status, targetStatus)); err != nil {
				return err
			}
		}
		yearlyCompanyID = logContext.YearlyCompanyID
		details, _ := json.Marshal(map[string]interface{}{
			"result": reviewStatus, "status": targetStatus, "missingItems": missingLabels,
		})
		return tx.Create(&model.ContractMenuWorkflowEvent{
			ContractMenuID: contractMenuID,
			SubmissionID:   &submissionID,
			EventType:      "SUBMISSION_REVIEWED",
			ActorID:        optionalUserID(reviewerID),
			Details:        details,
		}).Error
	})
	if err != nil {
		return nil, err
	}

	delivery := SlackDeliveryResult{Status: "NOT_REQUIRED"}
	if targetStatus == "WAITING" {
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		delivery = NotifyAssigneeReviewChanges(ctx, yearlyCompanyID, missingItems)
		cancel()
		details, _ := json.Marshal(delivery)
		if err := db.DB.Create(&model.ContractMenuWorkflowEvent{
			ContractMenuID: contractMenuID,
			SubmissionID:   &submissionID,
			EventType:      "SLACK_NOTIFICATION_" + delivery.Status,
			ActorID:        optionalUserID(reviewerID),
			Details:        details,
		}).Error; err != nil {
			log.Printf("record contract menu Slack delivery: %v", err)
		}
	}

	workflow, err := s.GetReviewWorkflow(contractMenuID)
	if err != nil {
		return nil, err
	}
	return &ContractMenuReviewResult{Status: targetStatus, SlackDelivery: delivery, Workflow: workflow}, nil
}
