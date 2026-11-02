-- Issue #129: one Contract Menu has zero or more Google Drive references.
-- Copy every legacy single-file reference before removing the old columns.
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

INSERT INTO contract_menu_drive_files (
  id,
  contract_menu_id,
  drive_url,
  drive_file_name,
  created_at,
  updated_at
)
SELECT
  UUID(),
  id,
  drive_url,
  CASE
    WHEN drive_file_name IS NULL OR TRIM(drive_file_name) = '' THEN '資料'
    ELSE drive_file_name
  END,
  COALESCE(submitted_at, created_at, CURRENT_TIMESTAMP),
  COALESCE(updated_at, CURRENT_TIMESTAMP)
FROM contract_menus
WHERE drive_url IS NOT NULL AND TRIM(drive_url) <> '';

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

ALTER TABLE contract_menus
  DROP COLUMN drive_url,
  DROP COLUMN drive_file_name;
