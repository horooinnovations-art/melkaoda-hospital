import { query, queryOne } from './db.js';
import { formatAddress } from '../utils/settings.js';
import { slugify } from '../utils/helpers.js';
import { CANONICAL_PERMISSIONS } from './permissions.js';

/**
 * Idempotent, additive schema guards. Runs on server start so features that
 * need a column (e.g. hiding gallery images from the public site) work even
 * on databases created before the column existed. Never drops or alters data.
 */
async function columnExists(table, column) {
  const rows = await query(
    `SELECT COUNT(*) AS c
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :table
       AND COLUMN_NAME = :column`,
    { table, column }
  );
  return Number(rows?.[0]?.c || 0) > 0;
}

async function ensureColumn(table, column, definition) {
  try {
    if (await columnExists(table, column)) return;
    await query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
    console.log(`[schema] added ${table}.${column}`);
  } catch (err) {
    console.warn(`[schema] could not ensure ${table}.${column}: ${err.message}`);
  }
}

async function cleanupDuplicatedAddress() {
  try {
    for (const key of ['address_line1', 'address', 'address_line2']) {
      const row = await queryOne(`SELECT value FROM settings WHERE \`key\` = :key`, { key });
      if (!row?.value) continue;
      const cleaned = formatAddress(row.value);
      if (!cleaned || cleaned === String(row.value).trim()) continue;
      await query(
        `UPDATE settings SET value = :value, updated_at = NOW() WHERE \`key\` = :key`,
        { key, value: cleaned }
      );
      console.log(`[schema] cleaned duplicated tokens in settings.${key}`);
    }
  } catch (err) {
    console.warn(`[schema] address cleanup skipped: ${err.message}`);
  }
}

/**
 * Backfill slug for any gallery row that has NULL or empty slug.
 * Uses the same slugify logic as the crudFactory so URLs are consistent.
 */
async function backfillGallerySlugs() {
  try {
    const rows = await query(
      `SELECT id, title FROM \`gallery\` WHERE slug IS NULL OR slug = '' ORDER BY id ASC`
    );
    if (!rows.length) return;

    // Fetch all existing slugs once so we can avoid duplicates.
    const existing = await query(`SELECT slug FROM \`gallery\` WHERE slug IS NOT NULL AND slug != ''`);
    const usedSlugs = new Set(existing.map((r) => r.slug));

    let fixed = 0;
    for (const row of rows) {
      let base = slugify(row.title || `gallery-${row.id}`);
      let candidate = base;
      let n = 2;
      // If the candidate slug is already taken, append a counter.
      while (usedSlugs.has(candidate)) {
        candidate = `${base}-${n++}`;
      }
      usedSlugs.add(candidate);
      await query(
        `UPDATE \`gallery\` SET slug = :slug, updated_at = NOW() WHERE id = :id`,
        { slug: candidate, id: row.id }
      );
      fixed++;
    }
    if (fixed) console.log(`[schema] backfilled slugs for ${fixed} gallery row(s)`);
  } catch (err) {
    console.warn(`[schema] gallery slug backfill skipped: ${err.message}`);
  }
}

/**
 * Ensure Deder manage_* / view_* permission rows exist and are assigned to
 * system roles so RBAC works out of the box.
 */
