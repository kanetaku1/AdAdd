package service

import (
	"errors"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/testdb"
)

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
}
