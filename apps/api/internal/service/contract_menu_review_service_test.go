package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/testdb"
)

type reviewTestSlackPoster struct {
	message string
	err     error
}

func (*reviewTestSlackPoster) Enabled() bool { return true }
func (p *reviewTestSlackPoster) PostMessage(_ context.Context, message string) error {
	p.message = message
	return p.err
}

func completeChecklist(checked bool) map[string]bool {
	items := make(map[string]bool, len(ContractMenuReviewChecklist))
	for _, definition := range ContractMenuReviewChecklist {
		items[definition.Code] = checked
	}
	return items
}

func TestValidateContractMenuReviewInputs(t *testing.T) {
	files := []model.ContractMenuDriveFile{{ID: "file-1", DriveFileName: "ad.pdf"}}

	_, allPassed, missing, err := validateContractMenuReviewInputs(files, []ContractMenuFileReviewInput{{
		FileID: "file-1", Items: completeChecklist(true),
	}})
	if err != nil || !allPassed || len(missing) != 0 {
		t.Fatalf("approved validation = passed:%v missing:%v err:%v", allPassed, missing, err)
	}

	items := completeChecklist(true)
	items["CONTENT_COMPLETE"] = false
	_, allPassed, missing, err = validateContractMenuReviewInputs(files, []ContractMenuFileReviewInput{{
		FileID: "file-1", Items: items,
	}})
	if err != nil || allPassed || len(missing) != 1 {
		t.Fatalf("rejected validation = passed:%v missing:%v err:%v", allPassed, missing, err)
	}

	delete(items, "FILE_OPENS")
	_, _, _, err = validateContractMenuReviewInputs(files, []ContractMenuFileReviewInput{{FileID: "file-1", Items: items}})
	if !errors.Is(err, ErrInvalidContractMenuReview) {
		t.Fatalf("incomplete checklist error = %v", err)
	}
}

func seedReviewableSubmission(t *testing.T, productionType string) (*model.ContractMenu, *model.ContractMenuSubmission) {
	t.Helper()
	cm := seedStatusLogContractMenu(t)
	if err := db.DB.Model(cm).Update("production_type", productionType).Error; err != nil {
		t.Fatalf("set production type: %v", err)
	}
	updated, err := NewContractMenuService().AddFiles(cm.ID, []ContractMenuDriveFileInput{
		{DriveURL: "https://drive.google.com/file/d/one/view", DriveFileName: "one.pdf"},
		{DriveURL: "https://drive.google.com/file/d/two/view", DriveFileName: "two.pdf"},
	}, "user-test")
	if err != nil {
		t.Fatalf("add submission: %v", err)
	}
	if updated.CurrentSubmission == nil {
		t.Fatal("current submission is nil")
	}
	return updated, updated.CurrentSubmission
}

func assignReviewSlackRecipient(t *testing.T) {
	t.Helper()
	if err := db.DB.Model(&model.User{}).Where("id = ?", testActorUserID).Update("slack_id", "U-REVIEWER").Error; err != nil {
		t.Fatalf("set Slack ID: %v", err)
	}
	if err := db.DB.Create(&model.CompanyAssignment{
		YearlyCompanyID: testYearlyCompanyID,
		UserID:          testActorUserID,
		AssignedAt:      time.Now(),
	}).Error; err != nil {
		t.Fatalf("create assignment: %v", err)
	}
}

func TestReviewSubmissionApprovesCompanyFiles(t *testing.T) {
	testdb.Open(t)
	menu, submission := seedReviewableSubmission(t, "COMPANY")
	inputs := make([]ContractMenuFileReviewInput, 0, len(menu.Files))
	for _, file := range menu.Files {
		inputs = append(inputs, ContractMenuFileReviewInput{FileID: file.ID, Items: completeChecklist(true)})
	}

	result, err := NewContractMenuService().ReviewSubmission(menu.ID, submission.ID, "user-test", inputs)
	if err != nil {
		t.Fatalf("review submission: %v", err)
	}
	if result.Status != "COMPLETED" {
		t.Fatalf("status = %q, want COMPLETED", result.Status)
	}
	if len(result.Workflow.Submissions) != 1 || len(result.Workflow.Submissions[0].Reviews) != 2 {
		t.Fatalf("workflow submissions = %+v", result.Workflow.Submissions)
	}
	for _, review := range result.Workflow.Submissions[0].Reviews {
		if review.Result != "APPROVED" || len(review.Items) != len(ContractMenuReviewChecklist) {
			t.Fatalf("review = %+v", review)
		}
	}
}