async function ensureRbacPermissions() {
  try {
    let created = 0;
    for (const perm of CANONICAL_PERMISSIONS) {
      const existing = await queryOne(`SELECT id FROM permissions WHERE slug = :slug LIMIT 1`, {
        slug: perm.slug,
      });
      if (existing) continue;
      await query(
        `INSERT INTO permissions (name, slug, module, description, created_at, updated_at)
         VALUES (:name, :slug, :module, :description, NOW(), NOW())`,
        {
          name: perm.name,
          slug: perm.slug,
          module: perm.module,
          description: perm.name,
        }
      );
      created++;
    }
    if (created) console.log(`[schema] seeded ${created} canonical permission(s)`);

    const placeholders = CANONICAL_PERMISSIONS.map((_, i) => `:s${i}`).join(',');
    const slugParams = Object.fromEntries(
      CANONICAL_PERMISSIONS.map((p, i) => [`s${i}`, p.slug])
    );
    const allPerms = await query(
      `SELECT id, slug FROM permissions WHERE slug IN (${placeholders})`,
      slugParams
    );

    async function attachAllToRole(roleSlug, { exclude = [] } = {}) {
      const role = await queryOne(`SELECT id FROM roles WHERE slug = :slug LIMIT 1`, {
        slug: roleSlug,
      });
      if (!role) return;
      let attached = 0;
      for (const perm of allPerms) {
        if (exclude.includes(perm.slug)) continue;
        const linked = await queryOne(
          `SELECT id FROM role_permissions WHERE role_id = :rid AND permission_id = :pid LIMIT 1`,
          { rid: role.id, pid: perm.id }
        );
        if (linked) continue;
        await query(
          `INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
           VALUES (:rid, :pid, NOW(), NOW())`,
          { rid: role.id, pid: perm.id }
        );
        attached++;
      }
      if (attached) {
        console.log(`[schema] attached ${attached} permission(s) to role ${roleSlug}`);
      }
    }

    // super_admin: all (bypass also applies, but keep matrix complete for role editor)
    await attachAllToRole('super_admin');
    // admin: all except manage_permissions (Permissions page is super-only in Deder)
    await attachAllToRole('admin', { exclude: ['manage_permissions'] });
  } catch (err) {
    console.warn(`[schema] ensureRbacPermissions skipped: ${err.message}`);
  }
}

/**
 * Institutional partners for /partnerships and Admin → Partnerships. The admin
 * UI shipped before the storage did, so the public page fell back to hardcoded
 * sample partners (MEL-CONTENT-001).
 */
