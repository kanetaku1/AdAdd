CREATE TABLE contract_menu_files (
    id CHAR(36) PRIMARY KEY,
    contract_menu_id CHAR(36) NOT NULL,
    drive_url VARCHAR(1024) NOT NULL,
    drive_file_name VARCHAR(1024) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    deleted_at DATETIME(3) NULL,
    INDEX idx_contract_menu_files_contract_menu_id (contract_menu_id),
    INDEX idx_contract_menu_files_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing data
INSERT INTO contract_menu_files (id, contract_menu_id, drive_url, drive_file_name, created_at, updated_at)
SELECT UUID(), id, drive_url, drive_file_name, NOW(3), NOW(3)
FROM contract_menus
WHERE drive_url IS NOT NULL AND drive_url != '';

-- Remove columns from contract_menus
ALTER TABLE contract_menus DROP COLUMN drive_url, DROP COLUMN drive_file_name;
