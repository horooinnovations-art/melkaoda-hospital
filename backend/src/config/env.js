import crypto from 'crypto';

/**
 * Boot-time environment validation. Fail fast in production;
 * warn loudly in development when critical secrets are missing/weak.
 */

/**
 * Addresses that shipped as defaults in this codebase's ancestors. Any of them
 * appearing as ADMIN_EMAIL means the operator never set their own — and the
 * deployed value really was admin@gambohospital.com (MEL-CFG-002).
 */
const DEFAULT_ADMIN_EMAILS = new Set([
  'admin@gambohospital.com',
  'admin@lokehospital.com',
  'admin@dederhospital.com',
  'admin@melkaodahospital.com',
]);
const DEFAULT_ADMIN_EMAIL = 'admin@melkaodahospital.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin@12345';
const WEAK_JWT = new Set([
  'dev-secret',
  'secret',
  'changeme',
  'jwt-secret',
  'change-me-to-a-long-random-secret',
]);
/** Below this a secret is brute-forceable regardless of what it spells. */
const MIN_JWT_SECRET_LENGTH = 32;

/** Minimum length for the bootstrap administrator credential. */
const MIN_ADMIN_PASSWORD_LENGTH = 16;
/** Lowercase fragments that make a password guessable however long it is. */
const ADMIN_PASSWORD_STOPWORDS = [
  'admin',
  'password',
  'melkaoda',
  'hospital',
  'welcome',
  'changeme',
  'letmein',
  'qwerty',
  '123456',
];

export function isProduction() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

/**
 * Why a bootstrap admin password is not acceptable, or '' if it is.
 *
 * The old check was length >= 12 and inequality with one hard-coded default,
 * which a 19-character all-lowercase phrase beginning "admin" passed
 * comfortably — and that is what was actually deployed (MEL2-SEC-006). Length
 * alone is not entropy: this also requires three character classes and refuses
 * the obvious dictionary stems.
 *
 * @returns {string} a sentence completing "ADMIN_PASSWORD ..."
 */
export function adminPasswordWeakness(password) {
  const value = String(password || '');
  if (value.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return `must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters in production.`;
  }

  const classes =
    (/[a-z]/.test(value) ? 1 : 0) +
    (/[A-Z]/.test(value) ? 1 : 0) +
    (/\d/.test(value) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(value) ? 1 : 0);
  if (classes < 3) {
    return (
      'must mix at least three of: lowercase, uppercase, digits, symbols. ' +
      'Generate one with `openssl rand -base64 24`.'
    );
  }

  const lowered = value.toLowerCase();
  const hit = ADMIN_PASSWORD_STOPWORDS.find((word) => lowered.includes(word));
  if (hit) {
    return `must not contain the guessable word "${hit}". Generate one with \`openssl rand -base64 24\`.`;
  }

  if (new Set(value).size < 8) {
    return 'repeats too few distinct characters to be random.';
  }

  return '';
}

/**
 * A secret is weak if it is empty, a known placeholder, shorter than
 * MIN_JWT_SECRET_LENGTH, or has too little variety to be random. The previous
 * version checked only the five-item denylist, so `JWT_SECRET=x` passed
 * production validation (MEL-SEC-011).
 */