async function ensurePartnershipsTable() {
  try {
    await query(
      `CREATE TABLE IF NOT EXISTS \`partnerships\` (
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
        \`order\` INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NULL,
        updated_at DATETIME NULL,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_partnerships_slug (slug),
        KEY idx_partnerships_active_order (is_active, \`order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );
  } catch (err) {
    console.warn(`[schema] partnerships table check skipped: ${err.message}`);
  }
}

async function ensurePartnershipCategoriesTable() {
  try {
    await query(
      `CREATE TABLE IF NOT EXISTS \`partnership_categories\` (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) DEFAULT NULL,
        \`order\` INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NULL,
        updated_at DATETIME NULL,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_partnership_categories_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );
    console.log('[schema] ensured partnership_categories table exists');
  } catch (err) {
    console.warn(`[schema] partnership_categories table check skipped: ${err.message}`);
  }
}

/**
 * Downloads centre storage (public /downloads, admin CRUD).
 * `file_*` columns are denormalized from the `media` row on save so the public
 * list can print a size and a type without joining media for every entry.
 */
async function ensureDownloadsTable() {
  try {
    await query(
      `CREATE TABLE IF NOT EXISTS \`downloads\` (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) DEFAULT NULL,
        description TEXT NULL,
        category VARCHAR(150) DEFAULT NULL,
        file_id BIGINT UNSIGNED DEFAULT NULL,
        file_url VARCHAR(500) DEFAULT NULL,
        file_name VARCHAR(255) DEFAULT NULL,
        file_type VARCHAR(32) DEFAULT NULL,
        file_size BIGINT UNSIGNED DEFAULT NULL,
        version VARCHAR(60) DEFAULT NULL,
        published_at DATE NULL,
        download_count INT UNSIGNED NOT NULL DEFAULT 0,
        \`order\` INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        is_featured TINYINT(1) NOT NULL DEFAULT 0,
        meta_title VARCHAR(255) DEFAULT NULL,
        meta_description TEXT NULL,
        created_at DATETIME NULL,
        updated_at DATETIME NULL,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_downloads_slug (slug),
        KEY idx_downloads_public (is_active, \`order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );
    console.log('[schema] ensured downloads table exists');
  } catch (err) {
    console.warn(`[schema] downloads table check skipped: ${err.message}`);
  }
}

/**
 * Opening copy for the two settings-driven public pages.
 *
 * These are seeds, not defaults baked into the frontend: every one of these keys
 * is an editable field in Admin → Settings (Patient Guide / Downloads tabs), and
 * the seed exists so those pages are not blank on a database that predates them.
 * Written with INSERT IGNORE, so an editor's own wording is never overwritten —
 * including a deliberately emptied field, which keeps its empty row.
 *
 * `patient_guide_directions` and `patient_guide_admission` are intentionally
 * absent: the first falls back to the address on the Address tab, and the second
 * is optional, so seeding either would invent hospital policy.
 */
const SEED_CONTENT_SETTINGS = {
  patient_guide_intro:
    'Everything you need to plan your visit and make the most of your healthcare experience.',
  visiting_hours: 'Daily: 02:00 – 06:00 and 07:00 – 11:00 LT',
  patient_guide_insurance:
    '<ol>' +
    '<li>Accepted payment methods include Community Based Health Insurance (CBHI), exempted government services, and cash.</li>' +
    '<li>Please carry a valid insurance card and verify your eligibility at the registration desk before service.</li>' +
    '<li>Credit-based care is available to government offices, NGOs and religious institutions that hold an agreement with the hospital.</li>' +
    '</ol>',
  patient_guide_documents:
    '<ul>' +
    '<li>National ID or Kebele ID</li>' +
    '<li>Prior medical records, if available</li>' +
    '<li>Current medication list or prescriptions</li>' +
    '<li>Valid insurance or CBHI card</li>' +
    '<li>Institutional unique ID card, where a credit agreement with the hospital exists</li>' +
    '</ul>',
  patient_guide_additional:
    '<ul>' +
    '<li>Restrictions may apply in critical care units.</li>' +
    '<li>Only one visitor is allowed per patient during visiting time.</li>' +
    '<li>Please arrive early for registration and screening procedures.</li>' +
    '<li>Follow hospital rules and infection prevention guidelines at all times.</li>' +
    '</ul>',
  patient_guide_tips:
    '<h3>Arrive Early</h3><p>Arrive 15–30 minutes before your appointment for registration.</p>' +
    '<h3>Bring a Companion</h3><p>A companion can help with forms and offer support during your visit.</p>' +
    '<h3>List Your Questions</h3><p>Write down your questions for the physician in advance.</p>',
  patient_guide_help:
    'Our patient services team is happy to answer any question before you arrive.',
  downloads_intro:
    'Access forms, guides, and essential resources for patients, partners, and healthcare professionals.',

  /**
   * About-page institutional copy.
   *
   * Written to be true of this hospital as a general hospital serving a
   * catchment, and deliberately free of any claim only the hospital can make —
   * no dates, no figures, no accreditations, no place names. Those belong in
   * the Settings fields an editor controls. Like everything else here it is
   * INSERT IGNORE, so an editor's own wording is never overwritten.
   */
  purpose:
    '<p>Melka Oda General Hospital exists to make good hospital care an ordinary ' +
    'expectation rather than a journey. We serve the people of our catchment and the ' +
    'health facilities that refer into us, so that a person needing care can find it ' +
    'close to home, without delay, and without being turned away.</p>' +
    '<p>Everything below — our mission, our values and the promises we make to ' +
    'patients — follows from that one commitment.</p>',

  patient_care_promise:
    '<ol>' +
    '<li><strong>You will be seen in order of clinical need.</strong> Triage decides who is seen first, never who arrived first or who is known to us.</li>' +
    '<li><strong>You will be told what is happening, in a language you understand.</strong> Your diagnosis, your options and what happens next, explained before you are asked to consent.</li>' +
    '<li><strong>You will know what it costs before you owe it.</strong> Fees, exemptions and insurance cover are explained at registration, not at discharge.</li>' +
    '<li><strong>Your dignity and privacy are not optional.</strong> Examinations are screened, your records are confidential, and your consent is asked for.</li>' +
    '<li><strong>You may ask, question and refuse.</strong> Seeking a second opinion or declining a treatment will not change the standard of care you receive.</li>' +
    '<li><strong>Your referral will be answered.</strong> A facility that sends us a patient receives a decision, and receives our feedback once treatment is complete.</li>' +
    '<li><strong>Emergency care does not wait for paperwork.</strong> Life-saving treatment begins first; registration follows.</li>' +
    '<li><strong>You can tell us when we fall short.</strong> Every complaint is recorded and answered, and no one is disadvantaged for raising one.</li>' +
    '</ol>',
};

/**
 * Insert the seed copy for any key the database has never held.
 *
 * `settings.key` carries a unique index, so INSERT IGNORE is the whole guard:
 * a key that exists — with any value, including an empty one — is skipped.
 */
async function seedContentSettings() {
  for (const [key, value] of Object.entries(SEED_CONTENT_SETTINGS)) {
    try {
      const result = await query(
        `INSERT IGNORE INTO \`settings\` (\`key\`, value, type, created_at, updated_at)
         VALUES (:key, :value, 'string', NOW(), NOW())`,
        { key, value }
      );
      if (result?.affectedRows) console.log(`[schema] seeded settings.${key}`);
    } catch (err) {
      console.warn(`[schema] could not seed settings.${key}: ${err.message}`);
    }
  }
}