func TestReviewSubmissionRequestsInternalChanges(t *testing.T) {
	testdb.Open(t)
	menu, submission := seedReviewableSubmission(t, "INTERNAL")
	assignReviewSlackRecipient(t)
	poster := &reviewTestSlackPoster{}
	SetSlackPosterForTest(poster)
	t.Cleanup(func() { SetSlackPosterForTest(nil) })
	inputs := make([]ContractMenuFileReviewInput, 0, len(menu.Files))
	for index, file := range menu.Files {
		items := completeChecklist(true)
		if index == 0 {
			items["FORMAT_CORRECT"] = false
		}
		inputs = append(inputs, ContractMenuFileReviewInput{FileID: file.ID, Items: items})
	}

	result, err := NewContractMenuService().ReviewSubmission(menu.ID, submission.ID, "user-test", inputs)
	if err != nil {
		t.Fatalf("review submission: %v", err)
	}
	if result.Status != "WAITING" {
		t.Fatalf("status = %q, want WAITING", result.Status)
	}
	if result.Workflow.Submissions[0].ReviewStatus != "CHANGES_REQUESTED" {
		t.Fatalf("review status = %q", result.Workflow.Submissions[0].ReviewStatus)
	}
	if result.SlackDelivery.Status != "SENT" {
		t.Fatalf("Slack delivery = %+v", result.SlackDelivery)
	}
	if !strings.Contains(poster.message, "<@U-REVIEWER>") || !strings.Contains(poster.message, "FORMAT") && !strings.Contains(poster.message, "ファイル形式") {
		t.Fatalf("Slack message = %q", poster.message)
	}
}

func TestReviewSubmissionKeepsResultWhenSlackFails(t *testing.T) {
	testdb.Open(t)
	menu, submission := seedReviewableSubmission(t, "COMPANY")
	assignReviewSlackRecipient(t)
	poster := &reviewTestSlackPoster{err: fmt.Errorf("temporary Slack failure")}
	SetSlackPosterForTest(poster)
	t.Cleanup(func() { SetSlackPosterForTest(nil) })

	inputs := make([]ContractMenuFileReviewInput, 0, len(menu.Files))
	for _, file := range menu.Files {
		inputs = append(inputs, ContractMenuFileReviewInput{FileID: file.ID, Items: completeChecklist(false)})
	}
	result, err := NewContractMenuService().ReviewSubmission(menu.ID, submission.ID, "user-test", inputs)
	if err != nil {
		t.Fatalf("review submission: %v", err)
	}
	if result.Status != "WAITING" || result.SlackDelivery.Status != "FAILED" {
		t.Fatalf("result = %+v", result)
	}
	var stored model.ContractMenuSubmission
	if err := db.DB.First(&stored, "id = ?", submission.ID).Error; err != nil {
		t.Fatalf("load reviewed submission: %v", err)
	}
	if stored.ReviewStatus != "CHANGES_REQUESTED" {
		t.Fatalf("review status rolled back: %q", stored.ReviewStatus)
	}
}

func TestReviewSubmissionRejectsPastYear(t *testing.T) {
	testdb.Open(t)
	menu, submission := seedReviewableSubmission(t, "COMPANY")
	if err := db.DB.Model(&model.Year{}).Where("id = ?", testYearID).Update("is_active", false).Error; err != nil {
		t.Fatalf("deactivate year: %v", err)
	}
	inputs := make([]ContractMenuFileReviewInput, 0, len(menu.Files))
	for _, file := range menu.Files {
		inputs = append(inputs, ContractMenuFileReviewInput{FileID: file.ID, Items: completeChecklist(true)})
	}
	_, err := NewContractMenuService().ReviewSubmission(menu.ID, submission.ID, "user-test", inputs)
	if !errors.Is(err, ErrPastYearReadOnly) {
		t.Fatalf("err = %v, want ErrPastYearReadOnly", err)
	}
}
