-- 0006_reduce_roles.up.sql
-- Role set reduced from 7 to 4 (spec/domain.md#Role). General Member,
-- Company Management Department, and Sponsorship Menu Management Team are
-- removed as system Roles — their real-world teams still exist
-- (spec/business.md), but their members now act under the Sponsorship
-- Member Role instead of a dedicated one. Holding no Role is the new
-- view-only baseline that replaces General Member.

-- Revoke any existing grants of the roles being removed before deleting
-- the role rows themselves (roles.id is referenced by user_roles.role_id).
DELETE ur FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE r.code IN ('GENERAL_MEMBER', 'COMPANY_MANAGEMENT_DEPARTMENT', 'SPONSORSHIP_MENU_MANAGEMENT_TEAM');

DELETE FROM roles
WHERE code IN ('GENERAL_MEMBER', 'COMPANY_MANAGEMENT_DEPARTMENT', 'SPONSORSHIP_MENU_MANAGEMENT_TEAM');
