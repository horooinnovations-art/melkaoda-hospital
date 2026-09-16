import { query } from '../config/db.js';
import { assertSafeIdent } from './sqlSafe.js';

/**
 * Attach a related record's name to each row, by foreign key.
 *
 * Rows carried `category_id` and nothing else, so the public API published an
 * integer and no consumer could tell what it meant. The departments listing
 * therefore labelled all twenty-one cards "Clinical unit" — a constant in the
 * template — while the database held ten real categories: Medical Department,
 * Pharmacy, Laboratory, Maintenance and the rest.
 *
 * One query per batch of rows, not one per row.
 */
export async function attachLookup(
  rows,
  { idField, table, as, columns = ['id', 'name', 'slug'], softDelete = false }
) {
  if (!Array.isArray(rows) || !rows.length) return rows;

  assertSafeIdent(table, 'lookup table');
  for (const column of columns) assertSafeIdent(column, 'lookup column');

  const ids = [...new Set(rows.map((row) => row?.[idField]).filter(Boolean))];

  // Still set the key on every row, so the shape does not depend on the data.
  if (!ids.length) {
    for (const row of rows) if (row) row[as] = null;
    return rows;
  }

  const placeholders = ids.map((_, i) => `:k${i}`).join(', ');
  const params = Object.fromEntries(ids.map((id, i) => [`k${i}`, id]));
  const selected = columns.map((c) => `\`${c}\``).join(', ');
  const deletedClause = softDelete ? 'AND deleted_at IS NULL' : '';

  const found = await query(
    `SELECT ${selected} FROM \`${table}\` WHERE id IN (${placeholders}) ${deletedClause}`,
    params
  );
  const byId = new Map(found.map((r) => [String(r.id), r]));

  for (const row of rows) {
    if (!row) continue;
    const key = row[idField];
    row[as] = key ? byId.get(String(key)) ?? null : null;
  }

  return rows;
}
