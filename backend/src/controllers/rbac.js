import { hashPassword } from '../utils/password.js';
import { query, queryOne } from '../config/db.js';
import { ok, fail, message, paginate, slugify } from '../utils/helpers.js';
import { normalizeMediaUrl } from '../utils/mediaUrl.js';
import { logAudit } from '../services/audit.js';

const PERMISSION_MODULES = [
  'users',
  'roles',
  'permissions',
  'pages',
  'departments',
  'doctors',
  'services',
  'announcements',
  'news',
  'gallery',
  'events',
  'careers',
  'testimonials',
  'faqs',
  'settings',
  'audit_logs',
  'media',
  'leadership',
  'insurance',
  'emergency',
  'health_education',
  'contact',
  'appointments',
];

function parseIdList(raw) {
  if (raw == null || raw === '') return [];
  if (Array.isArray(raw)) return raw.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(Number).filter((n) => Number.isFinite(n) && n > 0);
      }
    } catch {
      /* comma-separated */
    }
    return String(raw)
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? [n] : [];
}

function isSuper(req) {
  return (req.user?.roles || []).includes('super_admin');
}

/** Email or name contains "admin" (case-insensitive). */
function hasAdminTerm(user) {
  const email = String(user?.email || '').toLowerCase();
  const name = String(user?.name || '').toLowerCase();
  return email.includes('admin') || name.includes('admin');
}

/**
 * Privileged super admin: super_admin role AND "admin" in email/name.
 * Only these users can see/create/manage other super admins.
 */
function isPrivilegedSuperAdmin(user) {
  const roles = user?.roles || [];
  const isSuperRole = roles.some((r) =>
    typeof r === 'string' ? r === 'super_admin' : r?.slug === 'super_admin'
  );
  return isSuperRole && hasAdminTerm(user);
}

function userHasSuperRole(user) {
  return (user?.roles || []).some((r) =>
    typeof r === 'string' ? r === 'super_admin' : r?.slug === 'super_admin'
  );
}

function isProtectedSuperAdmin(user) {
  return userHasSuperRole(user) && hasAdminTerm(user);
}

/** SQL fragment: hide privileged (admin-term) super admins from non-privileged viewers. */
const HIDE_PRIVILEGED_SUPERS_SQL = `NOT (
  EXISTS (
    SELECT 1 FROM user_roles ur_hide
    INNER JOIN roles r_hide ON r_hide.id = ur_hide.role_id
    WHERE ur_hide.user_id = u.id AND r_hide.slug = 'super_admin'
  )
  AND (LOWER(u.email) LIKE '%admin%' OR LOWER(IFNULL(u.name, '')) LIKE '%admin%')
)`;

async function loadUserWithRoles(id) {
  const user = await queryOne(
    `SELECT id, name, email, phone, status, avatar, created_at, last_login_at
     FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1`,
    { id }
  );
  if (!user) return null;
  await attachUserRoles([user]);
  return user;
}

async function attachUserRoles(users) {
  if (!users.length) return users;
  const ids = users.map((u) => u.id);
  const placeholders = ids.map((_, i) => `:uid${i}`).join(',');
  const params = Object.fromEntries(ids.map((id, i) => [`uid${i}`, id]));
  const rows = await query(
    `SELECT ur.user_id, r.id, r.name, r.slug, r.is_system
     FROM user_roles ur
     INNER JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id IN (${placeholders})
     ORDER BY r.name ASC`,
    params
  );
  const byUser = new Map();
  for (const row of rows) {
    if (!byUser.has(row.user_id)) byUser.set(row.user_id, []);
    byUser.get(row.user_id).push({
      id: row.id,
      name: row.name,
      slug: row.slug,
      is_system: !!row.is_system,
    });
  }
  for (const user of users) {
    user.roles = byUser.get(user.id) || [];
    if (user.avatar) user.avatar = normalizeMediaUrl(user.avatar);
    delete user.password;
    delete user.remember_token;
  }
  return users;
}

