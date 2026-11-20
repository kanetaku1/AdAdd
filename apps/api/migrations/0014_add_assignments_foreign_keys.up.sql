-- Issue #175: spec/database.md#Referential Integrity. yearly_company_id is
-- indexed by its UNIQUE key; user_id gets its own index.
ALTER TABLE assignments
  ADD KEY idx_assignments_user_id (user_id),
  ADD CONSTRAINT fk_assignments_yearly_company
    FOREIGN KEY (yearly_company_id) REFERENCES yearly_companies (id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_assignments_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