/**
 * Hosts that are unambiguously a developer's own machine.
 */
const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'host.docker.internal', '']);

/**
 * Boot-time DDL must never fire from a development process against a remote
 * database.
 *
 * `backend/.env` carries the live Aiven credentials with NODE_ENV=development
 * and no SCHEMA_BOOTSTRAP setting, so `npm run dev` issued ALTER TABLE, seeded
 * settings, backfilled slugs and rewrote addresses on production hospital data
 * — as a side effect of starting a dev server (MEL2-OPS-001).
 *
 * Production still bootstraps when the operator leaves it enabled; what is
 * refused is the combination "not production" plus "not a local database",
 * which has no legitimate use.
 */
export function bootstrapWouldTouchRemoteDb({
  nodeEnv = process.env.NODE_ENV,
  dbHost = process.env.DB_HOST,
} = {}) {
  const isProd = String(nodeEnv || '').toLowerCase() === 'production';
  if (isProd) return false;
  const host = String(dbHost || '').trim().toLowerCase();
  return !LOCAL_DB_HOSTS.has(host);
}

export async function bootstrapSchema() {
  if (bootstrapWouldTouchRemoteDb()) {
    throw new Error(
      `refusing to run boot-time schema changes: NODE_ENV is "${process.env.NODE_ENV || 'unset'}" ` +
        `but DB_HOST is the remote host "${process.env.DB_HOST}". Point this environment at a ` +
        'development database, or set SCHEMA_BOOTSTRAP=0 and use `npm run migrate` deliberately.'
    );
  }

  // Visibility toggle for gallery images (hide from public without deleting).
  await ensureColumn(
    'gallery',
    'is_active',
    '`is_active` TINYINT(1) NOT NULL DEFAULT 1'
  );

  // Slug column — required for pretty URLs like /gallery/loke-general-hospital-gate.
  await ensureColumn(
    'gallery',
    'slug',
    '`slug` VARCHAR(255) NULL DEFAULT NULL'
  );

  // Root-admin marker: the real privilege boundary above super_admin. Replaces
  // the old "name/email contains 'admin'" test, which was self-grantable
  // (MEL-SEC-001). Never writable through the API — see sqlSafe SYSTEM_COLUMNS.
  await ensureColumn(
    'users',
    'is_root_admin',
    '`is_root_admin` TINYINT(1) NOT NULL DEFAULT 0'
  );

  // Password-change timestamp: invalidates JWTs issued before it (MEL-SEC-007).
  await ensureColumn(
    'users',
    'password_changed_at',
    '`password_changed_at` TIMESTAMP NULL DEFAULT NULL'
  );

  // Ensure partnership category storage exists for admin select options.
  await ensurePartnershipCategoriesTable();
  await ensurePartnershipsTable();

  // Downloads centre (public /downloads + Admin → Downloads).
  await ensureDownloadsTable();

  // Opening copy for /patient-guide and /downloads, if never set.
  await seedContentSettings();

  // Fill in slugs for any gallery rows created before this column existed.
  await backfillGallerySlugs();

  // Fix already-polluted address_line1 values in the DB.
  await cleanupDuplicatedAddress();

  // Create the very first admin on an empty database. Does not reactivate,
  // restore or re-password existing accounts unless explicitly asked to.
  await ensureAdminAccount();

  // Apply the ROOT_ADMIN_EMAILS designation to users.is_root_admin.
  await ensureRootAdmins();

  // Deder-parity manage_* permissions + role assignments.
  await ensureRbacPermissions();
}

