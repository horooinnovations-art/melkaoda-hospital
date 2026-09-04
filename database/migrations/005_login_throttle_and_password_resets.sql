-- Per-account login throttling and self-service password reset.
--
-- Login was guarded only by an 8-per-minute limiter keyed on the client IP, so
-- guessing from a pool of addresses was unconstrained (MEL2-SEC-006). And there
-- was no password-reset path at all: an administrator who forgot their password
-- needed another administrator or a redeploy with ADMIN_RESET_PASSWORD.
--
-- Written to be re-runnable. MySQL commits DDL as it goes, so a migration that
-- fails half way through cannot be rolled back — every statement therefore
-- checks for its own object first (MEL2-DB-001).

SET @stmt := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `users` ADD COLUMN `failed_login_count` INT UNSIGNED NOT NULL DEFAULT 0',
    'DO 0'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'failed_login_count'
);
PREPARE add_failed_count FROM @stmt;
EXECUTE add_failed_count;
DEALLOCATE PREPARE add_failed_count;

SET @stmt := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `users` ADD COLUMN `locked_until` DATETIME NULL DEFAULT NULL',
    'DO 0'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'locked_until'
);
PREPARE add_locked_until FROM @stmt;
EXECUTE add_locked_until;
DEALLOCATE PREPARE add_locked_until;

-- Only the SHA-256 of the token is stored, so a leaked row cannot be replayed
-- as a reset link. One live token per user; `used_at` makes it single-use.
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME NULL DEFAULT NULL,
  `created_at` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_password_resets_token` (`token_hash`),
  KEY `idx_password_resets_user` (`user_id`),
  KEY `idx_password_resets_expiry` (`expires_at`),
  CONSTRAINT `fk_password_resets_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
