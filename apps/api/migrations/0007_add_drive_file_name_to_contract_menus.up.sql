ALTER TABLE contract_menus ADD COLUMN drive_file_name VARCHAR(1024) DEFAULT '' NOT NULL AFTER drive_url;
