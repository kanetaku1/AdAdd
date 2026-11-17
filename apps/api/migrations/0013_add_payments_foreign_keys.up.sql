-- Issue #175: spec/database.md#Referential Integrity. contract_id is indexed
-- by its UNIQUE key; confirmed_by_id gets its own index. Empty strings were
-- turned into NULL by 0008.
ALTER TABLE payments
  ADD KEY idx_payments_confirmed_by_id (confirmed_by_id),
  ADD CONSTRAINT fk_payments_contract
    FOREIGN KEY (contract_id) REFERENCES sponsorship_contracts (id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_payments_confirmed_by
    FOREIGN KEY (confirmed_by_id) REFERENCES users (id) ON DELETE RESTRICT;
