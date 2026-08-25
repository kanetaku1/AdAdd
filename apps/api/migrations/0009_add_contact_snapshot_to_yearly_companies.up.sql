ALTER TABLE yearly_companies
  ADD COLUMN postal_code VARCHAR(20) NOT NULL DEFAULT '' AFTER progress,
  ADD COLUMN address VARCHAR(512) NOT NULL DEFAULT '' AFTER postal_code,
  ADD COLUMN phone_number VARCHAR(64) NOT NULL DEFAULT '' AFTER address,
  ADD COLUMN website VARCHAR(255) NOT NULL DEFAULT '' AFTER phone_number,
  ADD COLUMN contact_person_name VARCHAR(255) NOT NULL DEFAULT '' AFTER website,
  ADD COLUMN contact_email_or_form VARCHAR(512) NOT NULL DEFAULT '' AFTER contact_person_name,
  ADD COLUMN memo TEXT AFTER contact_email_or_form;

UPDATE yearly_companies yc
INNER JOIN companies c ON c.id = yc.company_id
SET
  yc.postal_code = COALESCE(c.postal_code, ''),
  yc.address = COALESCE(c.address, ''),
  yc.phone_number = COALESCE(c.phone_number, ''),
  yc.website = COALESCE(c.website, ''),
  yc.contact_person_name = COALESCE(c.contact_person_name, ''),
  yc.contact_email_or_form = COALESCE(c.contact_email_or_form, ''),
  yc.memo = COALESCE(c.memo, '');
