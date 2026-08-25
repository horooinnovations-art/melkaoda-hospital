import crypto from 'crypto';

/**
 * Boot-time environment validation. Fail fast in production;
 * warn loudly in development when critical secrets are missing/weak.
 */

const DEFAULT_ADMIN_EMAIL = 'admin@gambohospital.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin@12345';
const WEAK_JWT = new Set([
  'dev-secret',
  'secret',
  'changeme',
  'jwt-secret',
  'change-me-to-a-long-random-secret',
]);

export function isProduction() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

export function isWeakJwtSecret(secret = process.env.JWT_SECRET) {
  const value = String(secret || '').trim();
  return !value || WEAK_JWT.has(value);
}

/**
 * Secret used for signing/verifying tokens.
 * Returns any configured JWT_SECRET so login keeps working even with a weak
 * placeholder (we warn / fail at boot separately via validateEnv).
 */
export function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '').trim();
  return secret || null;
}

/**
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateEnv() {
  const errors = [];
  const warnings = [];
  const prod = isProduction();

  const jwtRaw = String(process.env.JWT_SECRET || '').trim();
  if (!jwtRaw) {
    if (prod) {
      errors.push('JWT_SECRET is missing. Set a strong secret before starting.');
    } else {
      process.env.JWT_SECRET = `local-${crypto.randomBytes(32).toString('hex')}`;
      warnings.push(
        'JWT_SECRET was missing; generated an ephemeral secret for this local process only.'
      );
    }
  } else if (isWeakJwtSecret(jwtRaw)) {
    // Do not refuse login for a weak-but-present secret — that surfaces as a
    // confusing "Login failed" 500 after password checks succeed.
    warnings.push(
      'JWT_SECRET uses a weak/default value — replace it with a long random secret.'
    );
  }

  if (!process.env.DB_PASSWORD && prod) {
    errors.push('DB_PASSWORD is required in production.');
  } else if (!process.env.DB_PASSWORD) {
    warnings.push('DB_PASSWORD is empty — OK only for local root-without-password MySQL.');
  }

  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  if (prod) {
    if (!adminEmail) {
      errors.push('ADMIN_EMAIL must be set in production.');
    } else if (adminEmail === DEFAULT_ADMIN_EMAIL) {
      warnings.push(
        'ADMIN_EMAIL uses the legacy default address — prefer a unique operator email.'
      );
    }
    if (!adminPassword || adminPassword === DEFAULT_ADMIN_PASSWORD) {
      errors.push(
        'ADMIN_PASSWORD must be set to a strong non-default value in production.'
      );
    } else if (String(adminPassword).length < 8) {
      errors.push('ADMIN_PASSWORD must be at least 8 characters in production.');
    }
  }

  const cloudinaryOk = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
  if (prod && !cloudinaryOk) {
    errors.push(
      'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required in production (Render disk is ephemeral).'
    );
  } else if (!cloudinaryOk) {
    warnings.push('Cloudinary is not configured — uploads will use local ./uploads (dev only).');
  }

  if (!process.env.FRONTEND_URL && prod) {
    warnings.push('FRONTEND_URL is unset — CORS may block the live frontend.');
  }

  if (!process.env.APP_URL && !process.env.PUBLIC_API_URL && prod) {
    warnings.push('APP_URL / PUBLIC_API_URL unset — media absolute URLs may fall back incorrectly.');
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** Call once at process start. Exits process on hard failures in production. */
export function assertEnvOrExit() {
  const { ok, errors, warnings } = validateEnv();
  for (const w of warnings) console.warn(`[env] ${w}`);
  if (!ok) {
    for (const e of errors) console.error(`[env] ${e}`);
    console.error('[env] Refusing to start with invalid configuration.');
    process.exit(1);
  }
}

export { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD };
