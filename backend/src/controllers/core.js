import { query, queryOne } from '../config/db.js';
import {
  authenticate,
  requireRoles,
  requirePermission,
  requireSuperAdmin,
  signToken,
  formatAuthUser,
  getUserPermissions,
} from '../middleware/auth.js';
import { ok, fail, created, message, slugify, toBool, paginate, parseJsonField, serverError } from '../utils/helpers.js';
import {
  normalizeSettings,
  denormalizeSettingKey,
  formatAddress,
} from '../utils/settings.js';
import { upload, saveMedia, attachPhoto, attachPhotos } from '../services/media.js';
import { logAudit, logLogin, logLogout } from '../services/audit.js';
import {
  hashPassword,
  looksLikeBcryptHash,
  normalizePasswordHash,
  verifyPassword,
} from '../utils/password.js';

/**
 * A bcrypt hash of a value nobody can supply. Compared against when the email
 * is unknown or the stored hash is unusable, so every failing login path costs
 * roughly one bcrypt round and response timing stops distinguishing "no such
 * account" from "wrong password" (MEL-SEC-012).
 */
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.iBmwLPmnvbYqBOCbUOOMKUyBBBUC/vu';
const GENERIC_LOGIN_FAILURE = 'Invalid email or password';

export async function login(req, res) {
  try {
    const email = String(req.body?.email || '')
      .trim()
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!email || !password) return fail(res, 'Email and password are required', 422);

    // Soft-deleted rows are excluded. The old query included them and restored
    // the account on a successful password match, so deleting a user only
    // revoked access until they next signed in (MEL-SEC-004).
    const user = await queryOne(
      `SELECT * FROM users WHERE LOWER(email) = LOWER(:email) AND deleted_at IS NULL LIMIT 1`,
      { email }
    );

    const storedHash = user ? normalizePasswordHash(user.password) : null;
    const usableHash = Boolean(storedHash) && looksLikeBcryptHash(storedHash);

    // Always spend the bcrypt round, then decide.
    const passwordMatches = await verifyPassword(password, usableHash ? storedHash : DUMMY_HASH);

    if (!user || !usableHash || !passwordMatches) {
      await logLogin(req, user || null, false);
      if (user && !usableHash) {
        // Operator-facing only. The caller gets the same generic message as
        // every other failure, so an unusable hash no longer marks the account
        // as real, and the recovery procedure is not handed to strangers
        // (MEL-SEC-013).
        console.warn(
          `[auth] user #${user.id} has an unusable password hash ` +
            `(len=${String(user.password || '').length}). Reset it from the admin panel.`
        );
      }
      return fail(res, GENERIC_LOGIN_FAILURE, 401);
    }

    // Re-hash legacy Laravel $2y$ (or other normalized) hashes onto bcryptjs $2a$
    if (String(user.password || '').startsWith('$2y$') || String(user.password || '').startsWith('$2Y$')) {
      try {
        const nextHash = await hashPassword(password);
        await query(`UPDATE users SET password = :password, updated_at = NOW() WHERE id = :id`, {
          id: user.id,
          password: nextHash,
        });
        user.password = nextHash;
      } catch (rehashErr) {
        console.warn(`[auth] password rehash skipped for #${user.id}: ${rehashErr.message}`);
      }
    }

    if (user.status !== 'active') {
      await logLogin(req, user, false);
      return fail(res, 'Account is not active', 403);
    }

    const roles = await query(
      `SELECT r.name, r.slug FROM roles r INNER JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = :id`,
      { id: user.id }
    );
    const roleSlugs = roles.map((r) => r.slug);
    const permissions = await getUserPermissions(user.id);

    await query(`UPDATE users SET last_login_at = NOW(), last_login_ip = :ip WHERE id = :id`, {
      id: user.id,
      ip: req.ip,
    });

    await logLogin(req, user, true);

    const token = signToken(user);
    return ok(res, {
      token,
      user: formatAuthUser(user, roleSlugs, permissions, {
        roleNames: roles.map((r) => r.name),
      }),
    });
  } catch (err) {
    console.error('[auth] login failed:', err);
    const detail = err instanceof Error ? err.message : String(err);
    // Keep generic message for unknown errors; surface config mistakes clearly.
    if (/JWT_SECRET/i.test(detail)) {
      return fail(
        res,
        'Server auth is misconfigured (JWT_SECRET). Set a strong JWT_SECRET on the API and redeploy.',
        500
      );
    }
    return fail(res, 'Login failed', 500);
  }
}

