-- Referral management and bed management.
--
-- Catchment facilities refer patients in to the hospital; the hospital accepts
-- or declines, allocates a bed, treats, and sends structured feedback back to
-- the referring facility. Facility staff sign in to a portal of their own to
-- raise referrals and to see which services and beds are actually available.
--
-- Design notes that matter later:
--
--  * Facility staff are NOT rows in `users`. A referral portal login must never
--    be one permission grant away from the hospital CMS, and the two have
--    different lifecycles — a facility account is created and revoked by the
--    hospital, in bulk, per site. `facility_users` is a separate table with its
--    own credentials, its own lockout counters and its own token audience.
--
--  * `referrals` carries the clinical record inline rather than pointing at a
--    patient table. A referral is a point-in-time clinical document: what the
--    referring clinician knew, wrote and sent. Normalising it into a shared
--    patient record would let later edits rewrite what was actually sent, which
--    is exactly what a referral must not allow.
--
--  * Bed state lives on `beds.status`, and the referral holds `assigned_bed_id`.
--    Allocation is done in a transaction that re-checks the bed is still free,
--    so two reviewers accepting different referrals cannot both take the last
--    bed.
--
-- Every statement is CREATE TABLE IF NOT EXISTS or guarded, so re-running is a
-- no-op (MEL2-DB-001).

