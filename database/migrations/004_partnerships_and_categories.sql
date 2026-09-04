-- Partnerships and partnership categories.
--
-- RECONSTRUCTED — see the header of 003_media_privacy_and_resume_link.sql. This
-- file was applied to production on 2026-08-31 and recorded in
-- `schema_migrations`, but was never committed (MEL2-DB-001). Reconstructed
-- from the live schema and written to be a no-op on re-run.
--
-- Both tables were also created by bootstrapSchema() at API start, which is why
-- production has them regardless. Having them here as well is the point: the
-- schema should be reproducible from the repository, not from whatever the last
-- process boot happened to do.

CREATE TABLE IF NOT EXISTS `partnership_categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) DEFAULT NULL,
  `order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NULL DEFAULT NULL,
  `updated_at` DATETIME NULL DEFAULT NULL,
  `deleted_at` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_partnership_categories_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `partnerships` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) DEFAULT NULL,
  `category` VARCHAR(150) DEFAULT NULL,
  `partnership_type` VARCHAR(150) DEFAULT NULL,
  `description` TEXT NULL,
  `website` VARCHAR(500) DEFAULT NULL,
  `contact_email` VARCHAR(255) DEFAULT NULL,
  `contact_phone` VARCHAR(60) DEFAULT NULL,
  `logo_id` BIGINT UNSIGNED DEFAULT NULL,
  `order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NULL DEFAULT NULL,
  `updated_at` DATETIME NULL DEFAULT NULL,
  `deleted_at` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_partnerships_slug` (`slug`),
  KEY `idx_partnerships_active_order` (`is_active`, `order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
