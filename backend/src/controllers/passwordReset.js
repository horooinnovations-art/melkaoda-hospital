import crypto from 'crypto';
import { query, queryOne } from '../config/db.js';
import { ok, fail } from '../utils/helpers.js';
import { validator } from '../utils/validate.js';
import { hashPassword } from '../utils/password.js';
import { sendPasswordReset, mailConfigured } from '../services/mail.js';
import { logAudit } from '../services/audit.js';
import { logger } from '../utils/logger.js';
import { clearFailures } from '../services/loginThrottle.js';

/**
 * Self-service password reset.
 *
 * There was no reset path of any kind — no endpoint, no page, and no mail
 * transport to deliver one — so an administrator who forgot their password
 * needed either another administrator or a redeploy with the
 * ADMIN_RESET_PASSWORD break-glass flag (MEL2-SEC-006).
 *
 * Design notes:
 *  - Only the SHA-256 of the token is stored. A leaked database row cannot be
 *    replayed as a reset link.
 *  - The request endpoint answers identically whether or not the address
 *    exists, so it cannot be used to enumerate accounts.
 *  - Completing a reset sets `password_changed_at`, which invalidates every JWT
 *    issued before it, and clears any login lock.
 */

const TOKEN_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30);
/** Same wording on success and on unknown address. */
const NEUTRAL =
  'If that address belongs to an account, a reset link is on its way. Check your inbox.';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function resetUrl(token) {
  const base = String(process.env.FRONTEND_URL || '')
    .split(',')[0]
    .trim()
    .replace(/\/$/, '');
  return `${base}/admin/reset-password?token=${encodeURIComponent(token)}`;
}

export async function requestPasswordReset(req, res) {
  const v = validator(req.body).email('email', { required: true });
  if (!v.ok) return fail(res, v.message, 422);

  const user = await queryOne(
    `SELECT id, name, email, status FROM users
     WHERE LOWER(email) = LOWER(:email) AND deleted_at IS NULL LIMIT 1`,
    { email: v.values.email }
  );

  // Deliberately unconditional: a different response for a known address would
  // turn this into an account-enumeration oracle.
  if (!user || user.status !== 'active') {
    logger.info('password_reset_ignored', { reason: user ? 'inactive' : 'unknown' });
    return ok(res, { message: NEUTRAL });
  }

  if (!mailConfigured()) {
    logger.error('password_reset_unavailable', { reason: 'mail is not configured' });
    return ok(res, { message: NEUTRAL });
  }

  const token = crypto.randomBytes(32).toString('hex');

  // One live token per account: issuing a new one retires the old.
  await query(`DELETE FROM password_resets WHERE user_id = :uid`, { uid: user.id });
  await query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at, created_at)
     VALUES (:uid, :hash, DATE_ADD(NOW(), INTERVAL :ttl MINUTE), NOW())`,
    { uid: user.id, hash: hashToken(token), ttl: TOKEN_TTL_MINUTES }
  );

  const delivery = await sendPasswordReset(user, resetUrl(token), TOKEN_TTL_MINUTES);
  if (!delivery.sent) {
    logger.error('password_reset_send_failed', { userId: user.id, reason: delivery.reason });
  }

  await logAudit(req, 'password_reset_requested', {
    modelType: 'users',
    modelId: user.id,
    userId: null,
  });

  return ok(res, { message: NEUTRAL });
}

export async function completePasswordReset(req, res) {
  const token = String(req.body?.token || '').trim();
  const v = validator(req.body).string('password', {
    required: true,
    min: 12,
    max: 200,
    label: 'New password',
  });
  const confirm = String(req.body?.password_confirmation || '');

  if (!token) return fail(res, 'This reset link is invalid', 400);
  if (!v.ok) return fail(res, v.message, 422);
  if (v.values.password !== confirm) {
    return fail(res, 'Password confirmation does not match', 422);
  }

  const record = await queryOne(
    `SELECT pr.id, pr.user_id, u.email, u.name
     FROM password_resets pr
     INNER JOIN users u ON u.id = pr.user_id
     WHERE pr.token_hash = :hash
       AND pr.expires_at > NOW()
       AND pr.used_at IS NULL
       AND u.deleted_at IS NULL
       AND u.status = 'active'
     LIMIT 1`,
    { hash: hashToken(token) }
  );

  if (!record) {
    return fail(res, 'This reset link has expired or has already been used', 400);
  }

  const hash = await hashPassword(v.values.password);
  await query(
    `UPDATE users
     SET password = :password, password_changed_at = NOW(), updated_at = NOW()
     WHERE id = :id`,
    { id: record.user_id, password: hash }
  );
  // Single use.
  await query(`UPDATE password_resets SET used_at = NOW() WHERE id = :id`, { id: record.id });
  await clearFailures(record.user_id);

  await logAudit(req, 'password_reset_completed', {
    modelType: 'users',
    modelId: record.user_id,
    userId: record.user_id,
  });

  logger.info('password_reset_completed', { userId: record.user_id });

  return ok(res, {
    message: 'Your password has been changed. Sign in with your new password.',
  });
}

export { TOKEN_TTL_MINUTES };
