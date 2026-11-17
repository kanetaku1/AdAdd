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

// ContactOfYearlyCompany returns the Yearly Company's contact snapshot.
func ContactOfYearlyCompany(yc *YearlyCompany) CompanyContactInput {
	return CompanyContactInput{
		PostalCode:         yc.PostalCode,
		Address:            yc.Address,
		PhoneNumber:        yc.PhoneNumber,
		Website:            yc.Website,
		ContactPersonName:  yc.ContactPersonName,
		ContactEmailOrForm: yc.ContactEmailOrForm,
		Memo:               yc.Memo,
	}
}

// ContactOfCompany returns the Company's contact fields.
func ContactOfCompany(c *Company) CompanyContactInput {
	return CompanyContactInput{
		PostalCode:         c.PostalCode,
		Address:            c.Address,
		PhoneNumber:        c.PhoneNumber,
		Website:            c.Website,
		ContactPersonName:  c.ContactPersonName,
		ContactEmailOrForm: c.ContactEmailOrForm,
		Memo:               c.Memo,
	}
}

// ContactColumnChanges returns the contact columns whose value differs
// between current and requested, keyed by column name. Both yearly_companies
// and companies use these column names. An update writes only these columns,
// so a concurrent change to another column is not overwritten
// (spec/database.md#Concurrent Updates). The company name is never included.
func ContactColumnChanges(current, requested CompanyContactInput) map[string]interface{} {
	changes := map[string]interface{}{}
	if current.PostalCode != requested.PostalCode {
		changes["postal_code"] = requested.PostalCode
	}
	if current.Address != requested.Address {
		changes["address"] = requested.Address
	}
	if current.PhoneNumber != requested.PhoneNumber {
		changes["phone_number"] = requested.PhoneNumber
	}
	if current.Website != requested.Website {
		changes["website"] = requested.Website
	}
	if current.ContactPersonName != requested.ContactPersonName {
		changes["contact_person_name"] = requested.ContactPersonName
	}
	if current.ContactEmailOrForm != requested.ContactEmailOrForm {
		changes["contact_email_or_form"] = requested.ContactEmailOrForm
	}
	if current.Memo != requested.Memo {
		changes["memo"] = requested.Memo
	}
	return changes
}
