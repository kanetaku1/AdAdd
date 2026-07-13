-- 0003_add_deleted_at.up.sql
-- Add deleted_at columns used by GORM's soft delete (DeletedAt) and indexes
-- This migration is defensive: it uses IF NOT EXISTS where supported and checks INFORMATION_SCHEMA

-- helper: add column if missing
SET @tables = 'years,companies,yearly_companies,sponsorship_contracts,sponsorship_menus,contract_menus,payments,assignments,advisor_assignments,users';

-- For each table, add deleted_at if not exists and then create index if missing
-- years
ALTER TABLE years ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;
SET @cnt = (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'years' AND INDEX_NAME = 'idx_years_deleted_at');
IF @cnt = 0 THEN
  ALTER TABLE years ADD INDEX idx_years_deleted_at (deleted_at);
END IF;

-- companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;
SET @cnt = (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'companies' AND INDEX_NAME = 'idx_companies_deleted_at');
IF @cnt = 0 THEN
  ALTER TABLE companies ADD INDEX idx_companies_deleted_at (deleted_at);
END IF;

-- yearly_companies
ALTER TABLE yearly_companies ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;
SET @cnt = (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'yearly_companies' AND INDEX_NAME = 'idx_yearly_companies_deleted_at');
IF @cnt = 0 THEN
  ALTER TABLE yearly_companies ADD INDEX idx_yearly_companies_deleted_at (deleted_at);
END IF;

-- sponsorship_contracts
ALTER TABLE sponsorship_contracts ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;
SET @cnt = (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sponsorship_contracts' AND INDEX_NAME = 'idx_sponsorship_contracts_deleted_at');
IF @cnt = 0 THEN
  ALTER TABLE sponsorship_contracts ADD INDEX idx_sponsorship_contracts_deleted_at (deleted_at);
END IF;

-- sponsorship_menus
ALTER TABLE sponsorship_menus ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;
SET @cnt = (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sponsorship_menus' AND INDEX_NAME = 'idx_sponsorship_menus_deleted_at');
IF @cnt = 0 THEN
  ALTER TABLE sponsorship_menus ADD INDEX idx_sponsorship_menus_deleted_at (deleted_at);
END IF;

-- contract_menus
ALTER TABLE contract_menus ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;
SET @cnt = (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contract_menus' AND INDEX_NAME = 'idx_contract_menus_deleted_at');
IF @cnt = 0 THEN
  ALTER TABLE contract_menus ADD INDEX idx_contract_menus_deleted_at (deleted_at);
END IF;

-- payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;
SET @cnt = (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND INDEX_NAME = 'idx_payments_deleted_at');
IF @cnt = 0 THEN
  ALTER TABLE payments ADD INDEX idx_payments_deleted_at (deleted_at);
END IF;

-- assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;
SET @cnt = (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'assignments' AND INDEX_NAME = 'idx_assignments_deleted_at');
IF @cnt = 0 THEN
  ALTER TABLE assignments ADD INDEX idx_assignments_deleted_at (deleted_at);
END IF;

-- advisor_assignments
ALTER TABLE advisor_assignments ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;
SET @cnt = (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_assignments' AND INDEX_NAME = 'idx_advisor_assignments_deleted_at');
IF @cnt = 0 THEN
  ALTER TABLE advisor_assignments ADD INDEX idx_advisor_assignments_deleted_at (deleted_at);
END IF;

-- users
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;
SET @cnt = (SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_deleted_at');
IF @cnt = 0 THEN
  ALTER TABLE users ADD INDEX idx_users_deleted_at (deleted_at);
END IF;