export function isWeakJwtSecret(secret = process.env.JWT_SECRET) {
  const value = String(secret || '').trim();
  if (!value) return true;
  if (WEAK_JWT.has(value.toLowerCase())) return true;
  if (value.length < MIN_JWT_SECRET_LENGTH) return true;
  // A long run of one repeated character ("aaaa…") is length without entropy.
  if (new Set(value).size < 8) return true;
  return false;
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
    // In production a weak signing key is a hard failure: it is the only thing
    // standing between a stranger and a forged admin token.
    const detail = `JWT_SECRET is weak — use at least ${MIN_JWT_SECRET_LENGTH} random characters (e.g. \`openssl rand -base64 48\`).`;
    if (prod) errors.push(detail);
    else warnings.push(detail);
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
    } else if (DEFAULT_ADMIN_EMAILS.has(adminEmail)) {
      errors.push(
        `ADMIN_EMAIL is still a shipped default (${adminEmail}). Use a real operator address — ` +
          'the default is public knowledge and names the wrong hospital.'
      );
    }
    if (!adminPassword || adminPassword === DEFAULT_ADMIN_PASSWORD) {
      errors.push(
        'ADMIN_PASSWORD must be set to a strong non-default value in production.'
      );
    } else {
      const weakness = adminPasswordWeakness(adminPassword);
      if (weakness) errors.push(`ADMIN_PASSWORD ${weakness}`);
    }
    if (!String(process.env.ROOT_ADMIN_EMAILS || '').trim()) {
      warnings.push(
        'ROOT_ADMIN_EMAILS is unset — the root-admin tier will fall back to the oldest active ' +
          'super admin. Set it explicitly to control who can manage other super admins.'
      );
    }
  }

  // A production deployment left at NODE_ENV=development silently disables every
  // guard in this function, plus the Cloudinary requirement and the DB TLS
  // expectations. APP_ENV is the tell (MEL-DEPLOY-001).
  const appEnv = String(process.env.APP_ENV || '').trim().toLowerCase();
  if (!prod && (appEnv === 'production' || appEnv === 'prod')) {
    errors.push(
      'APP_ENV=production but NODE_ENV is not "production". Set NODE_ENV=production so the ' +
        'production guards, error masking and Cloudinary requirement actually apply.'
    );
  }

  if (prod && String(process.env.DB_SSL_INSECURE || '') .match(/^(1|true)$/i)) {
    errors.push(
      'DB_SSL_INSECURE is enabled in production: database TLS is unauthenticated and open to ' +
        'interception. Provide the CA in MYSQL_ATTR_SSL_CA and remove this flag.'
    );
  }

  /**
   * Media storage.
   *
   * Production used to require Cloudinary outright, on the grounds that "Render
   * disk is ephemeral". True of Render, false of cPanel — where the account's
   * disk is as durable as the database — so the check blocked the one host on
   * which local files are entirely safe.
   *
   * Production must now state a driver explicitly. What is refused is not local
   * storage; it is *silence* about where a hospital's files are being written.
   */
  const cloudinaryOk = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
  const driver = String(process.env.MEDIA_DRIVER || '').trim().toLowerCase();

  if (driver && !['local', 'cloudinary'].includes(driver)) {
    errors.push(`MEDIA_DRIVER must be "local" or "cloudinary" (got "${driver}").`);
  } else if (prod && !driver) {
    errors.push(
      'MEDIA_DRIVER must be set in production: "local" for a host with a persistent disk ' +
        '(cPanel, VPS), or "cloudinary" for an ephemeral one (Render, Heroku).'
    );
  } else if (driver === 'cloudinary' && !cloudinaryOk) {
    errors.push(
      'MEDIA_DRIVER=cloudinary but CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and ' +
        'CLOUDINARY_API_SECRET are not all set.'
    );
  } else if (driver === 'local' && prod) {
    warnings.push(
      'MEDIA_DRIVER=local — uploads/ and storage/ hold the only copy of every image, ' +
        'document and résumé. Confirm both are inside your backup routine.'
    );
  } else if (!driver && !cloudinaryOk) {
    warnings.push('MEDIA_DRIVER unset and Cloudinary not configured — using local ./uploads.');
  }

  if (!process.env.FRONTEND_URL && prod) {
    // CORS now fails closed when this is unset, so a live frontend on another
    // origin would simply stop working (MEL-SEC-008).
    errors.push(
      'FRONTEND_URL must be set in production — CORS denies every cross-origin request without it.'
    );
  }

  if (!process.env.APP_URL && !process.env.PUBLIC_API_URL && prod) {
    warnings.push('APP_URL / PUBLIC_API_URL unset — media absolute URLs may fall back incorrectly.');
  }

  // Mail is not required to boot, but its absence disables the contact reply,
  // the application receipt and password reset entirely — and that used to be
  // silent, because no mail library was installed at all (MEL2-BIZ-002).
  const mailOk = Boolean(
    process.env.MAIL_HOST && process.env.MAIL_USERNAME && process.env.MAIL_PASSWORD
  );
  if (prod && !mailOk) {
    warnings.push(
      'MAIL_HOST / MAIL_USERNAME / MAIL_PASSWORD are not all set — contact replies, application ' +
        'receipts and password resets will not be delivered.'
    );
  }

  // Boot-time DDL against a shared database should be a deliberate act. In
  // production it is expected to be off and applied through `npm run migrate`
  // instead (MEL2-OPS-001).
  const bootstrapOff =
    process.env.SCHEMA_BOOTSTRAP === '0' || process.env.SCHEMA_BOOTSTRAP === 'false';
  if (prod && !bootstrapOff) {
    warnings.push(
      'SCHEMA_BOOTSTRAP is not disabled — the API will issue DDL and seed data on every boot. ' +
        'Set SCHEMA_BOOTSTRAP=0 and run `npm run migrate` deliberately instead.'
    );
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

export {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_EMAILS,
  DEFAULT_ADMIN_PASSWORD,
  MIN_JWT_SECRET_LENGTH,
  MIN_ADMIN_PASSWORD_LENGTH,
};
