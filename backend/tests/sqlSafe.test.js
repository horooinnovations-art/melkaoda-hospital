import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pickAllowedFields,
  SAFE_IDENT,
  assertSafeIdent,
  normalizeEmptyValues,
} from '../src/utils/sqlSafe.js';

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

/**
 * Clearing a field in an admin form. The form used to leave an emptied field
 * out of the request, and UPDATE only writes what it is given, so a cleared
 * tenure end date silently kept its old value.
 */
const columns = new Map([
  ['tenure_end', { nullable: true, text: false }], // DATE NULL
  ['phone', { nullable: true, text: true }], // VARCHAR NULL
  ['position', { nullable: false, text: true }], // VARCHAR NOT NULL
  ['order', { nullable: false, text: false }], // INT NOT NULL
  ['slug', { nullable: false, text: true }],
]);

test('update: an emptied nullable column is cleared to NULL', () => {
  const out = normalizeEmptyValues({ tenure_end: '', phone: '' }, columns, 'update');
  assert.equal(out.tenure_end, null);
  assert.equal(out.phone, null);
});

test('update: an emptied NOT NULL text column becomes an empty string', () => {
  assert.equal(normalizeEmptyValues({ position: '' }, columns, 'update').position, '');
});

test('update: an emptied NOT NULL non-text column is left out, not broken', () => {
  // '' is not a valid INT or DATE; writing it would fail the whole update.
  const out = normalizeEmptyValues({ order: '' }, columns, 'update');
  assert.equal('order' in out, false);
});

test('update: slug is never blanked, it is the public address', () => {
  const out = normalizeEmptyValues({ slug: '' }, columns, 'update');
  assert.equal('slug' in out, false);
});

test('create: empty fields are left out so database defaults still apply', () => {
  const out = normalizeEmptyValues({ tenure_end: '', position: '', name: 'X' }, columns, 'create');
  assert.deepEqual(out, { name: 'X' });
});

test('values that are not empty pass through untouched', () => {
  const input = { tenure_end: '2024-01-01', phone: '0911', order: 0, position: 'CEO' };
  assert.deepEqual(normalizeEmptyValues(input, columns, 'update'), input);
});

test('whitespace alone counts as empty', () => {
  assert.equal(normalizeEmptyValues({ tenure_end: '   ' }, columns, 'update').tenure_end, null);
});
