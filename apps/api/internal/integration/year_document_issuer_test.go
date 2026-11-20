package integration

import (
	"net/http"
	"testing"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
)

func TestYearDocumentIssuerUpdatesAndCopiesForward(t *testing.T) {
	actor := newActors(t)

	firstResponse := actor.administrator.do(http.MethodPost, "/years", map[string]any{
		"name":              "2025",
		"startDate":         "2025-04-01",
		"endDate":           "2025-11-30",
		"bankAccountNumber": "untrusted-client-value",
		"issuerName":        "untrusted-client-issuer",
	})
	expectStatus(t, firstResponse, http.StatusCreated)
	firstYear := decodeData[model.Year](t, firstResponse)
	if firstYear.BankAccountNumber != nil || firstYear.IssuerName != nil {
		t.Fatal("POST /years accepted client-supplied document issuer values")
	}

	update := actor.administrator.do(http.MethodPatch, "/years/"+firstYear.ID+"/document-issuer", map[string]any{
		"issuerName":            "Test Festival Committee",
		"issuerPostalCode":      "940-2188",
		"issuerAddressLine1":    "Test address line 1",
		"issuerAddressLine2":    "Test address line 2",
		"issuerEmail":           "test@example.com",
		"bankName":              "Test Bank",
		"bankBranchName":        "Test Branch",
		"bankAccountType":       "Ordinary",
		"bankAccountNumber":     "1234567",
		"bankAccountHolderName": "Test Festival",
	})
	expectStatus(t, update, http.StatusOK)
	updatedYear := decodeData[model.Year](t, update)
	if updatedYear.IssuerName == nil || *updatedYear.IssuerName != "Test Festival Committee" {
		t.Fatalf("issuerName = %v, want Test Festival Committee", updatedYear.IssuerName)
	}
	if updatedYear.BankAccountNumber == nil || *updatedYear.BankAccountNumber != "1234567" {
		t.Fatalf("bankAccountNumber = %v, want 1234567", updatedYear.BankAccountNumber)
	}

	expectStatus(t, actor.sponsorshipMember.do(http.MethodPatch, "/years/"+firstYear.ID+"/document-issuer", map[string]any{
		"issuerName": "Unauthorized edit",
	}), http.StatusForbidden)

	secondYearID := createYear(t, actor.administrator, "2026", festivalDate(2026, 4, 1), festivalDate(2026, 11, 30))
	yearsResponse := actor.administrator.do(http.MethodGet, "/years", nil)
	expectStatus(t, yearsResponse, http.StatusOK)
	years := decodeData[[]model.Year](t, yearsResponse)
	var secondYear *model.Year
	for i := range years {
		if years[i].ID == secondYearID {
			secondYear = &years[i]
			break
		}
	}
	if secondYear == nil {
		t.Fatal("new Year was not returned by GET /years")
	}
	if secondYear.IssuerName == nil || *secondYear.IssuerName != "Test Festival Committee" {
		t.Fatalf("copied issuerName = %v", secondYear.IssuerName)
	}
	if secondYear.BankAccountNumber == nil || *secondYear.BankAccountNumber != "1234567" {
		t.Fatalf("copied bankAccountNumber = %v", secondYear.BankAccountNumber)
	}

	expectStatus(t, actor.administrator.do(http.MethodPatch, "/years/"+firstYear.ID+"/document-issuer", map[string]any{
		"issuerName": "Past Year edit",
	}), http.StatusConflict)
}
