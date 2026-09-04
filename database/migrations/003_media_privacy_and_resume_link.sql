-- Media privacy columns and the résumé link on job applications.
--
-- RECONSTRUCTED. This migration was applied to the production database on
-- 2026-08-31 and recorded in `schema_migrations`, but the file itself was never
-- committed — the repository's migration set and the live schema had diverged,
-- so the environment could not be rebuilt from source and the next `npm run
-- migrate` had no idea what the database already contained (MEL2-DB-001).
--
-- The statements below were reconstructed from the live schema and are written
-- so that re-running them is a no-op. On the production database this file is
-- already recorded as applied and will be skipped; on a fresh database it
-- reproduces the same shape.
--
-- What it is for: a Cloudinary public id is what lets the application mint a
-- signed URL for a private asset and delete the remote file when the row goes;
-- `is_private` marks the assets that must never be delivered from a public URL;
-- and `resume_media_id` links an application to its file so a CV can be served
-- through an authorised, audited download instead of a permanent public link
-- (MEL2-SEC-004).

SET @stmt := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `media` ADD COLUMN `cloudinary_public_id` VARCHAR(255) NULL DEFAULT NULL AFTER `url`',
    'DO 0'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'media'
    AND COLUMN_NAME = 'cloudinary_public_id'
);
PREPARE add_public_id FROM @stmt;
EXECUTE add_public_id;
DEALLOCATE PREPARE add_public_id;

SET @stmt := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `media` ADD COLUMN `cloudinary_resource_type` VARCHAR(20) NULL DEFAULT NULL AFTER `cloudinary_public_id`',
    'DO 0'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'media'
    AND COLUMN_NAME = 'cloudinary_resource_type'
);
PREPARE add_resource_type FROM @stmt;
EXECUTE add_resource_type;
DEALLOCATE PREPARE add_resource_type;

SET @stmt := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `media` ADD COLUMN `is_private` TINYINT(1) NOT NULL DEFAULT 0 AFTER `cloudinary_resource_type`',
    'DO 0'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'media'
    AND COLUMN_NAME = 'is_private'
);
PREPARE add_is_private FROM @stmt;
EXECUTE add_is_private;
DEALLOCATE PREPARE add_is_private;

SET @stmt := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `job_applications` ADD COLUMN `resume_media_id` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `resume_path`',
    'DO 0'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'job_applications'
    AND COLUMN_NAME = 'resume_media_id'
);
PREPARE add_resume_media FROM @stmt;
EXECUTE add_resume_media;
DEALLOCATE PREPARE add_resume_media;

-- ON DELETE SET NULL, not CASCADE: removing a file must not silently delete the
-- application record that documents someone applied.
SET @stmt := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `job_applications` ADD CONSTRAINT `fk_job_applications_resume_media` FOREIGN KEY (`resume_media_id`) REFERENCES `media` (`id`) ON DELETE SET NULL',
    'DO 0'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'job_applications'
    AND CONSTRAINT_NAME = 'fk_job_applications_resume_media'
);
PREPARE add_resume_fk FROM @stmt;
EXECUTE add_resume_fk;
DEALLOCATE PREPARE add_resume_fk;
