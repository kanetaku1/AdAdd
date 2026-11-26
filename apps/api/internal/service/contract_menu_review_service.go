package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ContractMenuChecklistItem struct {
	Code        string `json:"code"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

const (
	ReviewItemPass                  = "PASS"
	ReviewItemFail                  = "FAIL"
	ReviewItemNotApplicable         = "NOT_APPLICABLE"
	MaxContractMenuReviewNoteLength = 2000
)

var commonPDFReviewChecklist = []ContractMenuChecklistItem{
	{Code: "TEXT_OUTLINED", Label: "テキストがアウトライン化されている", Description: "PDF提出時に確認します。フォントトラブルを防止するための項目です。"},
	{Code: "COLOR_MODE_CMYK", Label: "カラーモードがCMYKになっている", Description: "PDF提出時に確認します。印刷時の色再現性を確保するための項目です。"},
	{Code: "PHOTOS_EMBEDDED", Label: "写真がある場合は埋め込まれている", Description: "PDF内に写真がある場合に確認します。写真を使用していない場合は「対象外」を選択します。"},
	{Code: "LOGO_BACKGROUND_TRANSPARENT", Label: "ロゴデータの背景が透過されている", Description: "ロゴデータはPDFまたはPNGで提出できます。ロゴデータを含まない場合は「対象外」を選択します。"},
}

var adDataReviewChecklist = append(append([]ContractMenuChecklistItem{}, commonPDFReviewChecklist...), ContractMenuChecklistItem{
	Code:  "MEDIA_REQUIREMENTS_MET",
	Label: "契約した広告枠のサイズ・比率・枚数を満たしている",
	Description: "パンフレット: 1/8ページ 44×62mm (22:31)、1/4ページ 44×130mm (22:65)、1/2ページ 92×130mm (46:65)、1ページ 190×130mm (19:13)、2ページ見開き (190×130mm)×2。" +
		"ホームページ: 2:3。ステージ裏横断幕: 2378×841mm、1枚のデータ。総合研究棟横断幕: 4000×1000mm。うちわ: 指定テンプレート。SNS: 4:5の縦長、2～3枚。",
})

func contractMenuReviewChecklist(kind string) []ContractMenuChecklistItem {
	if kind == "MATERIAL" {
		return commonPDFReviewChecklist
	}
	if kind == "AD_DATA" {
		return adDataReviewChecklist
	}
	return nil
}

type ContractMenuFileReviewInput struct {
	FileID string
	Items  map[string]string
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

	checklist := []ContractMenuChecklistItem{}
	if len(submissions) > 0 {
		checklist = contractMenuReviewChecklist(submissions[len(submissions)-1].Kind)
	}
	return &ContractMenuReviewWorkflow{
		Checklist:   checklist,
		Submissions: submissions,
		Events:      events,
	}, nil
}

func validateContractMenuReviewInputs(files []model.ContractMenuDriveFile, checklist []ContractMenuChecklistItem, inputs []ContractMenuFileReviewInput) (map[string]ContractMenuFileReviewInput, bool, []string, error) {
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
		if !ok || len(input.Items) != len(checklist) {
			return nil, false, nil, fmt.Errorf("%w: checklist is incomplete", ErrInvalidContractMenuReview)
		}
		for _, definition := range checklist {
			result, exists := input.Items[definition.Code]
			if !exists {
				return nil, false, nil, fmt.Errorf("%w: checklist is incomplete", ErrInvalidContractMenuReview)
			}
			if result != ReviewItemPass && result != ReviewItemFail && result != ReviewItemNotApplicable {
				return nil, false, nil, fmt.Errorf("%w: invalid checklist result", ErrInvalidContractMenuReview)
			}
			if result == ReviewItemFail {
				allPassed = false
				missingLabels = append(missingLabels, file.DriveFileName+": "+definition.Label)
			}
		}
	}
	return byFile, allPassed, missingLabels, nil
}

func (s *ContractMenuService) ReviewSubmission(contractMenuID, submissionID, reviewerID, note string, inputs []ContractMenuFileReviewInput) (*ContractMenuReviewResult, error) {
	note = strings.TrimSpace(note)
	if utf8.RuneCountInString(note) > MaxContractMenuReviewNoteLength {
		return nil, fmt.Errorf("%w: note must be at most %d characters", ErrInvalidContractMenuReview, MaxContractMenuReviewNoteLength)
	}
	var reviewNote *string
	if note != "" {
		reviewNote = &note
	}
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
		checklist := contractMenuReviewChecklist(current.Kind)
		byFile, allPassed, missingLabels, err := validateContractMenuReviewInputs(files, checklist, inputs)
		if err != nil {
			return err
		}
		missingItems = missingLabels
		if note != "" {
			allPassed = false
		}

		now := time.Now()
		for _, file := range files {
			input := byFile[file.ID]
			result := "APPROVED"
			for _, itemResult := range input.Items {
				if itemResult == ReviewItemFail {
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
			for _, definition := range checklist {
				item := &model.ContractMenuFileReviewItem{
					ReviewID: review.ID, ItemCode: definition.Code, Label: definition.Label,
					Result: input.Items[definition.Code],
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
			"review_note":    reviewNote,
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
			"result": reviewStatus, "status": targetStatus, "missingItems": missingLabels, "note": note,
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
	if len(missingItems) > 0 || note != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		delivery = NotifyAssigneeReviewChanges(ctx, yearlyCompanyID, missingItems, note)
		cancel()
		details, _ := json.Marshal(map[string]interface{}{
			"status": delivery.Status, "reason": delivery.Reason,
			"missingItems": missingItems, "note": note,
		})
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
