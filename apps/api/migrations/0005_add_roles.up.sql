-- 0005_add_roles.up.sql
-- Role/UserRole (spec/model.md#Role, #UserRole) — Issue #59

CREATE TABLE IF NOT EXISTS roles (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  role_id CHAR(36) NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY ux_user_role (user_id, role_id),
  KEY idx_user_roles_user (user_id),
  KEY idx_user_roles_role (role_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Canonical 7 roles (spec/domain.md#Role) — fixed, seeded once.
INSERT INTO roles (id, code, name) VALUES
  (UUID(), 'GENERAL_MEMBER', '一般メンバー'),
  (UUID(), 'SPONSORSHIP_MEMBER', '協賛実働メンバー'),
  (UUID(), 'ADVISOR', '協賛アドバイザー'),
  (UUID(), 'COMPANY_MANAGEMENT_DEPARTMENT', '企業管理部門'),
  (UUID(), 'SPONSORSHIP_MENU_MANAGEMENT_TEAM', '協賛メニュー管理チーム'),
  (UUID(), 'FINANCE_DEPARTMENT', '財務部門'),
  (UUID(), 'ADMINISTRATOR', '管理者');
