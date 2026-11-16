ALTER TABLE years
  ADD COLUMN issuer_name VARCHAR(255) NULL,
  ADD COLUMN issuer_postal_code VARCHAR(20) NULL,
  ADD COLUMN issuer_address_line1 VARCHAR(512) NULL,
  ADD COLUMN issuer_address_line2 VARCHAR(512) NULL,
  ADD COLUMN issuer_email VARCHAR(255) NULL,
  ADD COLUMN bank_name VARCHAR(255) NULL,
  ADD COLUMN bank_branch_name VARCHAR(255) NULL,
  ADD COLUMN bank_account_type VARCHAR(64) NULL,
  ADD COLUMN bank_account_number VARCHAR(64) NULL,
  ADD COLUMN bank_account_holder_name VARCHAR(255) NULL;
