import test from 'node:test';
import assert from 'node:assert/strict';
import { pickAllowedFields, SAFE_IDENT, assertSafeIdent } from '../src/utils/sqlSafe.js';

test('SAFE_IDENT rejects SQL breakout keys', () => {
  assert.equal(SAFE_IDENT.test('name'), true);
  assert.equal(SAFE_IDENT.test('featured_image_id'), true);
  assert.equal(SAFE_IDENT.test("name`; DROP TABLE users;--"), false);
  assert.equal(SAFE_IDENT.test('name) VALUES (1);--'), false);
  assert.equal(SAFE_IDENT.test('1evil'), false);
});

test('pickAllowedFields strips unknown and unsafe keys', () => {
  const allowed = new Set(['name', 'slug', 'is_active']);
  const out = pickAllowedFields(
    {
      name: 'Clinic',
      slug: 'clinic',
      is_active: 1,
      password: 'x',
      id: 9,
      "name`; DROP TABLE users;--": 1,
      evil_col: 'nope',
    },
    allowed
  );
  assert.deepEqual(out, { name: 'Clinic', slug: 'clinic', is_active: 1 });
});

test('pickAllowedFields respects extraAllow intersection', () => {
  const allowed = new Set(['name', 'slug', 'bio']);
  const out = pickAllowedFields({ name: 'A', slug: 'a', bio: 'x' }, allowed, ['name', 'slug']);
  assert.deepEqual(out, { name: 'A', slug: 'a' });
});

test('assertSafeIdent throws on bad table names', () => {
  assert.equal(assertSafeIdent('departments'), 'departments');
  assert.throws(() => assertSafeIdent('departments`;--'), /Invalid/);
});
