#!/usr/bin/env node
/**
 * Download every Cloudinary-hosted asset onto this account's disk and repoint
 * the database at the local copy.
 *
 * Why this exists: switching MEDIA_DRIVER to `local` only changes where *new*
 * uploads go. Existing `media` rows still hold `https://res.cloudinary.com/...`
 * URLs, on an account shared with the Deder, Gambo and Loke sites. Until they
 * are brought across, the site is not actually self-contained and deleting that
 * shared Cloudinary account would empty the gallery.
 *
 * Usage, from the API application root:
 *
 *   node src/scripts/cloudinaryToLocal.js --dry-run     # report, change nothing
 *   node src/scripts/cloudinaryToLocal.js --confirm     # do it
 *
 * Safe to re-run: a row whose file is already on disk is skipped, and the
 * original Cloudinary URL is preserved in `media.path` until the row is
 * verified, so a failed run leaves nothing dangling.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import pool, { query } from '../config/db.js';
import { confirmDestructive } from './_guard.js';
import { UPLOAD_ROOT, PRIVATE_UPLOAD_ROOT } from '../services/media.js';

const CLOUDINARY = /^https?:\/\/res\.cloudinary\.com\//i;

/** A safe single path segment — no traversal, no separators. */
function safeSegment(value, fallback) {
  const cleaned = String(value || '').replace(/[^A-Za-z0-9._-]/g, '');
  return cleaned && cleaned !== '.' && cleaned !== '..' ? cleaned : fallback;
}

/**
 * Filename for a downloaded asset. Prefers Cloudinary's public id (already
 * unique) over the original filename, which is attacker-supplied and frequently
 * duplicated.
 */
function targetFileName(row) {
  const fromUrl = String(row.url || '').split(/[?#]/)[0].split('/').pop() || '';
  const ext = path.extname(fromUrl) || path.extname(row.original_filename || '') || '';
  const base =
    safeSegment(String(row.cloudinary_public_id || '').split('/').pop(), '') ||
    safeSegment(path.basename(fromUrl, ext), `media-${row.id}`);
  return `${base}${ext}`;
}

async function download(url, destination) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error('empty response');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, buffer);
  return buffer.length;
}

async function main() {
  const { dryRun } = await confirmDestructive(
    'Downloads every Cloudinary asset to local disk and repoints the media table at it.'
  );

  const rows = await query(
    `SELECT id, url, path, folder, original_filename, mime_type,
            cloudinary_public_id, is_private
     FROM media
     WHERE url LIKE 'https://res.cloudinary.com/%'
     ORDER BY id ASC`
  );

  if (!rows.length) {
    console.log('[migrate] No Cloudinary-hosted media rows found. Nothing to do.');
    await pool.end();
    return;
  }

  console.log(`[migrate] ${rows.length} asset(s) to bring across.`);
  if (dryRun) {
    for (const row of rows.slice(0, 20)) {
      const folder = safeSegment(row.folder, 'general');
      console.log(
        `  #${row.id}  ${row.is_private ? '[private] ' : ''}${folder}/${targetFileName(row)}`
      );
    }
    if (rows.length > 20) console.log(`  … and ${rows.length - 20} more`);
    console.log('[dry-run] No files were downloaded and no rows were changed.');
    await pool.end();
    return;
  }

  let moved = 0;
  let skipped = 0;
  const failures = [];

  for (const row of rows) {
    const folder = safeSegment(row.folder, 'general');
    const fileName = targetFileName(row);
    const relative = `${folder}/${fileName}`;
    // Private assets (résumés) must land outside the web-served directory.
    const root = row.is_private ? PRIVATE_UPLOAD_ROOT : UPLOAD_ROOT;
    const destination = path.join(root, folder, fileName);

    try {
      if (fs.existsSync(destination) && fs.statSync(destination).size > 0) {
        skipped += 1;
      } else {
        const bytes = await download(row.url, destination);
        console.log(`  ✓ #${row.id}  ${relative}  (${(bytes / 1024).toFixed(0)} KB)`);
        moved += 1;
      }

      await query(
        `UPDATE media
         SET url = :url, path = :path, cloudinary_public_id = NULL,
             cloudinary_resource_type = NULL, updated_at = NOW()
         WHERE id = :id`,
        {
          id: row.id,
          url: row.is_private ? `private:${relative}` : `/uploads/${relative}`,
          path: relative,
        }
      );
    } catch (err) {
      // Leave the row pointing at Cloudinary so the site keeps working and the
      // asset can be retried; a half-migrated row is worse than an unmigrated
      // one.
      failures.push({ id: row.id, url: row.url, error: err.message });
      console.warn(`  ✗ #${row.id}  ${err.message}`);
    }
  }

  console.log(
    `\n[migrate] downloaded ${moved}, already present ${skipped}, failed ${failures.length}.`
  );

  if (failures.length) {
    console.warn(
      '[migrate] The failed rows still point at Cloudinary and are safe to retry by ' +
        're-running this script. Do not delete the Cloudinary account until this reports 0 failures.'
    );
  } else {
    console.log(
      '[migrate] Every asset is now local. Content referencing Cloudinary URLs inside ' +
        'rich-text bodies is NOT covered here — search settings and page content for ' +
        '"res.cloudinary.com" before decommissioning the account.'
    );
  }

  await pool.end();
}

if (process.argv[1] && process.argv[1].endsWith('cloudinaryToLocal.js')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
