-- Issue #126/#127: add the Advertisement Management Department permission
-- role to existing databases without changing the immutable baseline.
INSERT INTO roles (id, code, name)
SELECT UUID(), 'ADVERTISEMENT_MANAGER', '広告管理部門'
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE code = 'ADVERTISEMENT_MANAGER'
);
