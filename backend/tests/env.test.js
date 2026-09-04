import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('production boot validation rejects weak defaults (subprocess)', () => {
  const script = `
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    delete process.env.DB_PASSWORD;
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    delete process.env.MEDIA_DRIVER;
    const { validateEnv } = await import('./src/config/env.js');
    const r = validateEnv();
    if (r.ok) { console.error('expected failure'); process.exit(2); }
    if (!r.errors.some((e) => e.includes('JWT_SECRET'))) process.exit(3);
    if (!r.errors.some((e) => e.includes('ADMIN_'))) process.exit(4);
    // Media storage must be stated explicitly. This used to assert a hard
    // Cloudinary requirement, which was wrong for any host with a persistent
    // disk — the rule now is that production cannot stay silent about where a
    // hospital's files are written, not that it must use one particular
    // provider (MEL2-CPANEL).
    if (!r.errors.some((e) => e.includes('MEDIA_DRIVER'))) process.exit(5);
    process.exit(0);
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'production' },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
