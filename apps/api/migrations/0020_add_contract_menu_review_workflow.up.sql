CREATE TABLE contract_menu_submissions (
  id CHAR(36) NOT NULL,
  contract_menu_id CHAR(36) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  submission_sequence INT NOT NULL,
  submitted_by_id CHAR(36) NULL,
  submitted_at DATETIME(3) NOT NULL,
  reviewed_by_id CHAR(36) NULL,
  reviewed_at DATETIME(3) NULL,
  review_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_contract_menu_submission_sequence (contract_menu_id, submission_sequence),
  KEY idx_contract_menu_submissions_current (contract_menu_id, created_at),
  CONSTRAINT fk_contract_menu_submissions_menu FOREIGN KEY (contract_menu_id) REFERENCES contract_menus(id) ON DELETE CASCADE,
  CONSTRAINT fk_contract_menu_submissions_submitter FOREIGN KEY (submitted_by_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_contract_menu_submissions_reviewer FOREIGN KEY (reviewed_by_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

ALTER TABLE contract_menu_drive_files
  ADD COLUMN submission_id CHAR(36) NULL AFTER contract_menu_id,
  ADD COLUMN uploaded_by_id CHAR(36) NULL AFTER submission_id,
  ADD KEY idx_contract_menu_drive_files_submission (submission_id),
  ADD KEY idx_contract_menu_drive_files_uploader (uploaded_by_id);

INSERT INTO contract_menu_submissions (
  id, contract_menu_id, kind, submission_sequence, submitted_at, review_status, created_at, updated_at
)
SELECT
  UUID(), cm.id,
  CASE WHEN cm.production_type = 'INTERNAL' THEN 'MATERIAL' ELSE 'AD_DATA' END,
  1,
  COALESCE(cm.submitted_at, MIN(f.created_at), cm.updated_at, CURRENT_TIMESTAMP(3)),
  'PENDING',
  COALESCE(MIN(f.created_at), cm.updated_at, CURRENT_TIMESTAMP(3)),
  COALESCE(MAX(f.updated_at), cm.updated_at, CURRENT_TIMESTAMP(3))
FROM contract_menus cm
JOIN contract_menu_drive_files f ON f.contract_menu_id = cm.id AND f.deleted_at IS NULL
WHERE cm.deleted_at IS NULL
GROUP BY cm.id, cm.production_type, cm.submitted_at, cm.updated_at;

UPDATE contract_menu_drive_files f
JOIN contract_menu_submissions s ON s.contract_menu_id = f.contract_menu_id AND s.submission_sequence = 1
SET f.submission_id = s.id
WHERE f.deleted_at IS NULL;

ALTER TABLE contract_menu_drive_files
  ADD CONSTRAINT fk_contract_menu_drive_files_submission FOREIGN KEY (submission_id) REFERENCES contract_menu_submissions(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_contract_menu_drive_files_uploader FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE contract_menu_file_reviews (
  id CHAR(36) NOT NULL,
  submission_id CHAR(36) NOT NULL,
  contract_menu_drive_file_id CHAR(36) NOT NULL,
  reviewer_id CHAR(36) NULL,
  result VARCHAR(32) NOT NULL,
  reviewed_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_contract_menu_file_review (submission_id, contract_menu_drive_file_id),
  CONSTRAINT fk_contract_menu_file_reviews_submission FOREIGN KEY (submission_id) REFERENCES contract_menu_submissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_contract_menu_file_reviews_file FOREIGN KEY (contract_menu_drive_file_id) REFERENCES contract_menu_drive_files(id) ON DELETE CASCADE,
  CONSTRAINT fk_contract_menu_file_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

CREATE TABLE contract_menu_file_review_items (
  id CHAR(36) NOT NULL,
  review_id CHAR(36) NOT NULL,
  item_code VARCHAR(64) NOT NULL,
  label VARCHAR(255) NOT NULL,
  result VARCHAR(32) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_contract_menu_file_review_item (review_id, item_code),
  CONSTRAINT fk_contract_menu_file_review_items_review FOREIGN KEY (review_id) REFERENCES contract_menu_file_reviews(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

CREATE TABLE contract_menu_workflow_events (
  id CHAR(36) NOT NULL,
  contract_menu_id CHAR(36) NOT NULL,
  submission_id CHAR(36) NULL,
  contract_menu_drive_file_id CHAR(36) NULL,
  event_type VARCHAR(64) NOT NULL,
  actor_id CHAR(36) NULL,
  details JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_contract_menu_workflow_events_timeline (contract_menu_id, created_at, id),
  CONSTRAINT fk_contract_menu_workflow_events_menu FOREIGN KEY (contract_menu_id) REFERENCES contract_menus(id) ON DELETE CASCADE,
  CONSTRAINT fk_contract_menu_workflow_events_submission FOREIGN KEY (submission_id) REFERENCES contract_menu_submissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_contract_menu_workflow_events_file FOREIGN KEY (contract_menu_drive_file_id) REFERENCES contract_menu_drive_files(id) ON DELETE SET NULL,
  CONSTRAINT fk_contract_menu_workflow_events_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;

INSERT INTO contract_menu_workflow_events (
  id, contract_menu_id, submission_id, event_type, details, created_at
)
SELECT UUID(), contract_menu_id, id, 'LEGACY_SUBMISSION_MIGRATED', JSON_OBJECT('fileCount', (
  SELECT COUNT(*) FROM contract_menu_drive_files f WHERE f.submission_id = s.id AND f.deleted_at IS NULL
)), submitted_at
FROM contract_menu_submissions s;

UPDATE contract_menus cm
SET status = 'PROVISIONAL_SUBMITTED'
WHERE EXISTS (
  SELECT 1 FROM contract_menu_submissions s WHERE s.contract_menu_id = cm.id
);

UPDATE contract_menus
SET status = 'WAITING', submitted_at = NULL
WHERE status = 'SUBMITTED'
  AND NOT EXISTS (
    SELECT 1 FROM contract_menu_drive_files f
    WHERE f.contract_menu_id = contract_menus.id AND f.deleted_at IS NULL
  );
