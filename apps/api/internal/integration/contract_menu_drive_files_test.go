package integration

import (
	"net/http"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

func TestContractMenuDriveFilesLifecyclePermissionsAndPastYear(t *testing.T) {
	actors := newActors(t)
	companyID := createCompany(t, actors.administrator, "複数資料テスト企業")
	yearID := createYear(t, actors.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2027, 3, 31))
	menuID := createSponsorshipMenu(t, actors.sponsorshipMember, yearID, "複数資料メニュー", 10000)
	yearlyCompany := loadYearlyCompany(t, yearID, companyID)
	contract := createContract(t, actors.sponsorshipMember, yearlyCompany.ID)

	added := actors.sponsorshipMember.do(http.MethodPost, "/contracts/"+contract.ID+"/menus", map[string]any{
		"sponsorshipMenuId": menuID,
		"quantity":          1,
		"productionType":    "COMPANY",
	})
	expectStatus(t, added, http.StatusCreated)
	contractMenu := decodeData[model.ContractMenu](t, added)

	filesAdded := actors.sponsorshipMember.do(http.MethodPost, "/contract-menus/"+contractMenu.ID+"/production/files", map[string]any{
		"files": []map[string]string{
			{"driveUrl": "https://drive.google.com/file/d/front/view", "driveFileName": "表面.pdf"},
			{"driveUrl": "https://drive.google.com/file/d/back/view", "driveFileName": "裏面.pdf"},
		},
	})
	expectStatus(t, filesAdded, http.StatusCreated)
	withFiles := decodeData[model.ContractMenu](t, filesAdded)
	if withFiles.FileCount != 2 || len(withFiles.Files) != 2 || !withFiles.IsSubmitted || withFiles.Status != "SUBMITTED" {
		t.Fatalf("after add = %+v, want two files and SUBMITTED", withFiles)
	}
	if !withFiles.AllowUpload || !withFiles.AllowDelete {
		t.Fatalf("active-year member capabilities = upload:%v delete:%v, want both true", withFiles.AllowUpload, withFiles.AllowDelete)
	}
	if withFiles.DriveURL == nil || *withFiles.DriveURL != withFiles.Files[0].DriveURL {
		t.Fatalf("legacy driveUrl = %v, want first file URL", withFiles.DriveURL)
	}

	listed := actors.advisor.do(http.MethodGet, "/contract-menus/"+contractMenu.ID+"/production/files", nil)
	expectStatus(t, listed, http.StatusOK)
	if files := decodeData[[]model.ContractMenuDriveFile](t, listed); len(files) != 2 {
		t.Fatalf("listed files = %d, want 2", len(files))
	}

	patched := actors.advisor.do(http.MethodPatch, "/contract-menus/"+contractMenu.ID+"/production/files/"+withFiles.Files[1].ID, map[string]any{
		"driveFileName": "裏面・確定.pdf",
	})
	expectStatus(t, patched, http.StatusOK)
	if file := decodeData[model.ContractMenuDriveFile](t, patched); file.DriveFileName != "裏面・確定.pdf" {
		t.Fatalf("patched file name = %q", file.DriveFileName)
	}

	financeDelete := actors.finance.do(http.MethodDelete, "/contract-menus/"+contractMenu.ID+"/production/files/"+withFiles.Files[0].ID, nil)
	expectStatus(t, financeDelete, http.StatusForbidden)

	firstDeleted := actors.advisor.do(http.MethodDelete, "/contract-menus/"+contractMenu.ID+"/production/files/"+withFiles.Files[0].ID, nil)
	expectStatus(t, firstDeleted, http.StatusOK)
	afterFirstDelete := decodeData[model.ContractMenu](t, firstDeleted)
	if afterFirstDelete.FileCount != 1 || !afterFirstDelete.IsSubmitted || afterFirstDelete.Status != "SUBMITTED" {
		t.Fatalf("after first delete = %+v, want one file and SUBMITTED", afterFirstDelete)
	}

	lastDeleted := actors.advisor.do(http.MethodDelete, "/contract-menus/"+contractMenu.ID+"/production/files/"+withFiles.Files[1].ID, nil)
	expectStatus(t, lastDeleted, http.StatusOK)
	afterLastDelete := decodeData[model.ContractMenu](t, lastDeleted)
	if afterLastDelete.FileCount != 0 || afterLastDelete.IsSubmitted || afterLastDelete.Status != "WAITING" {
		t.Fatalf("after final delete = %+v, want zero files and WAITING", afterLastDelete)
	}

	readded := actors.advisor.do(http.MethodPatch, "/contract-menus/"+contractMenu.ID+"/production", map[string]any{
		"driveFolderUrl": "https://drive.google.com/file/d/final/view",
		"driveFileName":  "最終.pdf",
		"remarks":        "legacy endpoint compatibility",
	})
	expectStatus(t, readded, http.StatusOK)
	activeFile := decodeData[model.ContractMenu](t, readded).Files[0]

	createYear(t, actors.administrator, "2027", festivalDate(2027, 4, 1), festivalDate(2028, 3, 31))
	pastList := actors.advisor.do(http.MethodGet, "/contracts/"+contract.ID+"/menus", nil)
	expectStatus(t, pastList, http.StatusOK)
	pastMenu := decodeData[[]model.ContractMenu](t, pastList)[0]
	if pastMenu.AllowUpload || pastMenu.AllowDelete {
		t.Fatalf("past-year capabilities = upload:%v delete:%v, want both false", pastMenu.AllowUpload, pastMenu.AllowDelete)
	}
	pastAdd := actors.sponsorshipMember.do(http.MethodPost, "/contract-menus/"+contractMenu.ID+"/production/files", map[string]any{
		"files": []map[string]string{{"driveUrl": "https://drive.google.com/file/d/late/view", "driveFileName": "遅延.pdf"}},
	})
	expectStatus(t, pastAdd, http.StatusConflict)
	pastDelete := actors.advisor.do(http.MethodDelete, "/contract-menus/"+contractMenu.ID+"/production/files/"+activeFile.ID, nil)
	expectStatus(t, pastDelete, http.StatusConflict)
}
