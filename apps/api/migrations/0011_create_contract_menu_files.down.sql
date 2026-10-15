ALTER TABLE contract_menus ADD COLUMN drive_url VARCHAR(1024), ADD COLUMN drive_file_name VARCHAR(1024);

UPDATE contract_menus cm
JOIN (
    SELECT contract_menu_id, MAX(drive_url) as drive_url, MAX(drive_file_name) as drive_file_name
    FROM contract_menu_files
    WHERE deleted_at IS NULL
    GROUP BY contract_menu_id
) cmf ON cm.id = cmf.contract_menu_id
SET cm.drive_url = cmf.drive_url, cm.drive_file_name = cmf.drive_file_name;

DROP TABLE contract_menu_files;
