-- Issue #175: spec/database.md#Referential Integrity. Both columns already
-- have an index (idx_yearlycompany_year, idx_yearlycompany_company).
ALTER TABLE yearly_companies
  ADD CONSTRAINT fk_yearly_companies_year
    FOREIGN KEY (year_id) REFERENCES years (id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_yearly_companies_company
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT;