async function attachRoleMeta(roles) {
  if (!roles.length) return roles;
  const ids = roles.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');

  const [userCounts, permCounts, perms] = await Promise.all([
    query(
      `SELECT role_id, COUNT(*) AS total FROM user_roles WHERE role_id IN (${placeholders}) GROUP BY role_id`,
      ids
    ),
    query(
      `SELECT role_id, COUNT(*) AS total FROM role_permissions WHERE role_id IN (${placeholders}) GROUP BY role_id`,
      ids
    ),
    query(
      `SELECT rp.role_id, p.id, p.name, p.slug, p.module, p.description
       FROM role_permissions rp
       INNER JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id IN (${placeholders})
       ORDER BY p.module ASC, p.name ASC`,
      ids
    ),
  ]);

  const usersByRole = Object.fromEntries(userCounts.map((r) => [r.role_id, Number(r.total)]));
  const permsByRoleCount = Object.fromEntries(permCounts.map((r) => [r.role_id, Number(r.total)]));
  const permsByRole = new Map();
  for (const row of perms) {
    if (!permsByRole.has(row.role_id)) permsByRole.set(row.role_id, []);
    permsByRole.get(row.role_id).push({
      id: row.id,
      name: row.name,
      slug: row.slug,
      module: row.module,
      description: row.description,
    });
  }

  for (const role of roles) {
    role.is_system = !!role.is_system;
    role.users_count = usersByRole[role.id] || 0;
    role.permissions_count = permsByRoleCount[role.id] || 0;
    role.permissions = permsByRole.get(role.id) || [];
    role.permission_ids = role.permissions.map((p) => p.id);
  }
  return roles;
}

async function getSuperAdminRoleId() {
  const row = await queryOne(`SELECT id FROM roles WHERE slug = 'super_admin' LIMIT 1`);
  return row?.id ? Number(row.id) : null;
}

async function countActiveSuperAdmins() {
  const row = await queryOne(
    `SELECT COUNT(DISTINCT u.id) AS total
     FROM users u
     INNER JOIN user_roles ur ON ur.user_id = u.id
     INNER JOIN roles r ON r.id = ur.role_id
     WHERE r.slug = 'super_admin' AND u.deleted_at IS NULL AND u.status = 'active'`
  );
  return Number(row?.total || 0);
}

async function syncUserRoles(userId, roleIds) {
  await query(`DELETE FROM user_roles WHERE user_id = :uid`, { uid: userId });
  for (const rid of roleIds) {
    await query(
      `INSERT INTO user_roles (user_id, role_id, created_at, updated_at)
       VALUES (:uid, :rid, NOW(), NOW())`,
      { uid: userId, rid }
    );
  }
}

