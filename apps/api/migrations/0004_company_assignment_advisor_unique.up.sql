-- CompanyAssignment is 0..1 per YearlyCompany: unique on yearly_company_id only.
-- AdvisorAssignment allows multiple advisors per member: unique on (year_id, member_id, advisor_id).

ALTER TABLE assignments
  DROP INDEX ux_assignment_unique,
  ADD UNIQUE KEY ux_assignment_yearly_company (yearly_company_id);

ALTER TABLE advisor_assignments
  DROP INDEX ux_advisor_year_member,
  ADD UNIQUE KEY ux_advisor_year_member_advisor (year_id, member_id, advisor_id);
