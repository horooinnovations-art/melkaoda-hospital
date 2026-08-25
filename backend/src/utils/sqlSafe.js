import { query } from '../config/db.js';

/** Safe MySQL identifier: letters, digits, underscore only. */
export const SAFE_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

const SYSTEM_COLUMNS = new Set([
  'id',
  'created_at',
  'updated_at',
  'deleted_at',
  'password',
  'remember_token',
]);

const columnCache = new Map();

/**
 * Load writable columns for a table from INFORMATION_SCHEMA (cached).
 * Never allows system/sensitive columns.
 */
export async function getWritableColumns(table) {
  if (!SAFE_IDENT.test(table)) {
    throw new Error('Invalid table name');
  }
  if (columnCache.has(table)) return columnCache.get(table);

  const rows = await query(
    `SELECT COLUMN_NAME AS name
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table`,
    { table }
  );
  const allowed = new Set(
    rows
      .map((r) => r.name)
      .filter((name) => SAFE_IDENT.test(name) && !SYSTEM_COLUMNS.has(name))
  );
  columnCache.set(table, allowed);
  return allowed;
}

/**
 * Keep only keys that are safe identifiers and present in the allow-list.
 * Optional `extraAllow` further restricts (intersection).
 */
export function pickAllowedFields(data, allowedColumns, extraAllow = null) {
  const out = {};
  const extra = extraAllow?.length ? new Set(extraAllow) : null;
  for (const [key, value] of Object.entries(data || {})) {
    if (value === undefined) continue;
    if (!SAFE_IDENT.test(key)) continue;
    if (SYSTEM_COLUMNS.has(key)) continue;
    if (!allowedColumns.has(key)) continue;
    if (extra && !extra.has(key)) continue;
    out[key] = value;
  }
  return out;
}

export function assertSafeIdent(name, label = 'identifier') {
  if (!SAFE_IDENT.test(name)) {
    throw new Error(`Invalid ${label}`);
  }
  return name;
}
