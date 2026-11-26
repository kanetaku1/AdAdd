package integration

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

var commonReviewItemCodes = []string{
	"TEXT_OUTLINED",
	"COLOR_MODE_CMYK",
	"PHOTOS_EMBEDDED",
	"LOGO_BACKGROUND_TRANSPARENT",
}

func reviewFilesPayload(menu model.ContractMenu, includeMediaRequirements, rejectFirst bool) []map[string]any {
	itemCodes := append([]string{}, commonReviewItemCodes...)
	if includeMediaRequirements {
		itemCodes = append(itemCodes, "MEDIA_REQUIREMENTS_MET")
	}
	files := make([]map[string]any, 0)
	for _, file := range menu.Files {
		if menu.CurrentSubmission == nil || file.SubmissionID == nil || *file.SubmissionID != menu.CurrentSubmission.ID {
			continue
		}
		items := make(map[string]string, len(itemCodes))
		for _, code := range itemCodes {
			items[code] = "PASS"
		}
		if rejectFirst && len(files) == 0 {
			items[itemCodes[0]] = "FAIL"
		}
		files = append(files, map[string]any{"fileId": file.ID, "items": items})
	}
	return files
}

func uploadFinalArtwork(t *testing.T, client *apiClient, contractMenuID string) *httptest.ResponseRecorder {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if err := writer.WriteField("folderId", "final-artwork-folder"); err != nil {
		t.Fatal(err)
	}
	if err := writer.WriteField("category", "完成"); err != nil {
		t.Fatal(err)
	}
	part, err := writer.CreateFormFile("file", "final.pdf")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write([]byte("final artwork")); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}

	request := httptest.NewRequest(http.MethodPost, "/contract-menus/"+contractMenuID+"/drive-upload", &body)
	request.Header.Set(echo.HeaderContentType, writer.FormDataContentType())
	client.authenticate(request)
	response := httptest.NewRecorder()
	client.server.ServeHTTP(response, request)
	return response
}

