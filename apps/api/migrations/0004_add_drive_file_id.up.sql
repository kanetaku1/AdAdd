-- ADR-0006: persist the immutable Google Drive identifier used to trash a
-- file through the dedicated Drive account. Existing references remain valid
-- and may recover the identifier from their URL when deleted.
ALTER TABLE contract_menu_drive_files
  ADD COLUMN drive_file_id VARCHAR(255) NULL AFTER contract_menu_id,
  ADD KEY idx_contract_menu_drive_files_drive_file_id (drive_file_id);
