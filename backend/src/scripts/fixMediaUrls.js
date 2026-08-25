/**
 * Fix broken media URLs after Deder→Loke text rebrand.
 * - Restore Cloudinary folder `deder-hospital` (asset path, not brand text)
 * - Rewrite localhost /storage paths to the live Deder host that still serves files
 *
 * Usage: DB_SSL=true node src/scripts/fixMediaUrls.js
 */
import dotenv from 'dotenv';
dotenv.config();

import pool from '../config/db.js';

const STORAGE_HOST =
  process.env.MEDIA_STORAGE_HOST || 'https://deder-hospital-eb7x.onrender.com';

function fixUrl(url) {
  if (!url || typeof url !== 'string') return url;
  let next = url
    .replace(/\/loke-hospital\//g, '/deder-hospital/')
    .replace(/loke-hospital-eb7x\.onrender\.com/gi, 'deder-hospital-eb7x.onrender.com')
    .replace(/loke\.horooinnovations\.com/gi, 'deder.horooinnovations.com')
    .replace(/\/\/loke-hospital\./gi, '//deder-hospital.');

  // Local Laravel storage URLs → live host that still has the files
  next = next.replace(
    /^https?:\/\/localhost(?::\d+)?\/[^/]+\/public\/storage\//i,
    `${STORAGE_HOST}/storage/`
  );
  next = next.replace(
    /^https?:\/\/127\.0\.0\.1(?::\d+)?\/[^/]+\/public\/storage\//i,
    `${STORAGE_HOST}/storage/`
  );
  next = next.replace(
    /^https?:\/\/localhost(?::\d+)?\/storage\//i,
    `${STORAGE_HOST}/storage/`
  );

  // Bare storage paths
  if (next.startsWith('storage/') || next.startsWith('/storage/')) {
    next = `${STORAGE_HOST}/${next.replace(/^\//, '')}`;
  }

  return next;
}

async function main() {
  console.log('Fixing media URLs…');
  const [mediaRows] = await pool.query(`SELECT id, url, path FROM media`);
  let mediaUpdated = 0;
  for (const row of mediaRows) {
    const url = fixUrl(row.url);
    const path = fixUrl(row.path);
    if (url === row.url && path === row.path) continue;
    await pool.query(`UPDATE media SET url = ?, path = ?, updated_at = NOW() WHERE id = ?`, [
      url,
      path,
      row.id,
    ]);
    mediaUpdated += 1;
  }
  console.log(`✓ media: ${mediaUpdated} row(s)`);

  const [settings] = await pool.query(
    `SELECT id, \`key\`, value FROM settings WHERE value LIKE '%http%' OR value LIKE '%storage%' OR value LIKE '%cloudinary%' OR value LIKE '%loke-hospital%'`
  );
  let settingsUpdated = 0;
  for (const row of settings) {
    const value = fixUrl(row.value);
    if (value === row.value) continue;
    await pool.query(`UPDATE settings SET value = ?, updated_at = NOW() WHERE id = ?`, [
      value,
      row.id,
    ]);
    settingsUpdated += 1;
  }
  console.log(`✓ settings: ${settingsUpdated} row(s)`);

  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