export async function logout(req, res) {
  await logLogout(req);
  return ok(res, { message: 'Logged out' });
}

export async function me(req, res) {
  return ok(
    res,
    formatAuthUser(req.user, req.user.roles || [], req.user.permissions || [], {
      roleNames: req.user.roleNames || req.user.role_names || [],
    })
  );
}

/** Deder ProfileController@update — name, email, phone, avatar */
export async function updateMe(req, res) {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = req.body?.phone != null ? String(req.body.phone).trim() : null;

    if (!name) return fail(res, 'Name is required', 422);
    if (!email) return fail(res, 'Email is required', 422);

    const emailTaken = await queryOne(
      `SELECT id FROM users WHERE LOWER(email) = LOWER(:email) AND id != :id AND deleted_at IS NULL LIMIT 1`,
      { email, id: req.user.id }
    );
    if (emailTaken) return fail(res, 'A user with this email already exists', 422);

    const sets = ['name = :name', 'email = :email', 'phone = :phone'];
    const params = {
      id: req.user.id,
      name,
      email,
      phone: phone || null,
    };

    if (req.file) {
      const media = await saveMedia(req.file, req.user.id, 'avatars');
      sets.push('avatar = :avatar');
      params.avatar = media.url;
    }

    await query(
      `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = :id`,
      params
    );

    const user = await queryOne(
      `SELECT id, name, email, phone, avatar, status, created_at, last_login_at
       FROM users WHERE id = :id`,
      { id: req.user.id }
    );
    await logAudit(req, 'update', {
      modelType: 'users',
      modelId: user.id,
      oldValues: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
      },
      newValues: { id: user.id, name: user.name, email: user.email, phone: user.phone },
    });
    return ok(
      res,
      formatAuthUser(user, req.user.roles || [], req.user.permissions || [], {
        roleNames: req.user.roleNames || req.user.role_names || [],
      })
    );
  } catch (err) {
    return serverError(res, err);
  }
}

/** Deder ProfileController@updatePassword — requires current password */
export async function updatePassword(req, res) {
  try {
    const currentPassword = String(req.body?.current_password || '');
    const password = String(req.body?.password || '');
    const confirm = String(req.body?.password_confirmation || req.body?.passwordConfirm || '');

    if (!currentPassword) return fail(res, 'Current password is required', 422);
    if (!password) return fail(res, 'New password is required', 422);
    if (password.length < 8) return fail(res, 'Password must be at least 8 characters', 422);
    if (password !== confirm) return fail(res, 'Password confirmation does not match', 422);

    const row = await queryOne(`SELECT id, password FROM users WHERE id = :id LIMIT 1`, {
      id: req.user.id,
    });
    if (!row) return fail(res, 'User not found', 404);

    const valid = await verifyPassword(currentPassword, row.password);
    if (!valid) return fail(res, 'The current password is incorrect', 422);

    const hash = await hashPassword(password);
    // password_changed_at invalidates every JWT issued before now, so the reset
    // actually ends other sessions instead of leaving 7-day tokens alive
    // (MEL-SEC-007). authenticate() enforces it on each request.
    await query(
      `UPDATE users SET password = :password, password_changed_at = NOW(), updated_at = NOW()
       WHERE id = :id`,
      {
        id: req.user.id,
        password: hash,
      }
    );

    // Mint a replacement token so the caller is not signed out by their own
    // password change.
    const freshToken = signToken({ id: req.user.id, email: req.user.email });

    await logAudit(req, 'update', {
      modelType: 'users',
      modelId: req.user.id,
      oldValues: { password: '[redacted]' },
      newValues: { password: '[changed]' },
    });

    return ok(res, {
      message: 'Password updated successfully',
      // Other sessions are now invalid; this is the caller's replacement token.
      token: freshToken,
    });
  } catch (err) {
    return serverError(res, err);
  }
}