-- ── Facilities in the catchment ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `referral_facilities` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  -- The national HMIS / Master Facility Registry code where the facility has
  -- one. Unique so the same site cannot be registered twice under two spellings.
  `code` VARCHAR(60) DEFAULT NULL,
  `type` ENUM('health_post','health_centre','primary_hospital','general_hospital','clinic','other')
    NOT NULL DEFAULT 'health_centre',
  `woreda` VARCHAR(150) DEFAULT NULL,
  `zone` VARCHAR(150) DEFAULT NULL,
  `region` VARCHAR(150) DEFAULT NULL,
  `contact_name` VARCHAR(255) DEFAULT NULL,
  `contact_phone` VARCHAR(30) DEFAULT NULL,
  `contact_email` VARCHAR(191) DEFAULT NULL,
  `notes` TEXT NULL,
  `status` ENUM('active','suspended') NOT NULL DEFAULT 'active',
  `created_by` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NULL DEFAULT NULL,
  `updated_at` DATETIME NULL DEFAULT NULL,
  `deleted_at` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_referral_facilities_code` (`code`),
  KEY `idx_referral_facilities_status` (`status`, `deleted_at`),
  KEY `idx_referral_facilities_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Facility portal logins ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `facility_users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `facility_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('representative','clinician') NOT NULL DEFAULT 'representative',
  `status` ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  -- The hospital issues the first password; the portal forces a change on the
  -- first sign-in so the issued one stops working immediately.
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 1,
  -- Same per-account throttle the hospital side uses (MEL2-SEC-006).
  `failed_login_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `locked_until` DATETIME NULL DEFAULT NULL,
  -- Invalidates every token issued before it, exactly as users.password_changed_at does.
  `password_changed_at` TIMESTAMP NULL DEFAULT NULL,
  `last_login_at` DATETIME NULL DEFAULT NULL,
  `last_login_ip` VARCHAR(45) DEFAULT NULL,
  `created_by` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NULL DEFAULT NULL,
  `updated_at` DATETIME NULL DEFAULT NULL,
  `deleted_at` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_facility_users_email` (`email`),
  KEY `idx_facility_users_facility` (`facility_id`, `status`),
  CONSTRAINT `fk_facility_users_facility`
    FOREIGN KEY (`facility_id`) REFERENCES `referral_facilities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Wards ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `wards` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(60) DEFAULT NULL,
  `department_id` BIGINT UNSIGNED DEFAULT NULL,
  `sex` ENUM('any','male','female') NOT NULL DEFAULT 'any',
  `description` TEXT NULL,
  `floor` VARCHAR(60) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NULL DEFAULT NULL,
  `updated_at` DATETIME NULL DEFAULT NULL,
  `deleted_at` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_wards_code` (`code`),
  KEY `idx_wards_active` (`is_active`, `order`),
  KEY `idx_wards_department` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Beds ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `beds` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ward_id` BIGINT UNSIGNED NOT NULL,
  `code` VARCHAR(60) NOT NULL,
  `label` VARCHAR(255) DEFAULT NULL,
  -- `cleaning` and `maintenance` are distinct from `occupied` on purpose: a
  -- facility looking at availability needs to know a bed is genuinely out of
  -- service, and the hospital needs to know why it is not being offered.
  `status` ENUM('available','occupied','reserved','cleaning','maintenance')
    NOT NULL DEFAULT 'available',
  `current_referral_id` BIGINT UNSIGNED DEFAULT NULL,
  `occupied_since` DATETIME NULL DEFAULT NULL,
  `notes` VARCHAR(500) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NULL DEFAULT NULL,
  `updated_at` DATETIME NULL DEFAULT NULL,
  `deleted_at` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_beds_ward_code` (`ward_id`, `code`),
  KEY `idx_beds_status` (`status`, `is_active`),
  CONSTRAINT `fk_beds_ward`
    FOREIGN KEY (`ward_id`) REFERENCES `wards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Referrals ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `referrals` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- Human-readable identifier both sides quote on the phone and on paper.
  `reference` VARCHAR(40) NOT NULL,
  `facility_id` BIGINT UNSIGNED NOT NULL,
  `facility_user_id` BIGINT UNSIGNED DEFAULT NULL,

  -- Patient demographics, as recorded by the referring facility.
  `patient_first_name` VARCHAR(100) NOT NULL,
  `patient_last_name` VARCHAR(100) NOT NULL,
  `patient_sex` ENUM('male','female','other') NOT NULL,
  -- Age in years and months, because a great many patients do not know a date
  -- of birth and paediatric referrals need months to be meaningful.
  `patient_age_years` INT UNSIGNED DEFAULT NULL,
  `patient_age_months` INT UNSIGNED DEFAULT NULL,
  `patient_date_of_birth` DATE NULL DEFAULT NULL,
  `patient_phone` VARCHAR(30) DEFAULT NULL,
  `patient_address` VARCHAR(500) DEFAULT NULL,
  -- The referring facility's own record number, so they can reconcile later.
  `patient_record_no` VARCHAR(60) DEFAULT NULL,

  -- Clinical content of the referral.
  `urgency` ENUM('emergency','urgent','routine') NOT NULL DEFAULT 'routine',
  `presenting_complaint` TEXT NOT NULL,
  `clinical_summary` TEXT NULL,
  `provisional_diagnosis` VARCHAR(500) DEFAULT NULL,
  `investigations` TEXT NULL,
  `treatment_given` TEXT NULL,
  `allergies` VARCHAR(500) DEFAULT NULL,
  -- Free-form vitals as JSON so a facility can send what it measured without
  -- the schema dictating a fixed set.
  `vitals` JSON NULL,
  `requested_department_id` BIGINT UNSIGNED DEFAULT NULL,
  `requested_service_id` BIGINT UNSIGNED DEFAULT NULL,
  `referring_clinician` VARCHAR(255) DEFAULT NULL,

  -- Workflow.
  `status` ENUM(
    'submitted','under_review','accepted','rejected',
    'cancelled','arrived','admitted','completed'
  ) NOT NULL DEFAULT 'submitted',
  `reviewed_by` BIGINT UNSIGNED DEFAULT NULL,
  `reviewed_at` DATETIME NULL DEFAULT NULL,
  `decision_note` TEXT NULL,
  `assigned_ward_id` BIGINT UNSIGNED DEFAULT NULL,
  `assigned_bed_id` BIGINT UNSIGNED DEFAULT NULL,
  `expected_arrival` DATETIME NULL DEFAULT NULL,
  `arrived_at` DATETIME NULL DEFAULT NULL,
  `admitted_at` DATETIME NULL DEFAULT NULL,
  `completed_at` DATETIME NULL DEFAULT NULL,
  `cancelled_reason` VARCHAR(500) DEFAULT NULL,

  `created_at` DATETIME NULL DEFAULT NULL,
  `updated_at` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_referrals_reference` (`reference`),
  KEY `idx_referrals_facility` (`facility_id`, `status`),
  KEY `idx_referrals_status_created` (`status`, `created_at`),
  KEY `idx_referrals_urgency` (`urgency`, `status`),
  KEY `idx_referrals_bed` (`assigned_bed_id`),
  CONSTRAINT `fk_referrals_facility`
    FOREIGN KEY (`facility_id`) REFERENCES `referral_facilities` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_referrals_ward`
    FOREIGN KEY (`assigned_ward_id`) REFERENCES `wards` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_referrals_bed`
    FOREIGN KEY (`assigned_bed_id`) REFERENCES `beds` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Feedback the hospital sends back after treatment ────────────────────────