async function ensureSuperAdminRole(userId) {
  const role = await queryOne(`SELECT id FROM roles WHERE slug = 'super_admin' LIMIT 1`);
  if (!role) return;
  const linked = await queryOne(
    `SELECT id FROM user_roles WHERE user_id = :uid AND role_id = :rid LIMIT 1`,
    { uid: userId, rid: role.id }
  );
  if (!linked) {
    await query(
      `INSERT INTO user_roles (user_id, role_id, created_at, updated_at)
       VALUES (:uid, :rid, NOW(), NOW())`,
      { uid: userId, rid: role.id }
    );
  }
}


/**
 * First-run bootstrap only.
 *
 * The previous implementation re-asserted the ADMIN_EMAIL account on every
 * boot: it forced `deleted_at = NULL, status = 'active'`, re-hashed
 * ADMIN_PASSWORD over whatever the operator had set (ADMIN_SYNC_PASSWORD
 * defaulted to on), and — in one branch — ran an unfiltered UPDATE that
 * reactivated *every* suspended admin plus the first soft-deleted one. That
 * made administrator offboarding un-enforceable: a deploy or an idle-spindown
 * restart silently undid it (MEL-SEC-002).
 *
 * Now: create an admin only when the database has none at all. Every
 * restore/reset path is behind ADMIN_RESET_PASSWORD, which is a deliberate,
 * one-shot break-glass switch and is off unless explicitly set.
 */
async function ensureAdminAccount() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = process.env.ADMIN_NAME || 'System Administrator';
  const breakGlass =
    process.env.ADMIN_RESET_PASSWORD === '1' || process.env.ADMIN_RESET_PASSWORD === 'true';

  if (!email || !password) {
    // validateEnv() already fails the boot in production; locally this is just
    // "nothing to provision".
    if (breakGlass) {
      console.error('[schema] ADMIN_RESET_PASSWORD set but ADMIN_EMAIL/ADMIN_PASSWORD are missing.');
    }
    return;
  }

  try {
    const { hashPassword } = await import('../utils/password.js');

    const anyAdmin = await queryOne(
      `SELECT u.id FROM users u
       INNER JOIN user_roles ur ON ur.user_id = u.id
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE r.slug IN ('super_admin', 'admin')
         AND u.deleted_at IS NULL
       LIMIT 1`
    );

    const existing = await queryOne(
      `SELECT id, status, deleted_at FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1`,
      { email }
    );

    // ── First run: no admin exists anywhere. Create one. ──────────────────
    if (!anyAdmin && !existing) {
      const hash = await hashPassword(password);
      const result = await query(
        `INSERT INTO users (name, email, password, status, password_changed_at, created_at, updated_at)
         VALUES (:name, :email, :password, 'active', NOW(), NOW(), NOW())`,
        { name, email, password: hash }
      );
      await ensureSuperAdminRole(result.insertId);
      console.log(`[schema] first-run: created bootstrap admin ${email}`);
      return;
    }

    // ── Break-glass: operator explicitly asked to recover this account. ───
    if (breakGlass) {
      const hash = await hashPassword(password);
      if (existing) {
        await query(
          `UPDATE users
           SET password = :password, deleted_at = NULL, status = 'active',
               password_changed_at = NOW(), updated_at = NOW()
           WHERE id = :id`,
          { id: existing.id, password: hash }
        );
        await ensureSuperAdminRole(existing.id);
        console.warn(`[schema] ADMIN_RESET_PASSWORD: reset and reactivated ${email}`);
      } else {
        const result = await query(
          `INSERT INTO users (name, email, password, status, password_changed_at, created_at, updated_at)
           VALUES (:name, :email, :password, 'active', NOW(), NOW(), NOW())`,
          { name, email, password: hash }
        );
        await ensureSuperAdminRole(result.insertId);
        console.warn(`[schema] ADMIN_RESET_PASSWORD: created ${email}`);
      }
      console.warn(
        '[schema] Remove ADMIN_RESET_PASSWORD from the environment and redeploy now that recovery is done.'
      );
      return;
    }

    // ── Steady state: touch nothing. ─────────────────────────────────────
    // An operator who deactivated or deleted an admin meant it. If the
    // bootstrap account is locked out, set ADMIN_RESET_PASSWORD=1 once.
    if (existing && (existing.deleted_at || String(existing.status).toLowerCase() !== 'active')) {
      console.warn(
        `[schema] bootstrap admin ${email} is disabled or deleted and was left untouched. ` +
          'Set ADMIN_RESET_PASSWORD=1 for one boot to recover it.'
      );
    }
  } catch (err) {
    console.error(`[schema] ensureAdminAccount failed: ${err.message}`);
  }
}

