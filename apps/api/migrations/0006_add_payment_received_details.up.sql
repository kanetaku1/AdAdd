ALTER TABLE payments
  ADD COLUMN received_amount DECIMAL(15,2) NULL AFTER amount,
  ADD COLUMN remarks TEXT NULL AFTER received_amount;

UPDATE payments
SET received_amount = amount
WHERE status = 'CONFIRMED' AND received_amount IS NULL;
