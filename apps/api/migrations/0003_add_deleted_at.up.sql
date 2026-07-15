ALTER TABLE years ADD COLUMN deleted_at DATETIME NULL;
CREATE INDEX idx_years_deleted_at ON years (deleted_at);

ALTER TABLE companies ADD COLUMN deleted_at DATETIME NULL;
CREATE INDEX idx_companies_deleted_at ON companies (deleted_at);

ALTER TABLE yearly_companies ADD COLUMN deleted_at DATETIME NULL;
CREATE INDEX idx_yearly_companies_deleted_at ON yearly_companies (deleted_at);

ALTER TABLE sponsorship_contracts ADD COLUMN deleted_at DATETIME NULL;
CREATE INDEX idx_sponsorship_contracts_deleted_at ON sponsorship_contracts (deleted_at);

ALTER TABLE sponsorship_menus ADD COLUMN deleted_at DATETIME NULL;
CREATE INDEX idx_sponsorship_menus_deleted_at ON sponsorship_menus (deleted_at);

ALTER TABLE contract_menus ADD COLUMN deleted_at DATETIME NULL;
CREATE INDEX idx_contract_menus_deleted_at ON contract_menus (deleted_at);

ALTER TABLE payments ADD COLUMN deleted_at DATETIME NULL;
CREATE INDEX idx_payments_deleted_at ON payments (deleted_at);

ALTER TABLE assignments ADD COLUMN deleted_at DATETIME NULL;
CREATE INDEX idx_assignments_deleted_at ON assignments (deleted_at);

ALTER TABLE advisor_assignments ADD COLUMN deleted_at DATETIME NULL;
CREATE INDEX idx_advisor_assignments_deleted_at ON advisor_assignments (deleted_at);

ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL;
CREATE INDEX idx_users_deleted_at ON users (deleted_at);
