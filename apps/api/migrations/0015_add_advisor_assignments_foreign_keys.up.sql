-- Issue #175: spec/database.md#Referential Integrity. year_id is the first
-- column of ux_advisor_year_member_advisor; advisor_id and member_id get
-- their own indexes.
ALTER TABLE advisor_assignments
  ADD KEY idx_advisor_assignments_advisor_id (advisor_id),
  ADD KEY idx_advisor_assignments_member_id (member_id),
  ADD CONSTRAINT fk_advisor_assignments_year
    FOREIGN KEY (year_id) REFERENCES years (id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_advisor_assignments_advisor
    FOREIGN KEY (advisor_id) REFERENCES users (id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_advisor_assignments_member
    FOREIGN KEY (member_id) REFERENCES users (id) ON DELETE RESTRICT;