/**
 * Apply the root-admin designation from ROOT_ADMIN_EMAILS.
 *
 * This is the only supported way to grant `users.is_root_admin` — the column is
 * in sqlSafe's SYSTEM_COLUMNS and appears in no controller's writable column
 * list, so no request body can reach it. Membership is therefore an operator
 * decision made in the environment, not something a user can edit into
 * existence (the MEL-SEC-001 failure).
 *
 * Listed addresses are promoted; addresses that are no longer listed are
 * demoted, so removing someone from the env var actually revokes the tier.
 */
async function ensureRootAdmins() {
  try {
    const listed = String(process.env.ROOT_ADMIN_EMAILS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (listed.length) {
      const placeholders = listed.map((_, i) => `:e${i}`).join(',');
      const params = Object.fromEntries(listed.map((e, i) => [`e${i}`, e]));

      const promoted = await query(
        `UPDATE users SET is_root_admin = 1, updated_at = NOW()
         WHERE LOWER(email) IN (${placeholders})
           AND deleted_at IS NULL
           AND COALESCE(is_root_admin, 0) = 0`,
        params
      );
      const demoted = await query(
        `UPDATE users SET is_root_admin = 0, updated_at = NOW()
         WHERE LOWER(email) NOT IN (${placeholders})
           AND COALESCE(is_root_admin, 0) = 1`,
        params
      );
      if (promoted?.affectedRows) console.log(`[schema] root admin granted to ${promoted.affectedRows} account(s)`);
      if (demoted?.affectedRows) console.warn(`[schema] root admin revoked from ${demoted.affectedRows} account(s)`);

      const missing = [];
      for (const e of listed) {
        const row = await queryOne(
          `SELECT id FROM users WHERE LOWER(email) = :e AND deleted_at IS NULL LIMIT 1`,
          { e }
        );
        if (!row) missing.push(e);
      }
      if (missing.length) {
        console.warn(`[schema] ROOT_ADMIN_EMAILS lists unknown account(s): ${missing.join(', ')}`);
      }
    }

    // Never leave the tier empty — with no root admin, nobody can manage super
    // admins and the panel soft-locks. Promote the longest-standing active
    // super admin and say so loudly.
    const anyRoot = await queryOne(
      `SELECT id FROM users WHERE COALESCE(is_root_admin, 0) = 1 AND deleted_at IS NULL LIMIT 1`
    );
    if (!anyRoot) {
      const fallback = await queryOne(
        `SELECT u.id, u.email FROM users u
         INNER JOIN user_roles ur ON ur.user_id = u.id
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE r.slug = 'super_admin' AND u.deleted_at IS NULL AND u.status = 'active'
         ORDER BY u.id ASC LIMIT 1`
      );
      if (fallback) {
        await query(`UPDATE users SET is_root_admin = 1, updated_at = NOW() WHERE id = :id`, {
          id: fallback.id,
        });
        console.warn(
          `[schema] No root admin was set — promoted ${fallback.email} so the tier is not empty. ` +
            'Set ROOT_ADMIN_EMAILS explicitly to control this.'
        );
      } else {
        console.warn('[schema] No active super admin exists to designate as root admin.');
      }
    }
  } catch (err) {
    console.error(`[schema] ensureRootAdmins failed: ${err.message}`);
  }
}
