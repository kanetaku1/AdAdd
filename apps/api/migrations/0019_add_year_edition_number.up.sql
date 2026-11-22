ALTER TABLE years
  ADD COLUMN edition_number INT NULL AFTER is_active;

UPDATE years SET edition_number = 44 WHERE name = '2025';
UPDATE years SET edition_number = 45 WHERE name = '2026';
