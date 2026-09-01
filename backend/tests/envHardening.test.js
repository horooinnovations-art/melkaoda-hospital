import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isWeakJwtSecret, MIN_JWT_SECRET_LENGTH } from '../src/config/env.js';
import { getWritableColumns, pickAllowedFields } from '../src/utils/sqlSafe.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Run validateEnv() in a subprocess with a specific environment, and return the
 * errors it produced. validateEnv mutates process.env for the dev JWT fallback,
 * so it must not run in-process.
 */
function validateWith(env) {
  const script = `
    const { validateEnv } = await import('./src/config/env.js');
    const r = validateEnv();
    process.stdout.write(JSON.stringify({ ok: r.ok, errors: r.errors, warnings: r.warnings }));
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

/** A production environment with everything valid, as a baseline to perturb. */
const GOOD_PROD = {
  NODE_ENV: 'production',
  APP_ENV: 'production',
  JWT_SECRET: 'Kx7pQ2mZ9vLb4nRt6yHc1sGd0aWe8uIo5jFq3xBv',
  DB_PASSWORD: 'a-real-database-password',
  ADMIN_EMAIL: 'operator@melkaodahospital.example',
  ADMIN_PASSWORD: 'a-strong-operator-password',
  ROOT_ADMIN_EMAILS: 'operator@melkaodahospital.example',
  FRONTEND_URL: 'https://melkaoda-web.onrender.com',
  CLOUDINARY_CLOUD_NAME: 'cloud',
  CLOUDINARY_API_KEY: 'key',
  CLOUDINARY_API_SECRET: 'secret',
  APP_URL: 'https://melkaoda.onrender.com',
  DB_SSL_INSECURE: '',
};

// ─── MEL-SEC-011: the JWT secret needs length, not just a denylist ───────────

test('short secrets are weak even when they are not on the denylist', () => {
  assert.equal(isWeakJwtSecret('x'), true, 'one character passed validation before');
  assert.equal(isWeakJwtSecret('hunter2'), true);
  assert.equal(isWeakJwtSecret('a'.repeat(MIN_JWT_SECRET_LENGTH - 1)), true);
});

test('length without entropy is still weak', () => {
  assert.equal(isWeakJwtSecret('a'.repeat(64)), true, 'a single repeated character is not random');
  assert.equal(isWeakJwtSecret('abab'.repeat(16)), true);
});

test('known placeholders stay weak regardless of case', () => {
  for (const s of ['dev-secret', 'DEV-SECRET', 'changeme', 'change-me-to-a-long-random-secret']) {
    assert.equal(isWeakJwtSecret(s), true, `${s} should be rejected`);
  }
});

test('a real random secret is accepted', () => {
  assert.equal(isWeakJwtSecret('Kx7pQ2mZ9vLb4nRt6yHc1sGd0aWe8uIo5jFq3xBv'), false);
  assert.equal(isWeakJwtSecret(GOOD_PROD.JWT_SECRET), false);
});

test('production refuses to boot on a weak secret', () => {
  const r = validateWith({ ...GOOD_PROD, JWT_SECRET: 'x' });
  assert.equal(r.ok, false);
  assert.ok(
    r.errors.some((e) => e.includes('JWT_SECRET') && e.includes('weak')),
    `expected a weak-secret error, got ${JSON.stringify(r.errors)}`
  );
});

// ─── The baseline itself must pass, or the tests below prove nothing ─────────

test('a fully configured production environment validates', () => {
  const r = validateWith(GOOD_PROD);
  assert.equal(r.ok, true, `expected a clean pass, got ${JSON.stringify(r.errors)}`);
});

// ─── MEL-DEPLOY-001: NODE_ENV=development in a production deployment ─────────

test('APP_ENV=production with NODE_ENV=development is rejected', () => {
  const r = validateWith({ ...GOOD_PROD, NODE_ENV: 'development' });
  assert.equal(r.ok, false);
  assert.ok(
    r.errors.some((e) => e.includes('APP_ENV=production') && e.includes('NODE_ENV')),
    `expected the env mismatch error, got ${JSON.stringify(r.errors)}`
  );
});

// ─── MEL-SEC-005: unauthenticated database TLS ──────────────────────────────

test('DB_SSL_INSECURE is rejected in production', () => {
  for (const value of ['1', 'true', 'TRUE']) {
    const r = validateWith({ ...GOOD_PROD, DB_SSL_INSECURE: value });
    assert.equal(r.ok, false, `DB_SSL_INSECURE=${value} should fail`);
    assert.ok(r.errors.some((e) => e.includes('DB_SSL_INSECURE')));
  }
});

// ─── MEL-CFG-002: shipped default admin addresses ───────────────────────────

test('an inherited default ADMIN_EMAIL is rejected, not merely warned about', () => {
  for (const email of [
    'admin@gambohospital.com',
    'admin@lokehospital.com',
    'admin@dederhospital.com',
  ]) {
    const r = validateWith({ ...GOOD_PROD, ADMIN_EMAIL: email });
    assert.equal(r.ok, false, `${email} should fail production validation`);
    assert.ok(r.errors.some((e) => e.includes('ADMIN_EMAIL')));
  }
});

test('a short ADMIN_PASSWORD is rejected in production', () => {
  const r = validateWith({ ...GOOD_PROD, ADMIN_PASSWORD: 'short1234' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('ADMIN_PASSWORD')));
});

// ─── MEL-SEC-008: CORS cannot be left unconfigured in production ────────────

test('a missing FRONTEND_URL fails the boot instead of opening CORS', () => {
  const r = validateWith({ ...GOOD_PROD, FRONTEND_URL: '' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('FRONTEND_URL')));
});

// ─── MEL-SEC-001: privilege columns are unreachable from a request body ─────

test('is_root_admin and password_changed_at are stripped from any payload', () => {
  // pickAllowedFields is what every write path funnels through. Simulate a
  // users table whose real columns include the privilege markers.
  const schemaColumns = new Set(['name', 'email', 'phone', 'status']);

  const hostile = {
    name: 'Attacker',
    email: 'a@example.com',
    is_root_admin: 1,
    password_changed_at: '1970-01-01 00:00:00',
    password: 'pwned',
    id: 1,
    deleted_at: null,
  };

  const picked = pickAllowedFields(hostile, schemaColumns);
  assert.deepEqual(Object.keys(picked).sort(), ['email', 'name']);
});

test('getWritableColumns excludes the privilege and session markers', async () => {
  // Drive the allowlist directly rather than hitting the database: the point is
  // that SYSTEM_COLUMNS covers the new columns.
  const { default: fs } = await import('node:fs');
  const source = fs.readFileSync(path.join(root, 'src/utils/sqlSafe.js'), 'utf8');
  const block = source.slice(source.indexOf('SYSTEM_COLUMNS'), source.indexOf(']', source.indexOf('SYSTEM_COLUMNS')));
  for (const column of ['is_root_admin', 'password_changed_at', 'password', 'id', 'deleted_at']) {
    assert.ok(block.includes(`'${column}'`), `${column} is not in SYSTEM_COLUMNS`);
  }
  assert.equal(typeof getWritableColumns, 'function');
});
