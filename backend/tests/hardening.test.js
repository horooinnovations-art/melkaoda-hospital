import test from 'node:test';
import assert from 'node:assert/strict';
import { adminPasswordWeakness } from '../src/config/env.js';
import { bootstrapWouldTouchRemoteDb } from '../src/config/bootstrapSchema.js';
import { parseStatements } from '../src/scripts/migrate.js';
import { isPrivateFolder, contentMatchesExtension } from '../src/services/media.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

// ── ADMIN_PASSWORD strength (MEL2-SEC-006) ───────────────────────────────────

test('the password that was actually deployed is now rejected', () => {
  // 19 characters, lowercase plus one symbol, beginning "admin" — it passed the
  // old check because that only tested length >= 12 and one exact default.
  assert.notEqual(adminPasswordWeakness('admin@melkaodahosp'), '');
});

test('length alone is not enough', () => {
  assert.match(adminPasswordWeakness('aaaaaaaaaaaaaaaaaaaaaa'), /three of/);
});

test('a guessable stem is rejected however long the password is', () => {
  assert.match(adminPasswordWeakness('Hospital2026!Hospital'), /guessable word/);
  assert.match(adminPasswordWeakness('Melkaoda-2026-Secure!'), /guessable word/);
});

test('short passwords are rejected before anything else', () => {
  assert.match(adminPasswordWeakness('Ab3!'), /at least 16/);
});

test('a generated secret passes', () => {
  assert.equal(adminPasswordWeakness('7Kq!vZ2mR9xTf4Ld6Wn0'), '');
});

// ── Boot-time DDL against a remote database (MEL2-OPS-001) ───────────────────

test('a development process refuses to bootstrap a remote database', () => {
  assert.equal(
    bootstrapWouldTouchRemoteDb({
      nodeEnv: 'development',
      dbHost: 'mysql-2eba4e04-deder-mysql.d.aivencloud.com',
    }),
    true
  );
});

test('a development process against a local database is fine', () => {
  for (const host of ['localhost', '127.0.0.1', '::1', 'host.docker.internal', '']) {
    assert.equal(
      bootstrapWouldTouchRemoteDb({ nodeEnv: 'development', dbHost: host }),
      false,
      `expected ${host || '(empty)'} to be treated as local`
    );
  }
});

test('production may bootstrap its own remote database', () => {
  assert.equal(
    bootstrapWouldTouchRemoteDb({ nodeEnv: 'production', dbHost: 'db.example.com' }),
    false
  );
});

// ── Migration parsing (MEL2-DB-001) ──────────────────────────────────────────

test('a semicolon inside a quoted string does not split the statement', () => {
  // The idempotency guards carry DDL as a string literal; the old parser tore
  // them in half and the migration failed with a syntax error.
  const sql = `SELECT IF(COUNT(*) = 0, 'ALTER TABLE x ADD COLUMN y INT; -- inner', 'DO 0') FROM t;
SELECT 2;`;
  const statements = parseStatements(sql);
  assert.equal(statements.length, 2);
  assert.match(statements[0], /ADD COLUMN y INT; -- inner/);
});

test('backtick-quoted identifiers survive the split', () => {
  const statements = parseStatements('ALTER TABLE `a;b` ADD COLUMN `c` INT;\nSELECT 1;');
  assert.equal(statements.length, 2);
  assert.match(statements[0], /`a;b`/);
});

test('a file that is only comments parses to nothing so the runner can refuse it', () => {
  assert.deepEqual(parseStatements('-- just a note\n-- and another\n'), []);
});

test('every migration in the repository parses to complete statements', () => {
  const dir = new URL('../../database/migrations/', import.meta.url);
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
    const sql = fs.readFileSync(new URL(file, dir), 'utf8');
    const statements = parseStatements(sql);
    assert.ok(statements.length > 0, `${file} parsed to no statements`);
    for (const statement of statements) {
      assert.ok(statement.length > 4, `${file} produced a fragment: ${statement}`);
    }
  }
});

// ── Private media (MEL2-SEC-004) ─────────────────────────────────────────────

test('résumés are stored privately; ordinary media is not', () => {
  assert.equal(isPrivateFolder('resumes'), true);
  assert.equal(isPrivateFolder('gallery'), false);
  assert.equal(isPrivateFolder('doctors'), false);
  assert.equal(isPrivateFolder(undefined), false);
});

// ── Upload content sniffing (MEL2-SEC-009) ───────────────────────────────────

function tempFile(bytes) {
  const file = path.join(os.tmpdir(), `melkaoda-test-${Date.now()}-${Math.random()}`);
  fs.writeFileSync(file, Buffer.from(bytes));
  return file;
}

test('a real PDF signature is accepted', () => {
  const file = tempFile([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
  try {
    assert.equal(contentMatchesExtension(file, 'pdf'), true);
  } finally {
    fs.unlinkSync(file);
  }
});

test('an executable renamed to .pdf is rejected', () => {
  // MZ header — a Windows executable wearing a document extension. The old
  // filter trusted the extension and the browser-declared MIME type only.
  const file = tempFile([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
  try {
    assert.equal(contentMatchesExtension(file, 'pdf'), false);
  } finally {
    fs.unlinkSync(file);
  }
});

test('HTML renamed to .png is rejected', () => {
  const file = tempFile(Buffer.from('<html><script>alert(1)</script>', 'utf8'));
  try {
    assert.equal(contentMatchesExtension(file, 'png'), false);
  } finally {
    fs.unlinkSync(file);
  }
});

test('a real PNG signature is accepted', () => {
  const file = tempFile([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  try {
    assert.equal(contentMatchesExtension(file, 'png'), true);
  } finally {
    fs.unlinkSync(file);
  }
});

test('a docx is recognised by its zip signature', () => {
  const file = tempFile([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
  try {
    assert.equal(contentMatchesExtension(file, 'docx'), true);
  } finally {
    fs.unlinkSync(file);
  }
});

test('text formats have no signature and are left to the extension gate', () => {
  const file = tempFile(Buffer.from('name,email\nAbebe,a@example.com', 'utf8'));
  try {
    assert.equal(contentMatchesExtension(file, 'csv'), true);
    assert.equal(contentMatchesExtension(file, 'txt'), true);
  } finally {
    fs.unlinkSync(file);
  }
});

test('a file too short to carry a signature is rejected', () => {
  const file = tempFile([0x25]);
  try {
    assert.equal(contentMatchesExtension(file, 'pdf'), false);
  } finally {
    fs.unlinkSync(file);
  }
});
