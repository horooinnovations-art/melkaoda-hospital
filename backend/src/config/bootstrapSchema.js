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

export async function bootstrapSchema() {
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

  // Ensure partnership category storage exists for admin select options.
  await ensurePartnershipCategoriesTable();

  // Downloads centre (public /downloads + Admin → Downloads).
  await ensureDownloadsTable();

  // Opening copy for /patient-guide and /downloads, if never set.
  await seedContentSettings();

  // Fill in slugs for any gallery rows created before this column existed.
  await backfillGallerySlugs();

  // Fix already-polluted address_line1 values in the DB.
  await cleanupDuplicatedAddress();

  // Guarantee at least one sign-in capable admin after accidental soft-deletes.
  await ensureAdminAccount();

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
 * Keep the bootstrap ADMIN_EMAIL account sign-inable with ADMIN_PASSWORD.
 * Previously ADMIN_PASSWORD was only used when creating a brand-new user, so
 * an existing active admin with a different DB hash stayed locked out.
 */
async function ensureAdminAccount() {
  try {
    const email = (process.env.ADMIN_EMAIL || 'admin@lokehospital.com').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
    const name = process.env.ADMIN_NAME || 'System Administrator';
    const forceReset =
      process.env.ADMIN_RESET_PASSWORD === '1' ||
      process.env.ADMIN_RESET_PASSWORD === 'true';
    // Default ON: keep ADMIN_EMAIL password aligned with ADMIN_PASSWORD.
    // Set ADMIN_SYNC_PASSWORD=0 to leave the DB hash alone after first create.
    const syncPassword = process.env.ADMIN_SYNC_PASSWORD !== '0';

    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    const usingDefaultPassword = password === 'Admin@12345';
    const usingDefaultEmail = email === 'admin@lokehospital.com';

    if (isProd && usingDefaultPassword) {
      throw new Error(
        '[schema] Refusing default ADMIN_PASSWORD in production. Set a strong ADMIN_PASSWORD.'
      );
    }

    if (!isProd && (usingDefaultEmail || usingDefaultPassword)) {
      console.warn(
        '[schema] Bootstrap admin uses a default email/password — set unique ADMIN_EMAIL/ADMIN_PASSWORD for shared deploys.'
      );
    }

    const { hashPassword, verifyPassword } = await import('../utils/password.js');

    let user = await queryOne(
      `SELECT id, password, status, deleted_at FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1`,
      { email }
    );

    if (!user) {
      // No bootstrap user — only create when no other active admin exists,
      // unless forceReset was requested.
      const activeAdmins = await query(
        `SELECT u.id FROM users u
         INNER JOIN user_roles ur ON ur.user_id = u.id
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE r.slug IN ('super_admin', 'admin')
           AND u.deleted_at IS NULL
           AND u.status = 'active'
         LIMIT 1`
      );

      if (!forceReset && activeAdmins.length) {
        // Another admin exists under a different email — reactivate path below
        // still covers total lockout; do not create a second bootstrap user.
      } else {
        const hash = await hashPassword(password);
        const result = await query(
          `INSERT INTO users (name, email, password, status, created_at, updated_at)
           VALUES (:name, :email, :password, 'active', NOW(), NOW())`,
          { name, email, password: hash }
        );
        user = { id: result.insertId, password: hash, status: 'active', deleted_at: null };
        console.log(`[schema] created bootstrap admin ${email}`);
      }
    }

    if (user) {
      const passwordOk = await verifyPassword(password, user.password);
      const needsPassword = forceReset || (syncPassword && !passwordOk);
      const needsRestore =
        user.deleted_at != null || String(user.status || '').toLowerCase() !== 'active';

      if (needsPassword || needsRestore) {
        const hash = needsPassword ? await hashPassword(password) : undefined;
        if (needsPassword) {
          await query(
            `UPDATE users
             SET password = :password, deleted_at = NULL, status = 'active', updated_at = NOW()
             WHERE id = :id`,
            { id: user.id, password: hash }
          );
          console.log(
            `[schema] synced login password for ${email}` +
              (forceReset ? ' (ADMIN_RESET_PASSWORD)' : ' (ADMIN_PASSWORD env)')
          );
        } else {
          await query(
            `UPDATE users
             SET deleted_at = NULL, status = 'active', updated_at = NOW()
             WHERE id = :id`,
            { id: user.id }
          );
          console.log(`[schema] reactivated bootstrap admin ${email}`);
        }
      }

      await ensureSuperAdminRole(user.id);
      if (forceReset) {
        console.warn(
          '[schema] ADMIN_RESET_PASSWORD completed — remove ADMIN_RESET_PASSWORD from the environment after login.'
        );
      }
      return;
    }

    // Bootstrap email not present, but maybe other admins are inactive/deleted.
    const reactivated = await query(
      `UPDATE users u
       INNER JOIN user_roles ur ON ur.user_id = u.id
       INNER JOIN roles r ON r.id = ur.role_id
       SET u.status = 'active', u.updated_at = NOW()
       WHERE r.slug IN ('super_admin', 'admin')
         AND u.deleted_at IS NULL
         AND u.status != 'active'`
    );
    if (reactivated?.affectedRows) {
      console.log(`[schema] reactivated ${reactivated.affectedRows} inactive admin account(s)`);
      return;
    }

    const softDeleted = await queryOne(
      `SELECT u.id, u.email FROM users u
       INNER JOIN user_roles ur ON ur.user_id = u.id
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE r.slug IN ('super_admin', 'admin')
         AND u.deleted_at IS NOT NULL
       ORDER BY (r.slug = 'super_admin') DESC, u.id ASC
       LIMIT 1`
    );

    if (softDeleted) {
      await query(
        `UPDATE users SET deleted_at = NULL, status = 'active', updated_at = NOW() WHERE id = :id`,
        { id: softDeleted.id }
      );
      console.log(`[schema] restored soft-deleted admin #${softDeleted.id} (${softDeleted.email})`);
    }
  } catch (err) {
    console.warn(`[schema] ensureAdminAccount skipped: ${err.message}`);
  }
}