async function syncRolePermissions(roleId, permissionIds) {
  await query(`DELETE FROM role_permissions WHERE role_id = :rid`, { rid: roleId });
  for (const pid of permissionIds) {
    await query(
      `INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
       VALUES (:rid, :pid, NOW(), NOW())`,
      { rid: roleId, pid }
    );
  }
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function listUsers(req, res) {
  try {
    const { page, perPage, offset } = paginate(req.query);
    const where = ['u.deleted_at IS NULL'];
    const params = {};
    const privileged = isPrivilegedSuperAdmin(req.user);

    if (!privileged) {
      where.push(HIDE_PRIVILEGED_SUPERS_SQL);
    }

    const search = String(req.query.search || req.query.q || '').trim();
    if (search) {
      where.push('(u.name LIKE :search OR u.email LIKE :search OR u.phone LIKE :search)');
      params.search = `%${search}%`;
    }
    if (req.query.status) {
      where.push('u.status = :status');
      params.status = req.query.status;
    }
    if (req.query.role) {
      where.push(
        `EXISTS (
          SELECT 1 FROM user_roles ur2
          INNER JOIN roles r2 ON r2.id = ur2.role_id
          WHERE ur2.user_id = u.id AND (r2.id = :role OR r2.slug = :role)
        )`
      );
      params.role = req.query.role;
    }

    const whereSql = where.join(' AND ');
    const rows = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.status, u.avatar, u.created_at, u.last_login_at
       FROM users u
       WHERE ${whereSql}
       ORDER BY u.name ASC
       LIMIT ${perPage} OFFSET ${offset}`,
      params
    );
    const totalRow = await queryOne(
      `SELECT COUNT(*) AS total FROM users u WHERE ${whereSql}`,
      params
    );
    await attachUserRoles(rows);

    const statsVisibility = privileged
      ? ''
      : ` AND NOT (
          EXISTS (
            SELECT 1 FROM user_roles ur_hide
            INNER JOIN roles r_hide ON r_hide.id = ur_hide.role_id
            WHERE ur_hide.user_id = users.id AND r_hide.slug = 'super_admin'
          )
          AND (LOWER(users.email) LIKE '%admin%' OR LOWER(IFNULL(users.name, '')) LIKE '%admin%')
        )`;

    const [totalAll, active, inactive, suspended] = await Promise.all([
      queryOne(`SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL${statsVisibility}`),
      queryOne(
        `SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL AND status = 'active'${statsVisibility}`
      ),
      queryOne(
        `SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL AND status = 'inactive'${statsVisibility}`
      ),
      queryOne(
        `SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL AND status = 'suspended'${statsVisibility}`
      ),
    ]);

    let roles = await query(`SELECT id, name, slug, is_system FROM roles ORDER BY name ASC`);
    // Non-privileged cannot assign Super Admin — omit from role picker options.
    if (!privileged) {
      roles = roles.filter((r) => r.slug !== 'super_admin');
    }

    return ok(res, {
      data: rows,
      meta: { total: Number(totalRow?.total || 0), page, perPage },
      stats: {
        total: Number(totalAll?.total || 0),
        active: Number(active?.total || 0),
        inactive: Number(inactive?.total || 0),
        suspended: Number(suspended?.total || 0),
      },
      roles: roles.map((r) => ({ ...r, is_system: !!r.is_system })),
      can_manage_super_admins: privileged,
    });
  } catch (err) {
    console.error(err);
    return fail(res, err.message, 500);
  }
}

export async function showUser(req, res) {
  try {
    const user = await loadUserWithRoles(req.params.id);
    if (!user) return fail(res, 'User not found', 404);

    if (isProtectedSuperAdmin(user) && !isPrivilegedSuperAdmin(req.user)) {
      return fail(res, 'User not found', 404);
    }

    return ok(res, user);
  } catch (err) {
    console.error(err);
    return fail(res, err.message, 500);
  }
}

export async function createUser(req, res) {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const password = req.body?.password;
    const phone = req.body?.phone != null ? String(req.body.phone).trim() : null;
    const status = req.body?.status || 'active';
    const roleIds = parseIdList(req.body?.role_ids ?? req.body?.roles);

    if (!name || !email || !password) return fail(res, 'Name, email, and password are required', 422);
    if (password.length < 8) return fail(res, 'Password must be at least 8 characters', 422);
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return fail(res, 'Invalid status', 422);
    }
    if (!roleIds.length) return fail(res, 'At least one role is required', 422);

    const superRoleId = await getSuperAdminRoleId();
    if (superRoleId && roleIds.includes(superRoleId) && !isPrivilegedSuperAdmin(req.user)) {
      return fail(
        res,
        'Only privileged Super Administrators (username containing "admin") can create Super Admin accounts',
        403
      );
    }

    const existing = await queryOne(
      `SELECT id, deleted_at FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1`,
      { email }
    );
    if (existing && !existing.deleted_at) {
      return fail(res, 'A user with this email already exists', 422);
    }

    const hash = await hashPassword(password);
    let userId;

    if (existing?.deleted_at) {
      await query(
        `UPDATE users SET name = :name, email = :email, password = :password, phone = :phone,
         status = :status, deleted_at = NULL, updated_at = NOW() WHERE id = :id`,
        { id: existing.id, name, email, password: hash, phone: phone || null, status }
      );
      userId = existing.id;
    } else {
      const result = await query(
        `INSERT INTO users (name, email, password, phone, status, created_at, updated_at)
         VALUES (:name, :email, :password, :phone, :status, NOW(), NOW())`,
        { name, email, password: hash, phone: phone || null, status }
      );
      userId = result.insertId;
    }

    await syncUserRoles(userId, roleIds);
    const user = await queryOne(
      `SELECT id, name, email, phone, status, avatar, created_at FROM users WHERE id = :id`,
      { id: userId }
    );
    await attachUserRoles([user]);
    await logAudit(req, 'create', {
      modelType: 'users',
      modelId: user.id,
      newValues: { id: user.id, name: user.name, email: user.email, status: user.status },
    });
    return ok(res, user, 201);
  } catch (err) {
    console.error(err);
    return fail(res, err.message || 'Create failed', 500);
  }
}

export async function updateUser(req, res) {
  try {
    const id = Number(req.params.id);
    const existing = await loadUserWithRoles(id);
    if (!existing) return fail(res, 'User not found', 404);

    const privileged = isPrivilegedSuperAdmin(req.user);
    const editingSelf = Number(req.user.id) === Number(id);

    if (isProtectedSuperAdmin(existing) && !privileged && !editingSelf) {
      return fail(res, 'User not found', 404);
    }

    if (userHasSuperRole(existing) && !editingSelf && !privileged) {
      return fail(
        res,
        'Only privileged Super Administrators (username containing "admin") can manage other Super Admin accounts',
        403
      );
    }

    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const phone = req.body?.phone != null ? String(req.body.phone).trim() : null;
    const status = req.body?.status || existing.status;
    const password = req.body?.password;
    const roleIds = parseIdList(req.body?.role_ids ?? req.body?.roles);

    if (!name || !email) return fail(res, 'Name and email are required', 422);
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return fail(res, 'Invalid status', 422);
    }
    if (!roleIds.length) return fail(res, 'At least one role is required', 422);
    if (password && String(password).length < 8) {
      return fail(res, 'Password must be at least 8 characters', 422);
    }

    const emailTaken = await queryOne(
      `SELECT id FROM users WHERE LOWER(email) = LOWER(:email) AND id != :id AND deleted_at IS NULL LIMIT 1`,
      { email, id }
    );
    if (emailTaken) return fail(res, 'A user with this email already exists', 422);

    const superRoleId = await getSuperAdminRoleId();
    const wasSuper = userHasSuperRole(existing);
    const staysSuper = superRoleId ? roleIds.includes(superRoleId) : false;

    if (superRoleId && roleIds.includes(superRoleId) && !privileged) {
      // Non-privileged may keep their own super_admin role, but cannot assign it.
      if (!(editingSelf && wasSuper)) {
        return fail(
          res,
          'Only privileged Super Administrators (username containing "admin") can assign the Super Admin role',
          403
        );
      }
    }

    if (wasSuper && !staysSuper && (await countActiveSuperAdmins()) <= 1) {
      return fail(res, 'Cannot remove Super Administrator role from the last Super Admin', 422);
    }

    if (editingSelf && status !== 'active') {
      return fail(res, 'You cannot deactivate your own account', 422);
    }
    if (
      wasSuper &&
      existing.status === 'active' &&
      status !== 'active' &&
      (await countActiveSuperAdmins()) <= 1
    ) {
      return fail(res, 'Cannot deactivate the last Super Administrator', 422);
    }

    // Non-privileged cannot deactivate other super admins (covered above),
    // and cannot change a protected account's credentials to drop "admin" term
    // while remaining the only privileged gatekeeper — allow name/email edits
    // only for privileged managers when targeting another super.
    if (!privileged && !editingSelf && staysSuper) {
      return fail(
        res,
        'Only privileged Super Administrators can manage other Super Admin accounts',
        403
      );
    }

    const sets = [
      'name = :name',
      'email = :email',
      'phone = :phone',
      'status = :status',
    ];
    const params = { id, name, email, phone: phone || null, status };
    if (password) {
      sets.push('password = :password');
      params.password = await hashPassword(String(password));
    }

    await query(
      `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = :id`,
      params
    );
    await syncUserRoles(id, roleIds);

    const user = await queryOne(
      `SELECT id, name, email, phone, status, avatar, created_at FROM users WHERE id = :id`,
      { id }
    );
    await attachUserRoles([user]);
    await logAudit(req, 'update', {
      modelType: 'users',
      modelId: user.id,
      oldValues: {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        phone: existing.phone,
        status: existing.status,
      },
      newValues: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
      },
    });
    return ok(res, user);
  } catch (err) {
    console.error(err);
    return fail(res, err.message || 'Update failed', 500);
  }
}

/** Users are never deleted — deactivate instead (Deder soft-status). */
export async function destroyUser(req, res) {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isFinite(targetId)) return fail(res, 'Invalid user id', 422);
    if (Number(req.user.id) === targetId) {
      return fail(res, 'You cannot deactivate your own account', 422);
    }

    const target = await loadUserWithRoles(targetId);
    if (!target) return fail(res, 'User not found', 404);

    const privileged = isPrivilegedSuperAdmin(req.user);

    if (isProtectedSuperAdmin(target) && !privileged) {
      return fail(res, 'User not found', 404);
    }

    if (userHasSuperRole(target) && !privileged) {
      return fail(
        res,
        'Only privileged Super Administrators (username containing "admin") can deactivate other Super Admin accounts',
        403
      );
    }

    if (userHasSuperRole(target) && (await countActiveSuperAdmins()) <= 1) {
      return fail(res, 'Cannot deactivate the last Super Administrator', 422);
    }

    await query(
      `UPDATE users SET status = 'inactive', updated_at = NOW() WHERE id = :id`,
      { id: targetId }
    );
    await logAudit(req, 'update', {
      modelType: 'users',
      modelId: targetId,
      oldValues: { id: target.id, status: target.status },
      newValues: { id: targetId, status: 'inactive' },
    });
    return message(res, 'User deactivated');
  } catch (err) {
    console.error(err);
    return fail(res, err.message || 'Deactivate failed', 500);
  }
}

// ─── Roles ───────────────────────────────────────────────────────────────────

export async function listRoles(req, res) {
  try {
    const { page, perPage, offset } = paginate(req.query);
    const search = String(req.query.search || req.query.q || '').trim();
    const where = [];
    const params = {};
    if (search) {
      where.push(`(name LIKE :search OR slug LIKE :search OR IFNULL(description,'') LIKE :search)`);
      params.search = `%${search}%`;
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(
      `SELECT * FROM roles ${whereSql} ORDER BY name ASC LIMIT ${perPage} OFFSET ${offset}`,
      params
    );
    const totalRow = await queryOne(`SELECT COUNT(*) AS total FROM roles ${whereSql}`, params);
    await attachRoleMeta(rows);
    return ok(res, {
      data: rows,
      meta: { total: Number(totalRow?.total || 0), page, perPage },
    });
  } catch (err) {
    console.error(err);
    return fail(res, err.message, 500);
  }
}

export async function showRole(req, res) {
  try {
    const role = await queryOne(`SELECT * FROM roles WHERE id = :id LIMIT 1`, {
      id: req.params.id,
    });
    if (!role) return fail(res, 'Role not found', 404);
    await attachRoleMeta([role]);
    return ok(res, role);
  } catch (err) {
    console.error(err);
    return fail(res, err.message, 500);
  }
}

export async function createRole(req, res) {
  try {
    const name = String(req.body?.name || '').trim();
    let slug = String(req.body?.slug || '').trim() || slugify(name);
    const description = req.body?.description != null ? String(req.body.description) : null;
    const permissionIds = parseIdList(req.body?.permission_ids ?? req.body?.permissions);

    if (!name || !slug) return fail(res, 'Name and slug are required', 422);

    const taken = await queryOne(`SELECT id FROM roles WHERE slug = :slug LIMIT 1`, { slug });
    if (taken) return fail(res, 'Slug already exists', 422);

    const result = await query(
      `INSERT INTO roles (name, slug, description, is_system, created_at, updated_at)
       VALUES (:name, :slug, :description, 0, NOW(), NOW())`,
      { name, slug, description }
    );
    await syncRolePermissions(result.insertId, permissionIds);

    const role = await queryOne(`SELECT * FROM roles WHERE id = :id`, { id: result.insertId });
    await attachRoleMeta([role]);
    await logAudit(req, 'create', {
      modelType: 'roles',
      modelId: role.id,
      newValues: { id: role.id, name: role.name, slug: role.slug },
    });
    return ok(res, role, 201);
  } catch (err) {
    console.error(err);
    return fail(res, err.message || 'Create failed', 500);
  }
}

export async function updateRole(req, res) {
  try {
    const id = Number(req.params.id);
    const role = await queryOne(`SELECT * FROM roles WHERE id = :id LIMIT 1`, { id });
    if (!role) return fail(res, 'Role not found', 404);

    if (role.is_system && !isSuper(req)) {
      return fail(res, 'System roles cannot be modified', 403);
    }

    const name = String(req.body?.name || '').trim();
    let slug = String(req.body?.slug || '').trim() || role.slug;
    const description =
      req.body?.description !== undefined ? String(req.body.description || '') : role.description;
    const permissionIds = parseIdList(req.body?.permission_ids ?? req.body?.permissions);

    if (!name) return fail(res, 'Name is required', 422);
    if (role.is_system && slug !== role.slug) {
      return fail(res, 'Cannot change slug of system role', 422);
    }

    const taken = await queryOne(
      `SELECT id FROM roles WHERE slug = :slug AND id != :id LIMIT 1`,
      { slug, id }
    );
    if (taken) return fail(res, 'Slug already exists', 422);

    await query(
      `UPDATE roles SET name = :name, slug = :slug, description = :description, updated_at = NOW()
       WHERE id = :id`,
      { id, name, slug, description }
    );

    // Always sync when permission_ids/permissions is provided (including empty array).
    if (req.body?.permission_ids !== undefined || req.body?.permissions !== undefined) {
      await syncRolePermissions(id, permissionIds);
    }

    const updated = await queryOne(`SELECT * FROM roles WHERE id = :id`, { id });
    await attachRoleMeta([updated]);
    await logAudit(req, 'update', {
      modelType: 'roles',
      modelId: updated.id,
      oldValues: { id: role.id, name: role.name, slug: role.slug, description: role.description },
      newValues: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
      },
    });
    return ok(res, updated);
  } catch (err) {
    console.error(err);
    return fail(res, err.message || 'Update failed', 500);
  }
}

export async function destroyRole(req, res) {
  try {
    const role = await queryOne(`SELECT * FROM roles WHERE id = :id LIMIT 1`, {
      id: req.params.id,
    });
    if (!role) return fail(res, 'Role not found', 404);
    if (role.is_system) return fail(res, 'Cannot delete system role', 422);

    await query(`DELETE FROM role_permissions WHERE role_id = :id`, { id: role.id });
    await query(`DELETE FROM user_roles WHERE role_id = :id`, { id: role.id });
    await query(`DELETE FROM roles WHERE id = :id`, { id: role.id });
    await logAudit(req, 'delete', {
      modelType: 'roles',
      modelId: role.id,
      oldValues: { id: role.id, name: role.name, slug: role.slug },
    });
    return message(res, 'Deleted successfully');
  } catch (err) {
    console.error(err);
    return fail(res, err.message || 'Delete failed', 500);
  }
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export async function listPermissions(req, res) {
  try {
    const { page, perPage, offset } = paginate(req.query);
    const where = ['1=1'];
    const params = {};
    const search = String(req.query.search || req.query.q || '').trim();
    if (search) {
      where.push('(name LIKE :search OR slug LIKE :search OR module LIKE :search OR description LIKE :search)');
      params.search = `%${search}%`;
    }
    if (req.query.module) {
      where.push('module = :module');
      params.module = req.query.module;
    }
    const whereSql = where.join(' AND ');
    const rows = await query(
      `SELECT * FROM permissions WHERE ${whereSql}
       ORDER BY module ASC, name ASC
       LIMIT ${perPage} OFFSET ${offset}`,
      params
    );
    const totalRow = await queryOne(
      `SELECT COUNT(*) AS total FROM permissions WHERE ${whereSql}`,
      params
    );

    if (rows.length) {
      const ids = rows.map((r) => r.id);
      const placeholders = ids.map(() => '?').join(',');
      const counts = await query(
        `SELECT permission_id, COUNT(*) AS total FROM role_permissions
         WHERE permission_id IN (${placeholders}) GROUP BY permission_id`,
        ids
      );
      const byId = Object.fromEntries(counts.map((c) => [c.permission_id, Number(c.total)]));
      for (const row of rows) row.roles_count = byId[row.id] || 0;
    }

    const modules = await query(
      `SELECT DISTINCT module FROM permissions WHERE module IS NOT NULL AND module != '' ORDER BY module ASC`
    );

    return ok(res, {
      data: rows,
      meta: { total: Number(totalRow?.total || 0), page, perPage },
      modules: [...new Set([...PERMISSION_MODULES, ...modules.map((m) => m.module)])],
    });
  } catch (err) {
    console.error(err);
    return fail(res, err.message, 500);
  }
}

export async function showPermission(req, res) {
  try {
    const row = await queryOne(`SELECT * FROM permissions WHERE id = :id LIMIT 1`, {
      id: req.params.id,
    });
    if (!row) return fail(res, 'Permission not found', 404);
    return ok(res, row);
  } catch (err) {
    console.error(err);
    return fail(res, err.message, 500);
  }
}

export async function createPermission(req, res) {
  try {
    if (!isSuper(req)) return fail(res, 'Only Super Administrators can manage permissions', 403);

    const name = String(req.body?.name || '').trim();
    const moduleName = String(req.body?.module || '').trim();
    const description =
      req.body?.description != null ? String(req.body.description) : null;
    let slug = String(req.body?.slug || '').trim() || slugify(name);

    if (!name || !moduleName) return fail(res, 'Name and module are required', 422);

    let candidate = slug;
    let n = 2;
    while (await queryOne(`SELECT id FROM permissions WHERE slug = :slug LIMIT 1`, { slug: candidate })) {
      candidate = `${slug}-${n++}`;
    }

    const result = await query(
      `INSERT INTO permissions (name, slug, module, description, created_at, updated_at)
       VALUES (:name, :slug, :module, :description, NOW(), NOW())`,
      { name, slug: candidate, module: moduleName, description }
    );
    const row = await queryOne(`SELECT * FROM permissions WHERE id = :id`, {
      id: result.insertId,
    });
    await logAudit(req, 'create', {
      modelType: 'permissions',
      modelId: row.id,
      newValues: row,
    });
    return ok(res, row, 201);
  } catch (err) {
    console.error(err);
    return fail(res, err.message || 'Create failed', 500);
  }
}

export async function updatePermission(req, res) {
  try {
    if (!isSuper(req)) return fail(res, 'Only Super Administrators can manage permissions', 403);

    const id = Number(req.params.id);
    const existing = await queryOne(`SELECT * FROM permissions WHERE id = :id LIMIT 1`, { id });
    if (!existing) return fail(res, 'Permission not found', 404);

    const name = String(req.body?.name || '').trim();
    const moduleName = String(req.body?.module || '').trim();
    const description =
      req.body?.description !== undefined
        ? String(req.body.description || '')
        : existing.description;
    let slug = String(req.body?.slug || '').trim() || existing.slug;

    if (!name || !moduleName) return fail(res, 'Name and module are required', 422);

    const taken = await queryOne(
      `SELECT id FROM permissions WHERE slug = :slug AND id != :id LIMIT 1`,
      { slug, id }
    );
    if (taken) return fail(res, 'Slug already exists', 422);

    await query(
      `UPDATE permissions SET name = :name, slug = :slug, module = :module,
       description = :description, updated_at = NOW() WHERE id = :id`,
      { id, name, slug, module: moduleName, description }
    );
    const row = await queryOne(`SELECT * FROM permissions WHERE id = :id`, { id });
    await logAudit(req, 'update', {
      modelType: 'permissions',
      modelId: row.id,
      oldValues: existing,
      newValues: row,
    });
    return ok(res, row);
  } catch (err) {
    console.error(err);
    return fail(res, err.message || 'Update failed', 500);
  }
}

export async function destroyPermission(req, res) {
  try {
    if (!isSuper(req)) return fail(res, 'Only Super Administrators can manage permissions', 403);

    const id = Number(req.params.id);
    const existing = await queryOne(`SELECT * FROM permissions WHERE id = :id LIMIT 1`, { id });
    if (!existing) return fail(res, 'Permission not found', 404);

    const linked = await queryOne(
      `SELECT COUNT(*) AS total FROM role_permissions WHERE permission_id = :id`,
      { id }
    );
    if (Number(linked?.total || 0) > 0) {
      return fail(res, 'Cannot delete a permission that is assigned to roles', 422);
    }

    await query(`DELETE FROM permissions WHERE id = :id`, { id });
    await logAudit(req, 'delete', {
      modelType: 'permissions',
      modelId: existing.id,
      oldValues: existing,
    });
    return message(res, 'Deleted successfully');
  } catch (err) {
    console.error(err);
    return fail(res, err.message || 'Delete failed', 500);
  }
}

/** Flat list of all permissions grouped by module — for role forms. */
export async function permissionsGrouped(_req, res) {
  try {
    const rows = await query(
      `SELECT id, name, slug, module, description FROM permissions ORDER BY module ASC, name ASC`
    );
    const grouped = {};
    for (const row of rows) {
      const mod = row.module || 'general';
      if (!grouped[mod]) grouped[mod] = [];
      grouped[mod].push(row);
    }
    return ok(res, { grouped, modules: Object.keys(grouped), flat: rows });
  } catch (err) {
    console.error(err);
    return fail(res, err.message, 500);
  }
}

export { PERMISSION_MODULES };
