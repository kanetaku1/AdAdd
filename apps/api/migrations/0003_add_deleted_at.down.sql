-- 0003_add_deleted_at.down.sql
-- Revert deleted_at columns (best-effort)

ALTER TABLE years DROP INDEX idx_years_deleted_at, DROP COLUMN deleted_at;
ALTER TABLE companies DROP INDEX idx_companies_deleted_at, DROP COLUMN deleted_at;
ALTER TABLE yearly_companies DROP INDEX idx_yearly_companies_deleted_at, DROP COLUMN deleted_at;
ALTER TABLE sponsorship_contracts DROP INDEX idx_sponsorship_contracts_deleted_at, DROP COLUMN deleted_at;
ALTER TABLE sponsorship_menus DROP INDEX idx_sponsorship_menus_deleted_at, DROP COLUMN deleted_at;
ALTER TABLE contract_menus DROP INDEX idx_contract_menus_deleted_at, DROP COLUMN deleted_at;
ALTER TABLE payments DROP INDEX idx_payments_deleted_at, DROP COLUMN deleted_at;
ALTER TABLE assignments DROP INDEX idx_assignments_deleted_at, DROP COLUMN deleted_at;
ALTER TABLE advisor_assignments DROP INDEX idx_advisor_assignments_deleted_at, DROP COLUMN deleted_at;
ALTER TABLE users DROP INDEX idx_users_deleted_at, DROP COLUMN deleted_at;
