-- Security columns and the partnerships table.
--
-- These were previously created only by bootstrapSchema() at API start, which
-- meant the live schema was whatever the last boot happened to do
-- (MEL-ENV-001). Run with `npm run migrate` so the shape is reviewable and the
-- boot-time DDL can be switched off with SCHEMA_BOOTSTRAP=0.
--
-- Made idempotent (MEL2-DB-001). The bare `ALTER TABLE ... ADD COLUMN` this
-- file used to carry fails on any database where bootstrapSchema had already
-- added the column — which is every deployed database — and because MySQL
-- commits DDL as it goes, the runner's rollback could not undo the statements
-- that had already succeeded. Each change now checks for itself first, so the
-- file is safe to run against a fresh database and against a live one.

-- users.is_root_admin — the real privilege boundary above super_admin.
-- Replaces the old test for the substring "admin" in a user's own name or
-- email, which any user could satisfy with a one-field profile edit
-- (MEL-SEC-001). Granted only via ROOT_ADMIN_EMAILS or direct SQL; it sits in
-- sqlSafe's SYSTEM_COLUMNS so no request body can reach it.
SET @stmt := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `users` ADD COLUMN `is_root_admin` TINYINT(1) NOT NULL DEFAULT 0',
    'DO 0'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'is_root_admin'
);
PREPARE add_is_root_admin FROM @stmt;
EXECUTE add_is_root_admin;
DEALLOCATE PREPARE add_is_root_admin;

-- users.password_changed_at — invalidates every JWT issued before it, so a
-- password change actually ends other sessions instead of leaving 7-day tokens
-- alive (MEL-SEC-007). Enforced in middleware/auth.js.
SET @stmt := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `users` ADD COLUMN `password_changed_at` TIMESTAMP NULL DEFAULT NULL',
    'DO 0'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'password_changed_at'
);
PREPARE add_password_changed_at FROM @stmt;
EXECUTE add_password_changed_at;
DEALLOCATE PREPARE add_password_changed_at;

-- Institutional partners for /partnerships. The admin UI shipped before the
-- storage, so the public page fell back to a hardcoded fixture array that named
-- a real university and its contact address as an affiliate (MEL-CONTENT-001).
CREATE TABLE IF NOT EXISTS partnerships (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) DEFAULT NULL,
  category VARCHAR(150) DEFAULT NULL,
  partnership_type VARCHAR(150) DEFAULT NULL,
  description TEXT NULL,
  website VARCHAR(500) DEFAULT NULL,
  contact_email VARCHAR(255) DEFAULT NULL,
  contact_phone VARCHAR(60) DEFAULT NULL,
  logo_id BIGINT UNSIGNED DEFAULT NULL,
  `order` INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_partnerships_slug (slug),
  KEY idx_partnerships_active_order (is_active, `order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