func TestCompanyAdDataReviewRejectsAndAcceptsResubmission(t *testing.T) {
	actors := newActors(t)
	manager := asUser(t, actors.administrator.server, "user-ad-review-manager", "ADVERTISEMENT_MANAGER")
	companyID := createCompany(t, actors.administrator, "広告レビュー企業")
	yearID := createYear(t, actors.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2027, 3, 31))
	menuID := createSponsorshipMenu(t, actors.sponsorshipMember, yearID, "企業広告レビュー", 50000)
	yearlyCompany := loadYearlyCompany(t, yearID, companyID)
	contract := createContract(t, actors.sponsorshipMember, yearlyCompany.ID, map[string]any{
		"sponsorshipMenuId": menuID,
		"quantity":          1,
		"productionType":    "COMPANY",
	})
	listed := actors.sponsorshipMember.do(http.MethodGet, "/contracts/"+contract.ID+"/menus", nil)
	expectStatus(t, listed, http.StatusOK)
	contractMenu := decodeData[[]model.ContractMenu](t, listed)[0]

	firstUpload := actors.sponsorshipMember.do(http.MethodPost, "/contract-menus/"+contractMenu.ID+"/production/files", map[string]any{
		"files": []map[string]string{
			{"driveUrl": "https://drive.google.com/file/d/front/view", "driveFileName": "表面.pdf"},
			{"driveUrl": "https://drive.google.com/file/d/back/view", "driveFileName": "裏面.pdf"},
		},
	})
	expectStatus(t, firstUpload, http.StatusCreated)
	firstSubmission := decodeData[model.ContractMenu](t, firstUpload)
	if firstSubmission.Status != "PROVISIONAL_SUBMITTED" || firstSubmission.ReviewIndicator != "UNREVIEWED" || firstSubmission.CurrentSubmission == nil {
		t.Fatalf("first submission = %+v, want pending provisional submission", firstSubmission)
	}

	reviewPath := "/contract-menus/" + contractMenu.ID + "/submissions/" + firstSubmission.CurrentSubmission.ID + "/review"
	for _, actor := range []struct {
		name   string
		client *apiClient
	}{
		{name: "sponsorship member", client: actors.sponsorshipMember},
		{name: "advisor", client: actors.advisor},
		{name: "finance", client: actors.finance},
		{name: "no role", client: actors.noRole},
	} {
		t.Run("review forbidden for "+actor.name, func(t *testing.T) {
			response := actor.client.do(http.MethodPost, reviewPath, map[string]any{
				"files": reviewFilesPayload(firstSubmission, true, true),
			})
			expectStatus(t, response, http.StatusForbidden)
		})
	}

	rejected := manager.do(http.MethodPost, reviewPath, map[string]any{
		"note":  "チェックリスト外の余白も修正してください。",
		"files": reviewFilesPayload(firstSubmission, true, true),
	})
	expectStatus(t, rejected, http.StatusOK)
	rejectedResult := decodeData[service.ContractMenuReviewResult](t, rejected)
	if rejectedResult.Status != "WAITING" || rejectedResult.SlackDelivery.Status == "NOT_REQUIRED" {
		t.Fatalf("rejected review = %+v, want WAITING and a Slack delivery attempt", rejectedResult)
	}
	if rejectedResult.Workflow == nil || len(rejectedResult.Workflow.Submissions) != 1 ||
		rejectedResult.Workflow.Submissions[0].ReviewNote == nil ||
		*rejectedResult.Workflow.Submissions[0].ReviewNote != "チェックリスト外の余白も修正してください。" {
		t.Fatalf("rejected review note was not retained: %+v", rejectedResult.Workflow)
	}

	secondUpload := actors.sponsorshipMember.do(http.MethodPost, "/contract-menus/"+contractMenu.ID+"/production/files", map[string]any{
		"files": []map[string]string{{"driveUrl": "https://drive.google.com/file/d/revised/view", "driveFileName": "修正版.pdf"}},
	})
	expectStatus(t, secondUpload, http.StatusCreated)
	secondSubmission := decodeData[model.ContractMenu](t, secondUpload)
	if secondSubmission.Status != "PROVISIONAL_SUBMITTED" || secondSubmission.CurrentSubmission == nil || secondSubmission.CurrentSubmission.SubmissionSequence != 2 {
		t.Fatalf("second submission = %+v, want sequence 2 provisional submission", secondSubmission)
	}

	approved := actors.administrator.do(http.MethodPost,
		"/contract-menus/"+contractMenu.ID+"/submissions/"+secondSubmission.CurrentSubmission.ID+"/review",
		map[string]any{"files": reviewFilesPayload(secondSubmission, true, false)},
	)
	expectStatus(t, approved, http.StatusOK)
	approvedResult := decodeData[service.ContractMenuReviewResult](t, approved)
	if approvedResult.Status != "COMPLETED" || approvedResult.SlackDelivery.Status != "NOT_REQUIRED" {
		t.Fatalf("approved review = %+v, want COMPLETED without Slack notification", approvedResult)
	}
	if approvedResult.Workflow == nil || len(approvedResult.Workflow.Submissions) != 2 {
		t.Fatalf("workflow = %+v, want two retained submissions", approvedResult.Workflow)
	}

	thirdUpload := actors.sponsorshipMember.do(http.MethodPost, "/contract-menus/"+contractMenu.ID+"/production/files", map[string]any{
		"files": []map[string]string{{"driveUrl": "https://drive.google.com/file/d/late/view", "driveFileName": "再々提出.pdf"}},
	})
	expectStatus(t, thirdUpload, http.StatusCreated)
	thirdSubmission := decodeData[model.ContractMenu](t, thirdUpload)
	createYear(t, actors.administrator, "2027", festivalDate(2027, 4, 1), festivalDate(2028, 3, 31))
	pastReview := manager.do(http.MethodPost,
		"/contract-menus/"+contractMenu.ID+"/submissions/"+thirdSubmission.CurrentSubmission.ID+"/review",
		map[string]any{"files": reviewFilesPayload(thirdSubmission, true, false)},
	)
	expectStatus(t, pastReview, http.StatusConflict)
}

