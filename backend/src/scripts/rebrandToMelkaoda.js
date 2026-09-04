/**
 * Rebrand Deder / Gambo / Loke → Melka Oda General Hospital across text fields in MySQL.
 *
 * Usage (from backend/, with DB_* env pointing at MySQL):
 *   npm run rebrand:melkaoda
 */
import dotenv from 'dotenv';
dotenv.config();

import pool from '../config/db.js';
import { confirmDestructive } from './_guard.js';

const TABLE_COLUMNS = [
  { table: 'settings', columns: ['value'], where: '1=1' },
  { table: 'announcements', columns: ['title', 'content', 'excerpt'], where: 'deleted_at IS NULL' },
  { table: 'news', columns: ['title', 'content', 'excerpt', 'meta_title', 'meta_description'], where: 'deleted_at IS NULL' },
  { table: 'pages', columns: ['title', 'content', 'excerpt', 'meta_title', 'meta_description'], where: 'deleted_at IS NULL' },
  { table: 'departments', columns: ['name', 'description', 'short_description'], where: 'deleted_at IS NULL' },
  { table: 'services', columns: ['name', 'description', 'short_description'], where: 'deleted_at IS NULL' },
  { table: 'doctors', columns: ['bio', 'short_bio', 'education', 'certifications'], where: 'deleted_at IS NULL' },
  { table: 'leadership', columns: ['name', 'position', 'bio', 'short_bio', 'education', 'achievements'], where: 'deleted_at IS NULL' },
  { table: 'gallery', columns: ['title', 'description'], where: '1=1' },
  { table: 'events', columns: ['title', 'description', 'content', 'location'], where: 'deleted_at IS NULL' },
  { table: 'careers', columns: ['title', 'description', 'requirements', 'responsibilities'], where: 'deleted_at IS NULL' },
  { table: 'faqs', columns: ['question', 'answer'], where: 'deleted_at IS NULL' },
  { table: 'insurance', columns: ['name', 'description', 'coverage_details'], where: 'deleted_at IS NULL' },
  { table: 'emergency_services', columns: ['title', 'description', 'content'], where: 'deleted_at IS NULL' },
  { table: 'health_education', columns: ['title', 'content', 'excerpt', 'meta_title', 'meta_description'], where: 'deleted_at IS NULL' },
  { table: 'testimonials', columns: ['content', 'patient_name'], where: '1=1' },
  { table: 'leadership_history', columns: ['name', 'position', 'bio', 'achievements', 'education'], where: '1=1' },
];

export function rebrandTextToMelkaoda(value) {
  if (value == null || typeof value !== 'string') return value;

  let next = value.replace(
    /^https?:\/\/(?:[a-z0-9-]+\.)*(?:deder|loke|gambo)[-a-z0-9]*\.(?:onrender\.com|horooinnovations\.com)\/(storage|uploads)\//gi,
    '/$1/'
  );

  return next
    .replace(/Deder General Hospital/gi, 'Melka Oda General Hospital')
    .replace(/Gambo General Hospital/gi, 'Melka Oda General Hospital')
    .replace(/Loke General Hospital/gi, 'Melka Oda General Hospital')
    .replace(/Deder Hospital/gi, 'Melka Oda Hospital')
    .replace(/Gambo Hospital/gi, 'Melka Oda Hospital')
    .replace(/Loke Hospital/gi, 'Melka Oda Hospital')
    .replace(/Deder/g, 'Melka Oda')
    .replace(/Gambo/g, 'Melka Oda')
    .replace(/Loke/g, 'Melka Oda')
    .replace(/deder/g, 'melkaoda')
    .replace(/gambo/g, 'melkaoda')
    .replace(/loke/g, 'melkaoda');
}

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows[0]?.c || 0) > 0;
}

async function tableExists(table) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [table]
  );
  return Number(rows[0]?.c || 0) > 0;
}

async function rebrandTable({ table, columns, where }) {
  if (!(await tableExists(table))) {
    console.log(`- skip missing table: ${table}`);
    return 0;
  }

  let effectiveWhere = where;
  if (where.includes('deleted_at') && !(await columnExists(table, 'deleted_at'))) {
    effectiveWhere = '1=1';
  }

  const existingColumns = [];
  for (const column of columns) {
    if (await columnExists(table, column)) existingColumns.push(column);
  }
  if (!existingColumns.length) {
    console.log(`- skip ${table}: no matching text columns`);
    return 0;
  }

  const selectCols = ['id', ...existingColumns].map((c) => `\`${c}\``).join(', ');
  const [rows] = await pool.query(`SELECT ${selectCols} FROM \`${table}\` WHERE ${effectiveWhere}`);
  let updated = 0;

  for (const row of rows) {
    const sets = [];
    const params = [];
    for (const column of existingColumns) {
      const original = row[column];
      if (typeof original !== 'string') continue;
      if (!/deder|gambo|loke/i.test(original)) continue;
      const next = rebrandTextToMelkaoda(original);
      if (next === original) continue;
      sets.push(`\`${column}\` = ?`);
      params.push(next);
    }
    if (!sets.length) continue;
    params.push(row.id);
    await pool.query(`UPDATE \`${table}\` SET ${sets.join(', ')} WHERE id = ?`, params);
    updated += 1;
  }

  console.log(`✓ ${table}: updated ${updated} row(s)`);
  return updated;
}

async function main() {
  // Refuses to run without --confirm, and makes a remote target be typed
  // back before touching it (MEL2-OPS-001).
  const { dryRun } = await confirmDestructive(
    'Rewrites Deder/Gambo/Loke to "Melka Oda" across every content table.'
  );
  if (dryRun) {
    console.log('[dry-run] No changes were made.');
    process.exit(0);
  }

  console.log('Rebranding Deder/Gambo/Loke → Melka Oda General Hospital in database content...');
  let total = 0;
  for (const entry of TABLE_COLUMNS) {
    total += await rebrandTable(entry);
  }

  // Explicit org identity keys in settings
  await pool.query(
    `UPDATE settings SET value = 'Melka Oda General Hospital', updated_at = NOW()
     WHERE \`key\` IN ('organization_name', 'site_name', 'name')`
  );
  await pool.query(
    `UPDATE settings SET value = REPLACE(REPLACE(REPLACE(value, 'Deder', 'Melka Oda'), 'Gambo', 'Melka Oda'), 'Loke', 'Melka Oda'), updated_at = NOW()
     WHERE value LIKE '%Deder%' OR value LIKE '%deder%' OR value LIKE '%Gambo%' OR value LIKE '%gambo%' OR value LIKE '%Loke%' OR value LIKE '%loke%'`
  );

  console.log(`\nDone. ${total} content row(s) rebranded to Melka Oda General Hospital.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Rebrand failed:', err.message);
  process.exit(1);
});
