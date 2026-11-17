-- Issue #175: spec/database.md#Referential Integrity. Both columns already
-- have an index (idx_contract_menus_contract, idx_contract_menus_menu).
ALTER TABLE contract_menus
  ADD CONSTRAINT fk_contract_menus_contract
    FOREIGN KEY (contract_id) REFERENCES sponsorship_contracts (id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_contract_menus_sponsorship_menu
    FOREIGN KEY (sponsorship_menu_id) REFERENCES sponsorship_menus (id) ON DELETE RESTRICT;
