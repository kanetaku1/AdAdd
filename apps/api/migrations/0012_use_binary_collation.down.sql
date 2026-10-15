-- 0012_use_binary_collation.down.sql
-- Back to the previous case-insensitive collation. Fails on a unique key
-- when two values now differ only in a way unicode_ci ignores
-- (e.g. 株式会社ビール / 株式会社ピール) — resolve those rows first.

SET FOREIGN_KEY_CHECKS = 0;

ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE years CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE companies CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE yearly_companies CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sponsorship_contracts CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sponsorship_menus CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE contract_menus CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE payments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE assignments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE advisor_assignments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE activity_logs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE roles CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE user_roles CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- contract_menu_files exists only after the Contract Menu files migration
-- (PR #139). Convert it when present; if it comes later, it inherits the
-- database default set above.
SET @convert_contract_menu_files = IF(
  (SELECT COUNT(*) FROM information_schema.TABLES
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contract_menu_files') > 0,
  'ALTER TABLE contract_menu_files CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  'DO 0');
PREPARE convert_contract_menu_files FROM @convert_contract_menu_files;
EXECUTE convert_contract_menu_files;
DEALLOCATE PREPARE convert_contract_menu_files;

SET FOREIGN_KEY_CHECKS = 1;