export async function dashboard(req, res) {
  try {
    const [[counts]] = await Promise.all([
      query(`SELECT
        (SELECT COUNT(*) FROM departments WHERE deleted_at IS NULL) AS departments,
        (SELECT COUNT(*) FROM doctors WHERE deleted_at IS NULL) AS doctors,
        (SELECT COUNT(*) FROM services WHERE deleted_at IS NULL) AS services,
        (SELECT COUNT(*) FROM news WHERE deleted_at IS NULL) AS news,
        (SELECT COUNT(*) FROM announcements WHERE deleted_at IS NULL) AS announcements,
        (SELECT COUNT(*) FROM leadership WHERE deleted_at IS NULL) AS leadership,
        (SELECT COUNT(*) FROM leadership_history WHERE deleted_at IS NULL) AS leadership_history,
        (SELECT COUNT(*) FROM contact_submissions WHERE status = 'new') AS new_contacts,
        (SELECT COUNT(*) FROM gallery) AS gallery,
        (SELECT COUNT(*) FROM careers WHERE deleted_at IS NULL AND status = 'open') AS open_jobs
      `).then((r) => [r[0]]),
    ]);

    const recentContacts = await query(
      `SELECT id, name, email, subject, status, created_at FROM contact_submissions ORDER BY created_at DESC LIMIT 5`
    );
    const recentNews = await query(
      `SELECT id, title, status, published_at, created_at FROM news WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5`
    );

    return ok(res, { counts, recentContacts, recentNews });
  } catch (err) {
    // leadership_history may not exist yet
    console.error(err);
    return ok(res, {
      counts: {},
      recentContacts: [],
      recentNews: [],
      warning: err.message,
    });
  }
}

// ---- Settings ----
export async function getSettings(_req, res) {
  const rows = await query(`SELECT \`key\`, value, type FROM settings`);
  const settings = {};
  for (const row of rows) {
    settings[row.key] = parseJsonField(row.value, row.value);
  }
  return ok(res, normalizeSettings(settings));
}