func TestContinuedAdDataReviewCompletes(t *testing.T) {
	actors := newActors(t)
	manager := asUser(t, actors.administrator.server, "user-continued-ad-manager", "ADVERTISEMENT_MANAGER")
	companyID := createCompany(t, actors.administrator, "継続広告レビュー企業")
	yearID := createYear(t, actors.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2027, 3, 31))
	menuID := createSponsorshipMenu(t, actors.sponsorshipMember, yearID, "継続広告", 20000)
	yearlyCompany := loadYearlyCompany(t, yearID, companyID)
	contract := createContract(t, actors.sponsorshipMember, yearlyCompany.ID, map[string]any{
		"sponsorshipMenuId": menuID,
		"quantity":          1,
		"productionType":    "CONTINUED",
	})
	listed := actors.sponsorshipMember.do(http.MethodGet, "/contracts/"+contract.ID+"/menus", nil)
	expectStatus(t, listed, http.StatusOK)
	contractMenu := decodeData[[]model.ContractMenu](t, listed)[0]

	uploadedResponse := actors.sponsorshipMember.do(http.MethodPost, "/contract-menus/"+contractMenu.ID+"/production/files", map[string]any{
		"files": []map[string]string{{"driveUrl": "https://drive.google.com/file/d/continued/view", "driveFileName": "継続広告.pdf"}},
	})
	expectStatus(t, uploadedResponse, http.StatusCreated)
	uploaded := decodeData[model.ContractMenu](t, uploadedResponse)
	reviewed := manager.do(http.MethodPost,
		"/contract-menus/"+contractMenu.ID+"/submissions/"+uploaded.CurrentSubmission.ID+"/review",
		map[string]any{"files": reviewFilesPayload(uploaded, true, false)},
	)
	expectStatus(t, reviewed, http.StatusOK)
	if result := decodeData[service.ContractMenuReviewResult](t, reviewed); result.Status != "COMPLETED" {
		t.Fatalf("continued review status = %q, want COMPLETED", result.Status)
	}
}

func TestInternalProductionCompletesWithoutFinalReview(t *testing.T) {
	actors := newActors(t)
	manager := asUser(t, actors.administrator.server, "user-internal-ad-manager", "ADVERTISEMENT_MANAGER")
	companyID := createCompany(t, actors.administrator, "委員制作レビュー企業")
	yearID := createYear(t, actors.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2027, 3, 31))
	menuID := createSponsorshipMenu(t, actors.sponsorshipMember, yearID, "委員制作広告", 30000)
	yearlyCompany := loadYearlyCompany(t, yearID, companyID)
	contract := createContract(t, actors.sponsorshipMember, yearlyCompany.ID, map[string]any{
		"sponsorshipMenuId": menuID,
		"quantity":          1,
		"productionType":    "INTERNAL",
	})
	listed := actors.sponsorshipMember.do(http.MethodGet, "/contracts/"+contract.ID+"/menus", nil)
	expectStatus(t, listed, http.StatusOK)
	contractMenu := decodeData[[]model.ContractMenu](t, listed)[0]

	materialUpload := actors.sponsorshipMember.do(http.MethodPost, "/contract-menus/"+contractMenu.ID+"/production/files", map[string]any{
		"files": []map[string]string{{"driveUrl": "https://drive.google.com/file/d/material/view", "driveFileName": "素材.pdf"}},
	})
	expectStatus(t, materialUpload, http.StatusCreated)
	material := decodeData[model.ContractMenu](t, materialUpload)
	materialReview := manager.do(http.MethodPost,
		"/contract-menus/"+contractMenu.ID+"/submissions/"+material.CurrentSubmission.ID+"/review",
		map[string]any{"files": reviewFilesPayload(material, false, false)},
	)
	expectStatus(t, materialReview, http.StatusOK)
	if result := decodeData[service.ContractMenuReviewResult](t, materialReview); result.Status != "MATERIAL_COMPLETED" {
		t.Fatalf("material review status = %q, want MATERIAL_COMPLETED", result.Status)
	}

	statusPath := "/contract-menus/" + contractMenu.ID + "/status"
	expectStatus(t, manager.do(http.MethodPatch, statusPath, map[string]any{"status": "REQUESTED"}), http.StatusOK)
	expectStatus(t, manager.do(http.MethodPatch, statusPath, map[string]any{"status": "COMPANY_REVIEWING"}), http.StatusOK)

	memberFinalUpload := uploadFinalArtwork(t, actors.sponsorshipMember, contractMenu.ID)
	expectStatus(t, memberFinalUpload, http.StatusForbidden)
	managerFinalUpload := uploadFinalArtwork(t, manager, contractMenu.ID)
	expectStatus(t, managerFinalUpload, http.StatusOK)
	completed := decodeData[model.ContractMenu](t, managerFinalUpload)
	if completed.Status != "COMPLETED" || completed.CurrentSubmission == nil || completed.CurrentSubmission.Kind != "FINAL_DATA" || completed.CurrentSubmission.ReviewStatus != "APPROVED" {
		t.Fatalf("final upload = %+v, want approved FINAL_DATA and COMPLETED", completed)
	}
	if completed.CurrentSubmission.SubmissionSequence != 2 {
		t.Fatalf("final submission sequence = %d, want 2", completed.CurrentSubmission.SubmissionSequence)
	}
}
