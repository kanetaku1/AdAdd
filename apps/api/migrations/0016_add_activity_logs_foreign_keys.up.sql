-- Issue #175: spec/database.md#Referential Integrity. Neither column had an
-- index; both get one.
ALTER TABLE activity_logs
  ADD KEY idx_activity_logs_yearly_company_id (yearly_company_id),
  ADD KEY idx_activity_logs_user_id (user_id),
  ADD CONSTRAINT fk_activity_logs_yearly_company
    FOREIGN KEY (yearly_company_id) REFERENCES yearly_companies (id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_activity_logs_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
