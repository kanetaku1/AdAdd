-- Issue #162: a Contract Menu whose Sponsorship Menu does not require
-- submission has no production type, stored as NULL
-- (spec/model.md#ContractMenuProductionType). Rows written before the column
-- became nullable in the application stored an empty string instead.
UPDATE contract_menus SET production_type = NULL WHERE production_type = '';
