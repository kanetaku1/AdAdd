package model

// CompanyContactInput is the per-Year contact snapshot (spec/model.md#YearlyCompany).
type CompanyContactInput struct {
	PostalCode         string `json:"postalCode"`
	Address            string `json:"address"`
	PhoneNumber        string `json:"phoneNumber"`
	Website            string `json:"website"`
	ContactPersonName  string `json:"contactPersonName"`
	ContactEmailOrForm string `json:"contactEmailOrForm"`
	Memo               string `json:"memo"`
}

func CopyContactFromCompany(yc *YearlyCompany, c *Company) {
	if yc == nil || c == nil {
		return
	}
	yc.PostalCode = c.PostalCode
	yc.Address = c.Address
	yc.PhoneNumber = c.PhoneNumber
	yc.Website = c.Website
	yc.ContactPersonName = c.ContactPersonName
	yc.ContactEmailOrForm = c.ContactEmailOrForm
	yc.Memo = c.Memo
}

func ApplyContactToYearlyCompany(yc *YearlyCompany, in CompanyContactInput) {
	if yc == nil {
		return
	}
	yc.PostalCode = in.PostalCode
	yc.Address = in.Address
	yc.PhoneNumber = in.PhoneNumber
	yc.Website = in.Website
	yc.ContactPersonName = in.ContactPersonName
	yc.ContactEmailOrForm = in.ContactEmailOrForm
	yc.Memo = in.Memo
}

func ApplyContactToCompany(c *Company, in CompanyContactInput) {
	if c == nil {
		return
	}
	c.PostalCode = in.PostalCode
	c.Address = in.Address
	c.PhoneNumber = in.PhoneNumber
	c.Website = in.Website
	c.ContactPersonName = in.ContactPersonName
	c.ContactEmailOrForm = in.ContactEmailOrForm
	c.Memo = in.Memo
}
