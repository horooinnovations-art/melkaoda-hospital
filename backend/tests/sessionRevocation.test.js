import test from 'node:test';
import assert from 'node:assert/strict';

import { isTokenStillValid, formatAuthUser } from '../src/middleware/auth.js';

/**
 * MEL-SEC-007 regression suite.
 *
 * Tokens are stateless and live for 7 days (JWT_EXPIRES_IN). Before this fix a
 * password change did nothing to tokens already in the wild, so a stolen token
 * kept working for the rest of the week — the reset that was supposed to revoke
 * access revoked nothing.
 */

const SECONDS = 1;
const nowSec = () => Math.floor(Date.now() / 1000);

test('a token issued before the password change is rejected', () => {
  const changedAt = new Date();
  const issuedAt = nowSec() - 3600; // an hour before the change
  assert.equal(isTokenStillValid(issuedAt, changedAt), false);
});

test('a token issued after the password change is accepted', () => {
  const changedAt = new Date(Date.now() - 3600 * 1000);
  assert.equal(isTokenStillValid(nowSec(), changedAt), true);
});

test('the token minted by the change itself survives', () => {
  // updatePassword sets password_changed_at and signs a new token in the same
  // request; their timestamps can round in either direction.
  const changedAt = new Date();
  const sameInstant = Math.floor(changedAt.getTime() / 1000);
  assert.equal(isTokenStillValid(sameInstant, changedAt), true);
  assert.equal(
    isTokenStillValid(sameInstant - SECONDS, changedAt),
    true,
    'one second of clock slack must be tolerated'
  );
  assert.equal(
    isTokenStillValid(sameInstant - 5, changedAt),
    false,
    'five seconds earlier is a genuinely older token'
  );
});

test('accounts that have never changed a password are unaffected', () => {
  assert.equal(isTokenStillValid(nowSec() - 86400, null), true);
  assert.equal(isTokenStillValid(nowSec() - 86400, undefined), true);
});

test('an unparseable timestamp fails open rather than locking everyone out', () => {
  // A malformed column value must not sign out the whole admin team.
  assert.equal(isTokenStillValid(nowSec(), 'not-a-date'), true);
});

test('a MySQL DATETIME string is understood, not just a Date', () => {
  const past = new Date(Date.now() - 3600 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const mysql = `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())} ` +
    `${pad(past.getHours())}:${pad(past.getMinutes())}:${pad(past.getSeconds())}`;

  // dateStrings: true is set on the pool, so this is the real shape.
  assert.equal(isTokenStillValid(nowSec(), mysql), true, 'current token should survive an old change');
  assert.equal(
    isTokenStillValid(Math.floor(past.getTime() / 1000) - 60, mysql),
    false,
    'a token older than the change must be rejected'
  );
});

// ─── The auth payload must not leak or accept the privilege flag ─────────────

test('formatAuthUser exposes is_root_admin as a read-only boolean', () => {
  const asRoot = formatAuthUser({ id: 1, name: 'Op', email: 'op@x.test', is_root_admin: 1 });
  assert.equal(asRoot.is_root_admin, true);

  const asPlain = formatAuthUser({ id: 2, name: 'Ed', email: 'ed@x.test', is_root_admin: 0 });
  assert.equal(asPlain.is_root_admin, false);

  // Absent column must not read as privileged.
  const unknown = formatAuthUser({ id: 3, name: 'X', email: 'x@x.test' });
  assert.equal(unknown.is_root_admin, false);
});

test('formatAuthUser never echoes the password hash or remember token', () => {
  const out = formatAuthUser({
    id: 4,
    name: 'Op',
    email: 'op@x.test',
    password: '$2a$12$somethingsecret',
    remember_token: 'abc123',
  });
  const wire = JSON.stringify(out);
  assert.ok(!wire.includes('$2a$'), 'password hash leaked');
  assert.ok(!wire.includes('abc123'), 'remember token leaked');
});