export async function updateSettings(req, res) {
  try {
    const payload = req.body || {};
    for (const [rawKey, value] of Object.entries(payload)) {
      if (rawKey === 'logo' || rawKey === 'favicon') continue;
      // Skip empty file-field leftovers and non-setting noise
      if (rawKey === 'logo_url' || rawKey === 'favicon_url' || rawKey === 'logo_id' || rawKey === 'favicon_id') {
        continue;
      }
      const key = denormalizeSettingKey(rawKey);
      let stored = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
      if (
        key === 'address_line1' ||
        key === 'address_line2' ||
        key === 'address' ||
        rawKey === 'address'
      ) {
        stored = formatAddress(stored) || '';
      }
      const existing = await queryOne(`SELECT id FROM settings WHERE \`key\` = :key`, { key });
      if (existing) {
        await query(`UPDATE settings SET value = :value, updated_at = NOW() WHERE \`key\` = :key`, {
          key,
          value: stored,
        });
      } else {
        await query(
          `INSERT INTO settings (\`key\`, value, type, created_at, updated_at) VALUES (:key, :value, 'string', NOW(), NOW())`,
          { key, value: stored }
        );
      }
    }

    // Keep public `hours` in sync when per-day fields are saved.
    const dayKeys = [
      'hours_monday',
      'hours_tuesday',
      'hours_wednesday',
      'hours_thursday',
      'hours_friday',
      'hours_saturday',
      'hours_sunday',
    ];
    if (dayKeys.some((k) => payload[k] !== undefined)) {
      const labels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const lines = dayKeys
        .map((k, i) => {
          const v = String(payload[k] ?? '').trim();
          return v ? `${labels[i]}: ${v}` : null;
        })
        .filter(Boolean);
      const hoursValue = lines.join('\n');
      const existingHours = await queryOne(`SELECT id FROM settings WHERE \`key\` = 'hours'`);
      if (existingHours) {
        await query(`UPDATE settings SET value = :value, updated_at = NOW() WHERE \`key\` = 'hours'`, {
          value: hoursValue,
        });
      } else {
        await query(
          `INSERT INTO settings (\`key\`, value, type, created_at, updated_at) VALUES ('hours', :value, 'string', NOW(), NOW())`,
          { value: hoursValue }
        );
      }
    }

    // Mirror About aliases so both admin editors and public pages stay in sync.
    const mirrors = [
      ['mission', 'about_mission'],
      ['vision', 'about_vision'],
      ['history', 'about_history'],
      ['core_values', 'values'],
      ['awards_accreditations', 'awards'],
      ['organization_description', 'about'],
    ];
    for (const [primary, alias] of mirrors) {
      if (payload[primary] === undefined && payload[alias] === undefined) continue;
      const value = String(payload[primary] ?? payload[alias] ?? '');
      for (const key of [primary, alias]) {
        const existing = await queryOne(`SELECT id FROM settings WHERE \`key\` = :key`, { key });
        if (existing) {
          await query(`UPDATE settings SET value = :value, updated_at = NOW() WHERE \`key\` = :key`, {
            key,
            value,
          });
        } else {
          await query(
            `INSERT INTO settings (\`key\`, value, type, created_at, updated_at) VALUES (:key, :value, 'string', NOW(), NOW())`,
            { key, value }
          );
        }
      }
    }

    if (req.files?.logo?.[0]) {
      const media = await saveMedia(req.files.logo[0], req.user.id, 'logos');
      await query(
        `INSERT INTO settings (\`key\`, value, type, created_at, updated_at) VALUES ('logo_url', :url, 'string', NOW(), NOW())
         ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
        { url: media.url }
      );
      await query(
        `INSERT INTO settings (\`key\`, value, type, created_at, updated_at) VALUES ('logo_id', :id, 'string', NOW(), NOW())
         ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
        { id: String(media.id) }
      );
    }

    if (req.files?.favicon?.[0]) {
      const media = await saveMedia(req.files.favicon[0], req.user.id, 'logos');
      await query(
        `INSERT INTO settings (\`key\`, value, type, created_at, updated_at) VALUES ('favicon_url', :url, 'string', NOW(), NOW())
         ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
        { url: media.url }
      );
      await query(
        `INSERT INTO settings (\`key\`, value, type, created_at, updated_at) VALUES ('favicon_id', :id, 'string', NOW(), NOW())
         ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
        { id: String(media.id) }
      );
    }

    const rows = await query(`SELECT \`key\`, value, type FROM settings`);
    const settings = {};
    for (const row of rows) {
      settings[row.key] = parseJsonField(row.value, row.value);
    }
    await logAudit(req, 'update', {
      modelType: 'settings',
      modelId: null,
      newValues: { keys: Object.keys(payload).filter((k) => k !== 'logo' && k !== 'favicon') },
    });
    return ok(res, normalizeSettings(settings));
  } catch (err) {
    return serverError(res, err);
  }
}

// ---- Contact ----
export async function submitContact(req, res) {
  const { name, email, phone, subject, message: msg, department } = req.body;
  if (!name || !email || !subject || !msg) return fail(res, 'Required fields missing', 422);

  const result = await query(
    `INSERT INTO contact_submissions (name, email, phone, subject, message, department, status, ip_address, created_at, updated_at)
     VALUES (:name, :email, :phone, :subject, :message, :department, 'new', :ip, NOW(), NOW())`,
    {
      name,
      email,
      phone: phone || null,
      subject,
      message: msg,
      department: department || null,
      ip: req.ip,
    }
  );
  return created(res, { id: result.insertId });
}

export async function listContacts(req, res) {
  const { page, perPage, offset } = paginate(req.query);
  const rows = await query(
    `SELECT * FROM contact_submissions ORDER BY created_at DESC LIMIT ${perPage} OFFSET ${offset}`
  );
  const totalRow = await queryOne(`SELECT COUNT(*) AS total FROM contact_submissions`);
  return ok(res, { data: rows, meta: { total: totalRow.total, page, perPage } });
}

export async function replyContact(req, res) {
  const { reply_message } = req.body;
  await query(
    `UPDATE contact_submissions SET status = 'replied', reply_message = :reply_message, replied_at = NOW(), replied_by = :uid, updated_at = NOW() WHERE id = :id`,
    { id: req.params.id, reply_message, uid: req.user.id }
  );
  return message(res, 'Reply saved');
}

export {
  authenticate,
  requireRoles,
  requirePermission,
  requireSuperAdmin,
  upload,
  saveMedia,
  attachPhoto,
  attachPhotos,
  ok,
  fail,
  created,
  message,
  slugify,
  toBool,
  paginate,
  parseJsonField,
  query,
  queryOne,
};
