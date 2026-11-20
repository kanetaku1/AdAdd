-- Issue #175: spec/database.md#Referential Integrity. year_id is the first
-- column of ux_menu_year_name, which serves as its index.
ALTER TABLE sponsorship_menus
  ADD CONSTRAINT fk_sponsorship_menus_year
    FOREIGN KEY (year_id) REFERENCES years (id) ON DELETE RESTRICT;
