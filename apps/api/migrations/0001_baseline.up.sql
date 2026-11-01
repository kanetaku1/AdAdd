-- 0001_baseline.up.sql
-- The whole schema as of the first production database (spec/database.md).
-- It replaces the development-era migrations 0001–0012, which were squashed
-- before any production data existed (spec/development.md#Baseline).
-- Later changes are new migrations from 0002 on; this file never changes.

-- Every character difference counts in names; users.email is the one
-- case-insensitive column (spec/database.md#Character Set and Collation).
-- Tables added by later migrations inherit this default.
ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;

CREATE TABLE years (
  id CHAR(36) NOT NULL,
  name VARCHAR(32) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_years_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

CREATE TABLE companies (
  id CHAR(36) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  company_name_kana VARCHAR(255) NULL,
  postal_code VARCHAR(20) NULL,
  address VARCHAR(512) NULL,
  phone_number VARCHAR(64) NULL,
  website VARCHAR(255) NULL,
  contact_person_name VARCHAR(255) NULL,
  contact_email_or_form VARCHAR(512) NULL,
  first_sponsorship_year VARCHAR(16) NULL,
  memo TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY company_name (company_name),
  KEY idx_companies_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

-- Contact fields are this Year's snapshot of the Company (spec/model.md#YearlyCompany).
CREATE TABLE yearly_companies (
  id CHAR(36) NOT NULL,
  year_id CHAR(36) NOT NULL,
  company_id CHAR(36) NOT NULL,
  company_status VARCHAR(32) NULL,
  phase VARCHAR(32) NULL,
  progress VARCHAR(32) NULL,
  postal_code VARCHAR(20) NOT NULL DEFAULT '',
  address VARCHAR(512) NOT NULL DEFAULT '',
  phone_number VARCHAR(64) NOT NULL DEFAULT '',
  website VARCHAR(255) NOT NULL DEFAULT '',
  contact_person_name VARCHAR(255) NOT NULL DEFAULT '',
  contact_email_or_form VARCHAR(512) NOT NULL DEFAULT '',
  memo TEXT NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_year_company (year_id, company_id),
  KEY idx_yearlycompany_year (year_id),
  KEY idx_yearlycompany_company (company_id),
  KEY idx_yearly_companies_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

-- At most one contract per Yearly Company.
CREATE TABLE sponsorship_contracts (
  id CHAR(36) NOT NULL,
  yearly_company_id CHAR(36) NOT NULL,
  contract_date DATE NULL,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  assignee_id CHAR(36) NULL,
  remarks TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY yearly_company_id (yearly_company_id),
  KEY idx_sponsorship_contracts_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

CREATE TABLE sponsorship_menus (
  id CHAR(36) NOT NULL,
  year_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  default_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  requires_submission TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  max_quantity INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_menu_year_name (year_id, name),
  KEY idx_sponsorship_menus_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

CREATE TABLE contract_menus (
  id CHAR(36) NOT NULL,
  contract_id CHAR(36) NOT NULL,
  sponsorship_menu_id CHAR(36) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  is_goods_sponsorship TINYINT(1) NOT NULL DEFAULT 0,
  production_type VARCHAR(32) NULL,
  status VARCHAR(32) NULL,
  drive_folder_id VARCHAR(512) NULL,
  drive_url VARCHAR(1024) NULL,
  drive_file_name VARCHAR(1024) NOT NULL DEFAULT '',
  submitted_at DATETIME NULL,
  remarks TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_contract_menus_contract (contract_id),
  KEY idx_contract_menus_menu (sponsorship_menu_id),
  KEY idx_contract_menus_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

-- At most one payment per contract.
CREATE TABLE payments (
  id CHAR(36) NOT NULL,
  contract_id CHAR(36) NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(32) NULL,
  confirmed_at DATETIME NULL,
  confirmed_by_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY contract_id (contract_id),
  KEY idx_payments_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

-- Company assignment: zero or one Sponsorship Member per Yearly Company.
CREATE TABLE assignments (
  id CHAR(36) NOT NULL,
  yearly_company_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_assignment_yearly_company (yearly_company_id),
  KEY idx_assignments_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

CREATE TABLE advisor_assignments (
  id CHAR(36) NOT NULL,
  year_id CHAR(36) NOT NULL,
  advisor_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_advisor_year_member_advisor (year_id, member_id, advisor_id),
  KEY idx_advisor_assignments_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

CREATE TABLE activity_logs (
  id CHAR(36) NOT NULL,
  yearly_company_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  action VARCHAR(255) NOT NULL,
  description TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

CREATE TABLE users (
  id CHAR(36) NOT NULL,
  student_id VARCHAR(64) NULL,
  name VARCHAR(255) NULL,
  email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  slack_id VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY email (email),
  KEY idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

-- Role is fixed master data (spec/domain.md#Role).
CREATE TABLE roles (
  id CHAR(36) NOT NULL,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

CREATE TABLE user_roles (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role_id CHAR(36) NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_user_role (user_id, role_id),
  KEY idx_user_roles_user (user_id),
  KEY idx_user_roles_role (role_id),
  CONSTRAINT user_roles_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT user_roles_ibfk_2 FOREIGN KEY (role_id) REFERENCES roles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

-- The four Roles. Their ids differ per database; always look them up by code.
INSERT INTO roles (id, code, name) VALUES
  (UUID(), 'SPONSORSHIP_MEMBER', '協賛実働メンバー'),
  (UUID(), 'ADVISOR', '協賛アドバイザー'),
  (UUID(), 'FINANCE_DEPARTMENT', '財務部門'),
  (UUID(), 'ADMINISTRATOR', '管理者');
