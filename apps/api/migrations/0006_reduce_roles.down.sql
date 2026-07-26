-- 0006_reduce_roles.down.sql
-- Re-adds the 3 removed roles as master data. Any UserRole grants that
-- existed before the up migration are not restored (deleted permanently
-- by the up migration, not merely soft-deleted).

INSERT INTO roles (id, code, name) VALUES
  (UUID(), 'GENERAL_MEMBER', '一般メンバー'),
  (UUID(), 'COMPANY_MANAGEMENT_DEPARTMENT', '企業管理部門'),
  (UUID(), 'SPONSORSHIP_MENU_MANAGEMENT_TEAM', '協賛メニュー管理チーム');
