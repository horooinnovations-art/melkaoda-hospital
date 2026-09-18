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
  // Privilege and session-invalidation markers: settable only by direct DB
  // access or the boot-time root-admin designation, never by a request body.
  'is_root_admin',
  'password_changed_at',
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

/** Column types that can hold an empty string. JSON cannot: '' is not valid JSON. */
const TEXT_TYPES = new Set([
  'char',
  'varchar',
  'tinytext',
  'text',
  'mediumtext',
  'longtext',
  'enum',
  'set',
]);

const columnInfoCache = new Map();

/**
 * Nullability and kind of every column in a table (cached).
 *
 * Needed to store a cleared form field correctly. An empty string is not a
 * value MySQL accepts for a DATE, DATETIME, INT or DECIMAL column, so "the
 * editor emptied this field" has to become NULL where the column allows it.
 */
export async function getColumnInfo(table) {
  if (!SAFE_IDENT.test(table)) {
    throw new Error('Invalid table name');
  }
  if (columnInfoCache.has(table)) return columnInfoCache.get(table);

  const rows = await query(
    `SELECT COLUMN_NAME AS name, IS_NULLABLE AS nullable, DATA_TYPE AS type
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table`,
    { table }
  );
  const info = new Map(
    rows.map((r) => [
      r.name,
      {
        nullable: String(r.nullable).toUpperCase() === 'YES',
        text: TEXT_TYPES.has(String(r.type).toLowerCase()),
      },
    ])
  );
  columnInfoCache.set(table, info);
  return info;
}

/**
 * Turn emptied fields into what each column can actually store.
 *
 * The admin forms used to leave an emptied field out of the request entirely,
 * and an UPDATE only writes the columns it is given — so clearing a value, such
 * as the tenure end date of a leader who is serving again, silently kept the
 * old one. The forms now send the field empty, and this decides what empty
 * means per column:
 *
 *   update, nullable column       -> NULL   (the value is cleared)
 *   update, NOT NULL text column  -> ''     (cleared to an empty string)
 *   update, NOT NULL other column -> left out; no valid empty value exists
 *   create, any column            -> left out, so the database default applies,
 *                                    exactly as before this change
 *
 * `slug` is never blanked: it is the record's public address, and an empty one
 * would break every link to it.
 */
export function normalizeEmptyValues(data, columnInfo, mode) {
  const out = { ...data };
  for (const [key, value] of Object.entries(out)) {
    if (typeof value !== 'string' || value.trim() !== '') continue;

    if (mode !== 'update' || key === 'slug') {
      delete out[key];
      continue;
    }

    const column = columnInfo.get(key);
    if (!column) continue;
    if (column.nullable) out[key] = null;
    else if (column.text) out[key] = '';
    else delete out[key];
  }
  return out;
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
