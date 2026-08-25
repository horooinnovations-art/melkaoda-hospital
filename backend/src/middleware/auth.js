import jwt from 'jsonwebtoken';
import { query, queryOne } from '../config/db.js';
import { normalizeMediaUrl } from '../utils/mediaUrl.js';
import { getJwtSecret } from '../config/env.js';

function requireJwtSecret() {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    requireJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export function formatAuthUser(user, roles = [], permissions = [], extras = {}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    avatar: user.avatar ? normalizeMediaUrl(user.avatar) : null,
    status: user.status,
    roles: Array.isArray(roles) ? roles : [],
    permissions: Array.isArray(permissions) ? permissions : [],
    role_names: Array.isArray(extras.roleNames) ? extras.roleNames : extras.role_names || [],
    created_at: user.created_at || null,
    last_login_at: user.last_login_at || null,
  };
}

export async function getUserPermissions(userId) {
  const rows = await query(
    `SELECT DISTINCT p.slug FROM permissions p
     INNER JOIN role_permissions rp ON rp.permission_id = p.id
     INNER JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = :userId`,
    { userId }
  );
  return rows.map((r) => r.slug);
}

export function userHasPermission(user, permission) {
  if (!user) return false;
  const roles = user.roles || [];
  if (roles.includes('super_admin')) return true;
  const permissions = user.permissions || [];
  return permissions.includes(permission);
}

export function userHasAnyPermission(user, permissions = []) {
  if (!user) return false;
  if ((user.roles || []).includes('super_admin')) return true;
  return permissions.some((p) => (user.permissions || []).includes(p));
}

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const payload = jwt.verify(token, requireJwtSecret());
    const user = await queryOne(
      `SELECT id, name, email, phone, avatar, status, created_at, last_login_at
       FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1`,
      { id: payload.id }
    );

    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Invalid or inactive account' });
    }

    const roles = await query(
      `SELECT r.name, r.slug FROM roles r
       INNER JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = :userId`,
      { userId: user.id }
    );

    const roleSlugs = roles.map((r) => r.slug);
    const permissions = roleSlugs.includes('super_admin')
      ? []
      : await getUserPermissions(user.id);

    let permissionSlugs = permissions;
    if (roleSlugs.includes('super_admin')) {
      permissionSlugs = await getUserPermissions(user.id);
    }

    req.user = {
      ...formatAuthUser(user, roleSlugs, permissionSlugs, {
        roleNames: roles.map((r) => r.name),
      }),
      roleNames: roles.map((r) => r.name),
    };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

/** Panel entry: any of these roles (super_admin always). Matches Deder RoleMiddleware. */
export function requireRoles(...allowed) {
  return (req, res, next) => {
    const roles = req.user?.roles || [];
    if (roles.includes('super_admin')) return next();
    if (allowed.some((r) => roles.includes(r))) return next();
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  };
}

/**
 * Fine-grained feature gate (Deder ChecksPermissions).
 * super_admin bypasses. Otherwise user must have at least one listed permission.
 */
export function requirePermission(...permissions) {
  return (req, res, next) => {
    if (userHasAnyPermission(req.user, permissions)) return next();
    return res.status(403).json({
      success: false,
      message: `You do not have permission to access this resource. Required: ${permissions.join(' or ')}`,
    });
  };
}

/** Permissions page — super_admin only (Deder PermissionController). */
export function requireSuperAdmin(req, res, next) {
  if ((req.user?.roles || []).includes('super_admin')) return next();
  return res.status(403).json({ success: false, message: 'Super admin access required' });
}
