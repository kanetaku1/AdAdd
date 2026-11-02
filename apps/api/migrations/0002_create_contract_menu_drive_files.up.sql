-- Issue #129: one Contract Menu has zero or more Google Drive references.
-- Copy every legacy single-file reference before removing the old columns.
-- Some local databases also contain contract_menu_files from the closed PR
-- #139. Preserve those rows too so developers can move to the canonical model
-- without recreating their database.
CREATE TABLE contract_menu_drive_files (
  id CHAR(36) NOT NULL,
  contract_menu_id CHAR(36) NOT NULL,
  drive_url VARCHAR(1024) NOT NULL,
  drive_file_name VARCHAR(1024) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_contract_menu_drive_files_contract_menu (contract_menu_id),
  KEY idx_contract_menu_drive_files_deleted_at (deleted_at),
  CONSTRAINT fk_contract_menu_drive_files_contract_menu
    FOREIGN KEY (contract_menu_id) REFERENCES contract_menus (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

-- The canonical pre-#129 schema stores one reference on contract_menus. Use a
-- prepared statement because the closed PR already removed these columns.
SET @has_legacy_drive_url = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'contract_menus'
    AND COLUMN_NAME = 'drive_url'
);
SET @has_legacy_drive_file_name = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'contract_menus'
    AND COLUMN_NAME = 'drive_file_name'
);
SET @legacy_file_name_expression = IF(
  @has_legacy_drive_file_name > 0,
  'CASE WHEN drive_file_name IS NULL OR TRIM(drive_file_name) = '''' THEN ''資料'' ELSE drive_file_name END',
  '''資料'''
);
SET @copy_legacy_contract_menu_file = IF(
  @has_legacy_drive_url > 0,
  CONCAT(
    'INSERT INTO contract_menu_drive_files ',
    '(id, contract_menu_id, drive_url, drive_file_name, created_at, updated_at) ',
    'SELECT UUID(), id, drive_url, ', @legacy_file_name_expression, ', ',
    'COALESCE(submitted_at, created_at, CURRENT_TIMESTAMP), ',
    'COALESCE(updated_at, CURRENT_TIMESTAMP) ',
    'FROM contract_menus ',
    'WHERE drive_url IS NOT NULL AND TRIM(drive_url) <> '''''
  ),
  'DO 0'
);
PREPARE copy_legacy_contract_menu_file FROM @copy_legacy_contract_menu_file;
EXECUTE copy_legacy_contract_menu_file;
DEALLOCATE PREPARE copy_legacy_contract_menu_file;

-- Preserve rows created by the closed PR #139. INSERT IGNORE also makes this
-- safe when a developer repaired a partially applied local migration once.
SET @has_closed_pr_files = (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'contract_menu_files'
);
SET @copy_closed_pr_files = IF(
  @has_closed_pr_files > 0,
  'INSERT IGNORE INTO contract_menu_drive_files (id, contract_menu_id, drive_url, drive_file_name, created_at, updated_at, deleted_at) SELECT id, contract_menu_id, drive_url, drive_file_name, created_at, updated_at, deleted_at FROM contract_menu_files',
  'DO 0'
);
PREPARE copy_closed_pr_files FROM @copy_closed_pr_files;
EXECUTE copy_closed_pr_files;
DEALLOCATE PREPARE copy_closed_pr_files;

UPDATE contract_menus
SET status = 'SUBMITTED',
    submitted_at = COALESCE(submitted_at, updated_at, CURRENT_TIMESTAMP)
WHERE EXISTS (
  SELECT 1
  FROM contract_menu_drive_files
  WHERE contract_menu_drive_files.contract_menu_id = contract_menus.id
    AND contract_menu_drive_files.deleted_at IS NULL
);

UPDATE contract_menus
SET status = 'WAITING',
    submitted_at = NULL
WHERE status = 'SUBMITTED'
  AND NOT EXISTS (
    SELECT 1
    FROM contract_menu_drive_files
    WHERE contract_menu_drive_files.contract_menu_id = contract_menus.id
      AND contract_menu_drive_files.deleted_at IS NULL
  );

-- Drop each legacy column only when it still exists. The closed PR database
-- has already removed both columns.
SET @drop_legacy_drive_url = IF(
  @has_legacy_drive_url > 0,
  'ALTER TABLE contract_menus DROP COLUMN drive_url',
  'DO 0'
);
PREPARE drop_legacy_drive_url FROM @drop_legacy_drive_url;
EXECUTE drop_legacy_drive_url;
DEALLOCATE PREPARE drop_legacy_drive_url;

SET @drop_legacy_drive_file_name = IF(
  @has_legacy_drive_file_name > 0,
  'ALTER TABLE contract_menus DROP COLUMN drive_file_name',
  'DO 0'
);
PREPARE drop_legacy_drive_file_name FROM @drop_legacy_drive_file_name;
EXECUTE drop_legacy_drive_file_name;
DEALLOCATE PREPARE drop_legacy_drive_file_name;
