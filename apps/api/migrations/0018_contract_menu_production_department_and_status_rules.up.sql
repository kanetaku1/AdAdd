ALTER TABLE contract_menus
  ADD COLUMN production_department VARCHAR(32) NULL AFTER production_type,
  ADD KEY idx_contract_menus_production_department (production_department);

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

UPDATE contract_menus
SET status = 'WAITING'
WHERE production_type IN ('COMPANY', 'CONTINUED')
  AND NOT EXISTS (
    SELECT 1
    FROM contract_menu_drive_files
    WHERE contract_menu_drive_files.contract_menu_id = contract_menus.id
      AND contract_menu_drive_files.deleted_at IS NULL
  );

-- Existing INTERNAL rows cannot be assigned to a production department
-- automatically. Keep them in the only valid unassigned state until an
-- Advertisement Manager selects the department and moves them to REQUESTED.
UPDATE contract_menus
SET status = 'WAITING'
WHERE production_type = 'INTERNAL'
  AND NOT EXISTS (
    SELECT 1
    FROM contract_menu_drive_files
    WHERE contract_menu_drive_files.contract_menu_id = contract_menus.id
      AND contract_menu_drive_files.deleted_at IS NULL
  );
