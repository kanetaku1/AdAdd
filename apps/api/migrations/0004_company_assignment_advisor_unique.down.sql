ALTER TABLE assignments
  DROP INDEX ux_assignment_yearly_company,
  ADD UNIQUE KEY ux_assignment_unique (yearly_company_id, user_id);

ALTER TABLE advisor_assignments
  DROP INDEX ux_advisor_year_member_advisor,
  ADD UNIQUE KEY ux_advisor_year_member (year_id, member_id);
