-- 0003_add_deleted_at.up.sql
-- Add deleted_at columns used by GORM's soft delete (DeletedAt) and indexes
-- This migration adds columns/indexes only when missing using stored procedures to avoid syntax incompatibilities.

DELIMITER $$

-- years
DROP PROCEDURE IF EXISTS add_deleted_years$$
CREATE PROCEDURE add_deleted_years()
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='years' AND COLUMN_NAME='deleted_at') = 0 THEN
    ALTER TABLE years ADD COLUMN deleted_at DATETIME NULL;
  END IF;
  IF (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='years' AND INDEX_NAME='idx_years_deleted_at') = 0 THEN
    ALTER TABLE years ADD INDEX idx_years_deleted_at (deleted_at);
  END IF;
END$$
CALL add_deleted_years()$$
DROP PROCEDURE IF EXISTS add_deleted_years$$

-- companies
DROP PROCEDURE IF EXISTS add_deleted_companies$$
CREATE PROCEDURE add_deleted_companies()
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='companies' AND COLUMN_NAME='deleted_at') = 0 THEN
    ALTER TABLE companies ADD COLUMN deleted_at DATETIME NULL;
  END IF;
  IF (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='companies' AND INDEX_NAME='idx_companies_deleted_at') = 0 THEN
    ALTER TABLE companies ADD INDEX idx_companies_deleted_at (deleted_at);
  END IF;
END$$
CALL add_deleted_companies()$$
DROP PROCEDURE IF EXISTS add_deleted_companies$$

-- yearly_companies
DROP PROCEDURE IF EXISTS add_deleted_yearly_companies$$
CREATE PROCEDURE add_deleted_yearly_companies()
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='yearly_companies' AND COLUMN_NAME='deleted_at') = 0 THEN
    ALTER TABLE yearly_companies ADD COLUMN deleted_at DATETIME NULL;
  END IF;
  IF (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='yearly_companies' AND INDEX_NAME='idx_yearly_companies_deleted_at') = 0 THEN
    ALTER TABLE yearly_companies ADD INDEX idx_yearly_companies_deleted_at (deleted_at);
  END IF;
END$$
CALL add_deleted_yearly_companies()$$
DROP PROCEDURE IF EXISTS add_deleted_yearly_companies$$

-- sponsorship_contracts
DROP PROCEDURE IF EXISTS add_deleted_sponsorship_contracts$$
CREATE PROCEDURE add_deleted_sponsorship_contracts()
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sponsorship_contracts' AND COLUMN_NAME='deleted_at') = 0 THEN
    ALTER TABLE sponsorship_contracts ADD COLUMN deleted_at DATETIME NULL;
  END IF;
  IF (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sponsorship_contracts' AND INDEX_NAME='idx_sponsorship_contracts_deleted_at') = 0 THEN
    ALTER TABLE sponsorship_contracts ADD INDEX idx_sponsorship_contracts_deleted_at (deleted_at);
  END IF;
END$$
CALL add_deleted_sponsorship_contracts()$$
DROP PROCEDURE IF EXISTS add_deleted_sponsorship_contracts$$

-- sponsorship_menus
DROP PROCEDURE IF EXISTS add_deleted_sponsorship_menus$$
CREATE PROCEDURE add_deleted_sponsorship_menus()
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sponsorship_menus' AND COLUMN_NAME='deleted_at') = 0 THEN
    ALTER TABLE sponsorship_menus ADD COLUMN deleted_at DATETIME NULL;
  END IF;
  IF (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sponsorship_menus' AND INDEX_NAME='idx_sponsorship_menus_deleted_at') = 0 THEN
    ALTER TABLE sponsorship_menus ADD INDEX idx_sponsorship_menus_deleted_at (deleted_at);
  END IF;
END$$
CALL add_deleted_sponsorship_menus()$$
DROP PROCEDURE IF EXISTS add_deleted_sponsorship_menus$$

-- contract_menus
DROP PROCEDURE IF EXISTS add_deleted_contract_menus$$
CREATE PROCEDURE add_deleted_contract_menus()
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='contract_menus' AND COLUMN_NAME='deleted_at') = 0 THEN
    ALTER TABLE contract_menus ADD COLUMN deleted_at DATETIME NULL;
  END IF;
  IF (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='contract_menus' AND INDEX_NAME='idx_contract_menus_deleted_at') = 0 THEN
    ALTER TABLE contract_menus ADD INDEX idx_contract_menus_deleted_at (deleted_at);
  END IF;
END$$
CALL add_deleted_contract_menus()$$
DROP PROCEDURE IF EXISTS add_deleted_contract_menus$$

-- payments
DROP PROCEDURE IF EXISTS add_deleted_payments$$
CREATE PROCEDURE add_deleted_payments()
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='payments' AND COLUMN_NAME='deleted_at') = 0 THEN
    ALTER TABLE payments ADD COLUMN deleted_at DATETIME NULL;
  END IF;
  IF (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='payments' AND INDEX_NAME='idx_payments_deleted_at') = 0 THEN
    ALTER TABLE payments ADD INDEX idx_payments_deleted_at (deleted_at);
  END IF;
END$$
CALL add_deleted_payments()$$
DROP PROCEDURE IF EXISTS add_deleted_payments$$

-- assignments
DROP PROCEDURE IF EXISTS add_deleted_assignments$$
CREATE PROCEDURE add_deleted_assignments()
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='assignments' AND COLUMN_NAME='deleted_at') = 0 THEN
    ALTER TABLE assignments ADD COLUMN deleted_at DATETIME NULL;
  END IF;
  IF (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='assignments' AND INDEX_NAME='idx_assignments_deleted_at') = 0 THEN
    ALTER TABLE assignments ADD INDEX idx_assignments_deleted_at (deleted_at);
  END IF;
END$$
CALL add_deleted_assignments()$$
DROP PROCEDURE IF EXISTS add_deleted_assignments$$

-- advisor_assignments
DROP PROCEDURE IF EXISTS add_deleted_advisor_assignments$$
CREATE PROCEDURE add_deleted_advisor_assignments()
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='advisor_assignments' AND COLUMN_NAME='deleted_at') = 0 THEN
    ALTER TABLE advisor_assignments ADD COLUMN deleted_at DATETIME NULL;
  END IF;
  IF (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='advisor_assignments' AND INDEX_NAME='idx_advisor_assignments_deleted_at') = 0 THEN
    ALTER TABLE advisor_assignments ADD INDEX idx_advisor_assignments_deleted_at (deleted_at);
  END IF;
END$$
CALL add_deleted_advisor_assignments()$$
DROP PROCEDURE IF EXISTS add_deleted_advisor_assignments$$

-- users
DROP PROCEDURE IF EXISTS add_deleted_users$$
CREATE PROCEDURE add_deleted_users()
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='deleted_at') = 0 THEN
    ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL;
  END IF;
  IF (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND INDEX_NAME='idx_users_deleted_at') = 0 THEN
    ALTER TABLE users ADD INDEX idx_users_deleted_at (deleted_at);
  END IF;
END$$
CALL add_deleted_users()$$
DROP PROCEDURE IF EXISTS add_deleted_users$$

DELIMITER ;