CREATE TABLE IF NOT EXISTS `referral_feedback` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `referral_id` BIGINT UNSIGNED NOT NULL,
  `author_id` BIGINT UNSIGNED DEFAULT NULL,
  `final_diagnosis` VARCHAR(500) DEFAULT NULL,
  `treatment_summary` TEXT NULL,
  `outcome` ENUM('recovered','improved','referred_on','self_discharged','died','other')
    NOT NULL DEFAULT 'improved',
  `follow_up_instructions` TEXT NULL,
  `medications_on_discharge` TEXT NULL,
  `discharged_on` DATE NULL DEFAULT NULL,
  `created_at` DATETIME NULL DEFAULT NULL,
  `updated_at` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_referral_feedback_referral` (`referral_id`),
  CONSTRAINT `fk_referral_feedback_referral`
    FOREIGN KEY (`referral_id`) REFERENCES `referrals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Every transition, both sides, permanently ───────────────────────────────
-- A referral is a clinical hand-off between two institutions. When it is
-- disputed later, "who changed this to rejected, and when" has to be answerable
-- from the record itself rather than from the general audit log.
CREATE TABLE IF NOT EXISTS `referral_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `referral_id` BIGINT UNSIGNED NOT NULL,
  `actor_type` ENUM('facility','hospital','system') NOT NULL,
  `actor_id` BIGINT UNSIGNED DEFAULT NULL,
  `actor_name` VARCHAR(255) DEFAULT NULL,
  `action` VARCHAR(60) NOT NULL,
  `from_status` VARCHAR(30) DEFAULT NULL,
  `to_status` VARCHAR(30) DEFAULT NULL,
  `note` TEXT NULL,
  `created_at` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_referral_events_referral` (`referral_id`, `created_at`),
  CONSTRAINT `fk_referral_events_referral`
    FOREIGN KEY (`referral_id`) REFERENCES `referrals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Permissions ─────────────────────────────────────────────────────────────
-- Inserted here rather than left to the boot-time seeder, because
-- SCHEMA_BOOTSTRAP is off in production and an unmounted permission would make
-- every new route throw at startup (routes/index.js refuses to mount a resource
-- with no RESOURCE_PERMISSIONS entry).
INSERT IGNORE INTO `permissions` (`name`, `slug`, `module`, `description`, `created_at`, `updated_at`)
VALUES
  ('Manage Facilities', 'manage_facilities', 'referrals', 'Register catchment facilities and issue portal logins', NOW(), NOW()),
  ('Manage Referrals', 'manage_referrals', 'referrals', 'Review, accept, decline and complete incoming referrals', NOW(), NOW()),
  ('Manage Beds', 'manage_beds', 'beds', 'Manage wards, beds and bed allocation', NOW(), NOW());

-- Give the two seeded administrative roles the new permissions, so the feature
-- is reachable immediately after migrating rather than only after someone
-- remembers to tick three boxes.
--
-- NOT EXISTS rather than INSERT IGNORE. `role_permissions` does carry a
-- composite unique key on (role_id, permission_id), so IGNORE would in fact
-- dedupe correctly here — but that makes idempotency a property of an index
-- this migration neither creates nor checks. Stating the condition in the
-- statement keeps the file correct against a schema where that key is ever
-- dropped, and says plainly what "run twice safely" depends on.
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`, `updated_at`)
SELECT r.id, p.id, NOW(), NOW()
FROM `roles` r
JOIN `permissions` p ON p.slug IN ('manage_facilities','manage_referrals','manage_beds')
WHERE r.slug IN ('super_admin','admin')
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
