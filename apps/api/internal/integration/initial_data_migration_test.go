package integration

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"github.com/labstack/echo/v4"
)

// spec/operations.md#Initial Data Migration: the first Year is created
// empty, then the curated Company CSV registers every Company into it, with
// companyStatus derived from previousYearContract (spec/domain.md#Company Status).

type companyImportResult struct {
	SuccessCount   int `json:"successCount"`
	ErrorCount     int `json:"errorCount"`
	SuccessfulRows []struct {
		ID            string `json:"id"`
		CompanyName   string `json:"companyName"`
		CompanyStatus string `json:"companyStatus"`
	} `json:"successfulRows"`
	Errors []model.BulkError `json:"errors"`
}

// importCompanies sends POST /companies/bulk as multipart/form-data.
func importCompanies(t *testing.T, client *apiClient, csv string, dryRun bool) companyImportResult {
	t.Helper()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "companies.csv")
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	part.Write(append([]byte{0xef, 0xbb, 0xbf}, csv...)) // with BOM, as Excel writes it
	if dryRun {
		writer.WriteField("dryRun", "true")
	}
	writer.Close()

	request := httptest.NewRequest(http.MethodPost, "/companies/bulk", &body)
	request.Header.Set(echo.HeaderContentType, writer.FormDataContentType())
	request.Header.Set("X-User-ID", client.userID)
	request.Header.Set("X-User-Roles", strings.Join(client.roles, ","))
	response := httptest.NewRecorder()
	client.server.ServeHTTP(response, request)

	expectStatus(t, response, http.StatusOK)
	return decodeData[companyImportResult](t, response)
}

const importHeader = "companyName,companyNameKana,firstSponsorshipYear,previousYearContract\n"

func TestCompanyImportRegistersIntoActiveYearWithPreviousYearContract(t *testing.T) {
	actor := newActors(t)
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))

	csv := importHeader +
		"継続株式会社,ケイゾク,2019,あり\n" +
		"新規株式会社,シンキ,,なし\n" +
		"空欄株式会社,クウラン,,\n" +
		"不正値株式会社,フセイ,,有\n"

	preview := importCompanies(t, actor.sponsorshipMember, csv, true)
	if preview.SuccessCount != 3 || preview.ErrorCount != 1 || preview.Errors[0].RowNumber != 5 {
		t.Fatalf("preview = %+v, want 3 valid rows and row 5 as an error", preview)
	}
	var companies int64
	db.DB.Model(&model.Company{}).Count(&companies)
	if companies != 0 {
		t.Fatalf("preview created %d Companies, want 0", companies)
	}

	result := importCompanies(t, actor.sponsorshipMember, csv, false)
	want := map[string]string{"継続株式会社": "CONTINUING", "新規株式会社": "NEW", "空欄株式会社": "NEW"}
	if result.SuccessCount != len(want) {
		t.Fatalf("successCount = %d, want %d", result.SuccessCount, len(want))
	}
	for _, row := range result.SuccessfulRows {
		if row.CompanyStatus != want[row.CompanyName] {
			t.Errorf("%s response companyStatus = %s, want %s", row.CompanyName, row.CompanyStatus, want[row.CompanyName])
		}
		yearlyCompany := loadYearlyCompany(t, yearID, row.ID)
		if yearlyCompany.CompanyStatus != want[row.CompanyName] || yearlyCompany.Phase != "PHASE_3" || yearlyCompany.Progress != "NOT_CONTACTED" {
			t.Errorf("%s Yearly Company = %s/%s/%s, want %s/PHASE_3/NOT_CONTACTED",
				row.CompanyName, yearlyCompany.CompanyStatus, yearlyCompany.Phase, yearlyCompany.Progress, want[row.CompanyName])
		}
	}
	expectNoDormant(t)
}

// Without an active Year the fact has nowhere to go, so it is rejected
// rather than silently dropped.
func TestCompanyImportWithoutActiveYearRejectsPreviousYearContract(t *testing.T) {
	actor := newActors(t)

	result := importCompanies(t, actor.sponsorshipMember, importHeader+
		"継続株式会社,ケイゾク,,あり\n"+
		"新規株式会社,シンキ,,なし\n", false)

	if result.SuccessCount != 1 || result.ErrorCount != 1 || result.Errors[0].RowNumber != 2 {
		t.Fatalf("result = %+v, want row 2 rejected and row 3 created", result)
	}
	if result.SuccessfulRows[0].CompanyStatus != "" {
		t.Errorf("companyStatus = %q, want omitted without an active Year", result.SuccessfulRows[0].CompanyStatus)
	}
	var yearlyCompanies int64
	db.DB.Model(&model.YearlyCompany{}).Count(&yearlyCompanies)
	if yearlyCompanies != 0 {
		t.Fatalf("%d Yearly Companies created without an active Year, want 0", yearlyCompanies)
	}
}

// spec/database.md#Character Set and Collation: names that differ in any
// character are different Companies.
func TestCompanyNamesDistinguishEveryCharacterDifference(t *testing.T) {
	actor := newActors(t)

	pairs := [][2]string{
		{"株式会社ビール", "株式会社ピール"},
		{"株式会社アオバ", "株式会社あおば"},
		{"株式会社ＡＢＣ", "株式会社ABC"},
		{"株式会社ハル", "株式会社ﾊﾙ"},
		{"株式会社Abc", "株式会社abc"},
		{"株式会社ヤマ", "株式会社ャマ"},
	}
	for _, pair := range pairs {
		createCompany(t, actor.administrator, pair[0])
		createCompany(t, actor.administrator, pair[1])
	}

	// Exactly the same name is still a duplicate.
	response := actor.administrator.do(http.MethodPost, "/companies", map[string]any{"companyName": "株式会社ビール"})
	expectStatus(t, response, http.StatusConflict)
}

// users.email stays case-insensitive: sign-in finds the User whatever the case.
func TestUserEmailIsCaseInsensitive(t *testing.T) {
	newActors(t)

	user, err := repository.NewUserRepository().FindByEmail("USER-ADMINISTRATOR@EXAMPLE.COM")
	if err != nil || user.ID != administratorID {
		t.Fatalf("FindByEmail with different case = %v, %v; want %s", user, err, administratorID)
	}
}

// spec/api.md#No Year Deletion.
func TestYearCannotBeDeleted(t *testing.T) {
	actor := newActors(t)
	yearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))

	response := actor.administrator.do(http.MethodDelete, "/years/"+yearID, nil)
	if response.Code < 400 {
		t.Fatalf("DELETE /years/{yearId} status = %d, want an error", response.Code)
	}
	if !recordExists(t, &model.Year{}, yearID) {
		t.Fatal("Year was deleted")
	}
}
