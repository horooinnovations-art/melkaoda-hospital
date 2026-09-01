import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isPrivilegedSuperAdmin,
  isProtectedSuperAdmin,
  isRootAdminFlag,
} from '../src/controllers/rbac.js';

/**
 * MEL-SEC-001 regression suite.
 *
 * The root-admin tier — the boundary that decides who may view, create, edit,
 * reactivate or deactivate other super admins — used to be computed from
 * whether the caller's own `name` or `email` contained the substring "admin".
 * Both fields are editable by their owner through PUT /admin/me, so any
 * super_admin could promote itself with a one-field profile edit.
 *
 * These tests assert the property that failure violated: nothing a user can put
 * in their own name or email may change the outcome.
 */

const superRole = [{ id: 1, slug: 'super_admin', name: 'Super Admin' }];
const editorRole = [{ id: 2, slug: 'editor', name: 'Editor' }];

test('the old "admin" substring in name or email grants nothing', () => {
  const namedAdmin = {
    id: 7,
    name: 'Something Admin',
    email: 'attacker@example.com',
    roles: superRole,
    is_root_admin: 0,
  };
  const emailedAdmin = {
    id: 8,
    name: 'Attacker',
    email: 'admin@evil.example.com',
    roles: superRole,
    is_root_admin: 0,
  };

  for (const user of [namedAdmin, emailedAdmin]) {
    assert.equal(isPrivilegedSuperAdmin(user), false);
    assert.equal(isProtectedSuperAdmin(user), false);
  }
});

test('editing one\'s own name or email cannot change the verdict', () => {
  const base = { id: 9, name: 'Plain', email: 'p@example.com', roles: superRole, is_root_admin: 0 };
  const before = isPrivilegedSuperAdmin(base);

  // Every string a PUT /admin/me body could plausibly carry.
  const attempts = [
    'Admin',
    'admin',
    'ADMIN',
    'Chief Administrator',
    'sysadmin',
    'not-an-admin',
    'a​dmin',
  ];
  for (const attempt of attempts) {
    assert.equal(
      isPrivilegedSuperAdmin({ ...base, name: attempt }),
      before,
      `name="${attempt}" changed the verdict`
    );
    assert.equal(
      isPrivilegedSuperAdmin({ ...base, email: `${attempt}@example.com` }),
      before,
      `email="${attempt}@…" changed the verdict`
    );
  }
});

test('the tier requires both the super_admin role and the root flag', () => {
  const rootButNotSuper = { roles: editorRole, is_root_admin: 1 };
  const superButNotRoot = { roles: superRole, is_root_admin: 0 };
  const both = { roles: superRole, is_root_admin: 1 };

  assert.equal(isPrivilegedSuperAdmin(rootButNotSuper), false, 'flag alone is not enough');
  assert.equal(isPrivilegedSuperAdmin(superButNotRoot), false, 'role alone is not enough');
  assert.equal(isPrivilegedSuperAdmin(both), true);
});

test('the root flag is read from the DB column in every shape MySQL returns it', () => {
  assert.equal(isRootAdminFlag({ is_root_admin: 1 }), true);
  assert.equal(isRootAdminFlag({ is_root_admin: '1' }), true, 'string from some drivers');
  assert.equal(isRootAdminFlag({ is_root_admin: true }), true);

  assert.equal(isRootAdminFlag({ is_root_admin: 0 }), false);
  assert.equal(isRootAdminFlag({ is_root_admin: '0' }), false);
  assert.equal(isRootAdminFlag({ is_root_admin: null }), false);
  assert.equal(isRootAdminFlag({}), false, 'absent column defaults closed');
  assert.equal(isRootAdminFlag(undefined), false);

  // Truthy-but-wrong values must not open the tier.
  assert.equal(isRootAdminFlag({ is_root_admin: 'yes' }), false);
  assert.equal(isRootAdminFlag({ is_root_admin: 2 }), false);
});

test('role slugs are accepted as strings or objects, but only exact matches', () => {
  assert.equal(isPrivilegedSuperAdmin({ roles: ['super_admin'], is_root_admin: 1 }), true);
  assert.equal(
    isPrivilegedSuperAdmin({ roles: ['super_admin_readonly'], is_root_admin: 1 }),
    false,
    'a role whose slug merely starts with super_admin must not match'
  );
  assert.equal(isPrivilegedSuperAdmin({ roles: [], is_root_admin: 1 }), false);
});
