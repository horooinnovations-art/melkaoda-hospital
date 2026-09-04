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
    // Read-only privilege marker (users.is_root_admin). Never accepted from a
    // request body — see sqlSafe SYSTEM_COLUMNS.
    is_root_admin: user.is_root_admin === 1 || user.is_root_admin === true || user.is_root_admin === '1',
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

/**
 * Is a token that was issued at `iat` still valid for this user?
 *
 * JWTs here are stateless and live for 7 days, so a password change used to
 * leave every previously-issued token working — a stolen token outlived the
 * reset meant to revoke it (MEL-SEC-007). `users.password_changed_at` is the
 * cutoff. One second of slack keeps the token minted by the very request that
 * set the timestamp valid.
 *
 * @param {number|undefined} iat  token issued-at, seconds since epoch
 * @param {string|Date|null} passwordChangedAt
 */
export function isTokenStillValid(iat, passwordChangedAt) {
  if (!passwordChangedAt) return true;
  if (!iat) return true;
  const changedAt = Math.floor(new Date(passwordChangedAt).getTime() / 1000);
  if (!Number.isFinite(changedAt)) return true;
  return iat + 1 >= changedAt;
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
      `SELECT id, name, email, phone, avatar, status, created_at, last_login_at,
              COALESCE(is_root_admin, 0) AS is_root_admin, password_changed_at
       FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1`,
      { id: payload.id }
    );

    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Invalid or inactive account' });
    }

    if (!isTokenStillValid(payload.iat, user.password_changed_at)) {
      return res
        .status(401)
        .json({ success: false, message: 'Session expired. Please sign in again.' });
    }

    const roles = await query(
      `SELECT r.name, r.slug FROM roles r
       INNER JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = :userId`,
      { userId: user.id }
    );

    const roleSlugs = roles.map((r) => r.slug);
    // Loaded for everyone, super admins included: they bypass permission checks
    // in userHasPermission, but the panel still needs the list to decide what to
    // show, and permissionsBeyondCaller reads it when granting. This used to be
    // computed as an empty array and then immediately recomputed.
    const permissionSlugs = await getUserPermissions(user.id);

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

/** Panel entry: any of these roles (super_admin always). */
export function requireRoles(...allowed) {
  return (req, res, next) => {
    const roles = req.user?.roles || [];
    if (roles.includes('super_admin')) return next();
    if (allowed.some((r) => roles.includes(r))) return next();
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  };
}

/**
 * Fine-grained feature gate.
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

/** Permissions page — super_admin only. */
export function requireSuperAdmin(req, res, next) {
  if ((req.user?.roles || []).includes('super_admin')) return next();
  return res.status(403).json({ success: false, message: 'Super admin access required' });
}
