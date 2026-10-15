-- 0012_use_binary_collation.up.sql
-- Distinguish every character difference in names: dakuten, kana type,
-- full/half width, letter case (spec/database.md#Character Set and Collation).
-- users.email stays case-insensitive.

-- user_roles references users and roles; their key columns change collation
-- together, so the foreign-key check is suspended while converting.
SET FOREIGN_KEY_CHECKS = 0;

-- Tables added by later migrations inherit this default.
ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;

ALTER TABLE years CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
ALTER TABLE companies CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
ALTER TABLE yearly_companies CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
ALTER TABLE sponsorship_contracts CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
ALTER TABLE sponsorship_menus CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
ALTER TABLE contract_menus CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
ALTER TABLE payments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
ALTER TABLE assignments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
ALTER TABLE advisor_assignments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
ALTER TABLE activity_logs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
ALTER TABLE roles CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
ALTER TABLE user_roles CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;

-- contract_menu_files exists only after the Contract Menu files migration
-- (PR #139). Convert it when present; if it comes later, it inherits the
-- database default set above.
SET @convert_contract_menu_files = IF(
  (SELECT COUNT(*) FROM information_schema.TABLES
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contract_menu_files') > 0,
  'ALTER TABLE contract_menu_files CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin',
  'DO 0');
PREPARE convert_contract_menu_files FROM @convert_contract_menu_files;
EXECUTE convert_contract_menu_files;
DEALLOCATE PREPARE convert_contract_menu_files;

ALTER TABLE users MODIFY email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
