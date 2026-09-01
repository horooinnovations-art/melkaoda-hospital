import test from 'node:test';
import assert from 'node:assert/strict';

import { serverError } from '../src/utils/helpers.js';
import { isOriginAllowed } from '../src/config/cors.js';
import { parseStatements } from '../src/scripts/migrate.js';

/** Minimal res double that records what a handler sent. */
function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

// ─── MEL-SEC-003: raw DB text must never reach the caller ────────────────────

test('serverError returns a fixed message and never the exception text', () => {
  const res = fakeRes();
  const err = new Error("Unknown column 'department_id' in 'where clause'");

  const originalError = console.error;
  let logged = '';
  console.error = (line) => {
    logged += String(line);
  };
  try {
    serverError(res, err);
  } finally {
    console.error = originalError;
  }

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);

  const wire = JSON.stringify(res.body);
  assert.ok(!wire.includes('department_id'), 'column name leaked to the caller');
  assert.ok(!wire.includes('where clause'), 'SQL fragment leaked to the caller');
  assert.ok(!wire.includes('Unknown column'), 'driver text leaked to the caller');

  // The operator still gets the real thing, tied to the caller's reference.
  assert.ok(logged.includes('Unknown column'), 'real error was not logged');
  assert.match(res.body.ref, /^[a-z0-9]{6,10}$/);
  assert.ok(logged.includes(res.body.ref), 'log line is not correlated to the ref');
});

test('serverError survives a non-Error throw', () => {
  const res = fakeRes();
  const originalError = console.error;
  console.error = () => {};
  try {
    serverError(res, 'a bare string with SELECT * FROM users in it');
  } finally {
    console.error = originalError;
  }
  assert.equal(res.statusCode, 500);
  assert.ok(!JSON.stringify(res.body).includes('SELECT'));
});

test('each serverError call gets its own correlation id', () => {
  const originalError = console.error;
  console.error = () => {};
  const refs = new Set();
  try {
    for (let i = 0; i < 25; i++) {
      const res = fakeRes();
      serverError(res, new Error('boom'));
      refs.add(res.body.ref);
    }
  } finally {
    console.error = originalError;
  }
  assert.ok(refs.size > 20, `expected distinct refs, got ${refs.size}/25`);
});

// ─── MEL-SEC-008 / MEL-SEC-009: CORS fails closed ───────────────────────────

test('an unset FRONTEND_URL denies every cross-origin request', () => {
  const opts = { production: true, frontendUrl: '' };
  assert.equal(isOriginAllowed('https://evil.example.com', opts), false);
  assert.equal(isOriginAllowed('https://melkaoda-web.onrender.com', opts), false);
  // No Origin header at all is not a cross-origin request.
  assert.equal(isOriginAllowed(undefined, opts), true);
});

test('only the configured origins are allowed in production', () => {
  const opts = { production: true, frontendUrl: 'https://melkaoda-web.onrender.com' };
  assert.equal(isOriginAllowed('https://melkaoda-web.onrender.com', opts), true);
  assert.equal(isOriginAllowed('https://evil.example.com', opts), false);
  assert.equal(
    isOriginAllowed('https://melkaoda-web.onrender.com.evil.example.com', opts),
    false,
    'suffix attack must not match'
  );
  assert.equal(
    isOriginAllowed('http://melkaoda-web.onrender.com', opts),
    false,
    'scheme must match exactly'
  );
});

test('localhost is a development convenience only', () => {
  const dev = { production: false, frontendUrl: '' };
  const prod = { production: true, frontendUrl: '' };
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3001']) {
    assert.equal(isOriginAllowed(origin, dev), true, `${origin} should work in dev`);
    assert.equal(isOriginAllowed(origin, prod), false, `${origin} must be denied in prod`);
  }
});

test('a comma-separated FRONTEND_URL list is honoured', () => {
  const opts = { production: true, frontendUrl: 'https://a.example.com, https://b.example.com' };
  assert.equal(isOriginAllowed('https://a.example.com', opts), true);
  assert.equal(isOriginAllowed('https://b.example.com', opts), true);
  assert.equal(isOriginAllowed('https://c.example.com', opts), false);
});

// ─── MEL-BUG-002: the migration runner used to discard commented files ──────

test('a migration that opens with a comment still yields its statements', () => {
  const sql = `-- Add an optional department category reference to doctor profiles.

ALTER TABLE doctors
  ADD COLUMN category_id BIGINT UNSIGNED NULL AFTER department_id;
`;
  const statements = parseStatements(sql);
  assert.equal(statements.length, 1, 'commented migration was dropped again');
  assert.match(statements[0], /^ALTER TABLE doctors/);
});

test('multiple statements and interleaved comments are split correctly', () => {
  const sql = `-- header
ALTER TABLE users ADD COLUMN a TINYINT(1) NOT NULL DEFAULT 0;

-- a second change
ALTER TABLE users ADD COLUMN b TIMESTAMP NULL;
`;
  const statements = parseStatements(sql);
  assert.equal(statements.length, 2);
  assert.ok(statements.every((s) => !s.includes('--')), 'comment text leaked into SQL');
});

test('a comment-only migration parses to nothing so the runner can refuse it', () => {
  assert.equal(parseStatements('-- nothing to do here\n').length, 0);
  assert.equal(parseStatements('').length, 0);
});
