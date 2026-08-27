package model

import "testing"

func TestCopyContactFromCompany(t *testing.T) {
	c := &Company{
		PostalCode:         "940-2188",
		Address:            "新潟県長岡市",
		PhoneNumber:        "0258-00-0000",
		Website:            "https://example.com",
		ContactPersonName:  "山田太郎",
		ContactEmailOrForm: "yamada@example.com",
		Memo:               "継続",
		CompanyName:        "株式会社サンプル",
	}
	yc := &YearlyCompany{}
	CopyContactFromCompany(yc, c)
	if yc.PostalCode != c.PostalCode || yc.Memo != c.Memo || yc.ContactPersonName != c.ContactPersonName {
		t.Fatalf("snapshot mismatch: %+v", yc)
	}
}

func TestApplyContactDoesNotTouchCompanyName(t *testing.T) {
	c := &Company{CompanyName: "株式会社サンプル", CompanyNameKana: "サンプル", FirstSponsorshipYear: "2015"}
	ApplyContactToCompany(c, CompanyContactInput{
		PhoneNumber: "111",
		Memo:        "updated",
	})
	if c.CompanyName != "株式会社サンプル" || c.CompanyNameKana != "サンプル" || c.FirstSponsorshipYear != "2015" {
		t.Fatalf("identity fields changed: %+v", c)
	}
	if c.PhoneNumber != "111" || c.Memo != "updated" {
		t.Fatalf("contact fields not applied: %+v", c)
	}
}
