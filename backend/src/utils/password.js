import bcrypt from 'bcryptjs';

/**
 * Coerce DB / driver values into a bcrypt-compatible hash string.
 * - mysql2 may return Buffers for some column types
 * - Laravel / PHP password_hash uses $2y$ which some bcrypt builds reject
 */
export function normalizePasswordHash(raw) {
  if (raw == null) return '';
  let hash = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
  hash = hash.trim();
  if (!hash) return '';
  // PHP / Laravel bcrypt prefix → Node-compatible prefix
  if (hash.startsWith('$2y$')) hash = `$2a$${hash.slice(4)}`;
  else if (hash.startsWith('$2Y$')) hash = `$2a$${hash.slice(4)}`;
  return hash;
}

export function looksLikeBcryptHash(hash) {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(String(hash || ''));
}

export async function hashPassword(plain) {
  return bcrypt.hash(String(plain), 12);
}

export async function verifyPassword(plain, storedHash) {
  const password = String(plain ?? '');
  const hash = normalizePasswordHash(storedHash);
  if (!password || !hash) return false;
  if (!looksLikeBcryptHash(hash)) {
    // Avoid bcrypt throwing on argon2 / plaintext / truncated values
    return false;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
