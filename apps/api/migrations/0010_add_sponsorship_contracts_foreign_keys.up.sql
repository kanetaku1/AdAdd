-- Issue #175: spec/database.md#Referential Integrity. yearly_company_id is
-- indexed by its UNIQUE key. assignee_id gets no foreign key: a Contract has
-- no assignee in the spec and the column is to be removed (Issue #216).
ALTER TABLE sponsorship_contracts
  ADD CONSTRAINT fk_sponsorship_contracts_yearly_company
    FOREIGN KEY (yearly_company_id) REFERENCES yearly_companies (id) ON DELETE RESTRICT;
