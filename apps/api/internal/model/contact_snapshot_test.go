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

func TestContactColumnChangesContainsOnlyChangedColumns(t *testing.T) {
	c := &Company{CompanyName: "株式会社サンプル", PhoneNumber: "000", Address: "新潟県長岡市", Memo: "old"}
	requested := ContactOfCompany(c)
	requested.PhoneNumber = "111"
	requested.Memo = "updated"

	changes := ContactColumnChanges(ContactOfCompany(c), requested)
	if len(changes) != 2 || changes["phone_number"] != "111" || changes["memo"] != "updated" {
		t.Fatalf("changes = %+v, want only phone_number and memo", changes)
	}
	if _, ok := changes["company_name"]; ok {
		t.Fatalf("company_name must never be written by a contact update: %+v", changes)
	}
}
