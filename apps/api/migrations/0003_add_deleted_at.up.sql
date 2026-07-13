-- 0003_add_deleted_at.up.sql
-- Add deleted_at columns used by GORM's soft delete (DeletedAt) and indexes

ALTER TABLE years
  ADD COLUMN deleted_at DATETIME NULL,
  ADD INDEX idx_years_deleted_at (deleted_at);

ALTER TABLE companies
  ADD COLUMN deleted_at DATETIME NULL,
  ADD INDEX idx_companies_deleted_at (deleted_at);

ALTER TABLE yearly_companies
  ADD COLUMN deleted_at DATETIME NULL,
  ADD INDEX idx_yearly_companies_deleted_at (deleted_at);

ALTER TABLE sponsorship_contracts
  ADD COLUMN deleted_at DATETIME NULL,
  ADD INDEX idx_sponsorship_contracts_deleted_at (deleted_at);

ALTER TABLE sponsorship_menus
  ADD COLUMN deleted_at DATETIME NULL,
  ADD INDEX idx_sponsorship_menus_deleted_at (deleted_at);

ALTER TABLE contract_menus
  ADD COLUMN deleted_at DATETIME NULL,
  ADD INDEX idx_contract_menus_deleted_at (deleted_at);

ALTER TABLE payments
  ADD COLUMN deleted_at DATETIME NULL,
  ADD INDEX idx_payments_deleted_at (deleted_at);

ALTER TABLE assignments
  ADD COLUMN deleted_at DATETIME NULL,
  ADD INDEX idx_assignments_deleted_at (deleted_at);

ALTER TABLE advisor_assignments
  ADD COLUMN deleted_at DATETIME NULL,
  ADD INDEX idx_advisor_assignments_deleted_at (deleted_at);

ALTER TABLE users
  ADD COLUMN deleted_at DATETIME NULL,
  ADD INDEX idx_users_deleted_at (deleted_at);
