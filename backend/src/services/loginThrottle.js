import { query, queryOne } from '../config/db.js';
import { logger } from '../utils/logger.js';

/**
 * Per-account failed-login throttling.
 *
 * Login was protected only by an 8-per-minute limiter keyed on the client IP,
 * so guessing from a pool of addresses was unconstrained — and the bootstrap
 * administrator's password is a low-entropy string (MEL2-SEC-006). This adds
 * the other half: a counter on the account itself, which no amount of address
 * rotation gets around.
 *
 * State lives in `users.failed_login_count` / `users.locked_until`, added by
 * migration 005. If those columns are missing the functions degrade to no-ops
 * rather than locking everyone out of a database that has not been migrated.
 */

const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 10);
const LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES || 15);

let columnsPresent = null;

async function hasThrottleColumns() {
  if (columnsPresent !== null) return columnsPresent;
  try {
    const rows = await query(
      `SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
         AND COLUMN_NAME IN ('failed_login_count', 'locked_until')`
    );
    columnsPresent = rows.length === 2;
    if (!columnsPresent) {
      logger.warn('login_throttle_disabled', {
        reason: 'users.failed_login_count / users.locked_until are missing — run npm run migrate',
      });
    }
  } catch {
    columnsPresent = false;
  }
  return columnsPresent;
}

/**
 * @returns {Promise<{locked: boolean, minutes?: number}>}
 */
export async function checkLock(userId) {
  if (!userId || !(await hasThrottleColumns())) return { locked: false };
  const row = await queryOne(
    `SELECT locked_until, TIMESTAMPDIFF(SECOND, NOW(), locked_until) AS remaining
     FROM users WHERE id = :id LIMIT 1`,
    { id: userId }
  );
  const remaining = Number(row?.remaining || 0);
  if (!row?.locked_until || remaining <= 0) return { locked: false };
  return { locked: true, minutes: Math.max(1, Math.ceil(remaining / 60)) };
}

/** Count a failure and lock the account once the threshold is crossed. */
export async function recordFailure(userId) {
  if (!userId || !(await hasThrottleColumns())) return;
  await query(
    `UPDATE users
     SET failed_login_count = COALESCE(failed_login_count, 0) + 1,
         locked_until = CASE
           WHEN COALESCE(failed_login_count, 0) + 1 >= :max
             THEN DATE_ADD(NOW(), INTERVAL :minutes MINUTE)
           ELSE locked_until
         END
     WHERE id = :id`,
    { id: userId, max: MAX_ATTEMPTS, minutes: LOCK_MINUTES }
  );

  const row = await queryOne(
    `SELECT failed_login_count, locked_until FROM users WHERE id = :id LIMIT 1`,
    { id: userId }
  );
  if (Number(row?.failed_login_count || 0) >= MAX_ATTEMPTS) {
    logger.warn('account_locked', { userId, attempts: row.failed_login_count });
  }
}

/** A successful sign-in clears the counter. */
export async function clearFailures(userId) {
  if (!userId || !(await hasThrottleColumns())) return;
  await query(
    `UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = :id`,
    { id: userId }
  );
}

export { MAX_ATTEMPTS, LOCK_MINUTES };
