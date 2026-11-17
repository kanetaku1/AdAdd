-- Issue #175: payments.confirmed_by_id is NULL while unset, never an empty
-- string (spec/database.md#Referential Integrity). Rows written before the
-- column became a nullable reference in the application stored '' for a
-- WAITING Payment; an empty string would fail the foreign key added next.
UPDATE payments SET confirmed_by_id = NULL WHERE confirmed_by_id = '';
