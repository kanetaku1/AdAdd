-- 0001_create_tables.up.sql
-- Create initial tables according to spec model

CREATE TABLE IF NOT EXISTS years (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(32) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOL NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
  id CHAR(36) PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL UNIQUE,
  company_name_kana VARCHAR(255),
  postal_code VARCHAR(20),
  address VARCHAR(512),
  phone_number VARCHAR(64),
  website VARCHAR(255),
  contact_person_name VARCHAR(255),
  contact_email_or_form VARCHAR(512),
  first_sponsorship_year VARCHAR(16),
  memo TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS yearly_companies (
  id CHAR(36) PRIMARY KEY,
  year_id CHAR(36) NOT NULL,
  company_id CHAR(36) NOT NULL,
  company_status VARCHAR(32),
  phase VARCHAR(32),
  progress VARCHAR(32),
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_year_company (year_id, company_id),
  KEY idx_yearlycompany_year (year_id),
  KEY idx_yearlycompany_company (company_id)
);

CREATE TABLE IF NOT EXISTS sponsorship_contracts (
  id CHAR(36) PRIMARY KEY,
  yearly_company_id CHAR(36) NOT NULL UNIQUE,
  contract_date DATE,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  assignee_id CHAR(36),
  remarks TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sponsorship_menus (
  id CHAR(36) PRIMARY KEY,
  year_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  default_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  requires_submission BOOL NOT NULL DEFAULT FALSE,
  is_active BOOL NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_menu_year_name (year_id, name)
);

CREATE TABLE IF NOT EXISTS contract_menus (
  id CHAR(36) PRIMARY KEY,
  contract_id CHAR(36) NOT NULL,
  sponsorship_menu_id CHAR(36) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_goods_sponsorship BOOL NOT NULL DEFAULT FALSE,
  production_type VARCHAR(32),
  status VARCHAR(32),
  drive_folder_id VARCHAR(512),
  drive_url VARCHAR(1024),
  submitted_at DATETIME,
  remarks TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_contract_menus_contract (contract_id),
  KEY idx_contract_menus_menu (sponsorship_menu_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) PRIMARY KEY,
  contract_id CHAR(36) NOT NULL UNIQUE,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(32),
  confirmed_at DATETIME,
  confirmed_by_id CHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assignments (
  id CHAR(36) PRIMARY KEY,
  yearly_company_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role VARCHAR(32),
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_assignment_yearly_company (yearly_company_id)
);

CREATE TABLE IF NOT EXISTS advisor_assignments (
  id CHAR(36) PRIMARY KEY,
  year_id CHAR(36) NOT NULL,
  advisor_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_advisor_year_member_advisor (year_id, member_id, advisor_id)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id CHAR(36) PRIMARY KEY,
  yearly_company_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  action VARCHAR(255) NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  student_id VARCHAR(64),
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  slack_id VARCHAR(255),
  is_active BOOL NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
