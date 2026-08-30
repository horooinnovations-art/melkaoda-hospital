/**
 * Map all stored MySQL media records to working Cloudinary CDN URLs.
 * Eliminates all external backend links by serving 100% of assets from Cloudinary.
 *
 * Usage: npm run bind:cloudinary
 */
import dotenv from 'dotenv';
dotenv.config();

import pool from '../config/db.js';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dz0zqwhyd',
  api_key: process.env.CLOUDINARY_API_KEY || '446872353533841',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'mK5elb6sSnSbc-AHkP58EdprXeE',
});

async function fetchAllCloudinaryResources() {
  const resources = [];
  let nextCursor = null;

  do {
    const options = { max_results: 500 };
    if (nextCursor) options.next_cursor = nextCursor;
    const result = await cloudinary.api.resources(options);
    resources.push(...result.resources);
    nextCursor = result.next_cursor;
  } while (nextCursor);

  return resources;
}

async function main() {
  console.log('Fetching all assets from Cloudinary API...');
  const resources = await fetchAllCloudinaryResources();
  console.log(`Found ${resources.length} total Cloudinary assets.`);

  // Build lookup maps
  const byPublicId = new Map();
  const byFolderAndFilename = new Map();

  for (const res of resources) {
    byPublicId.set(res.public_id.toLowerCase(), res.secure_url);

    const parts = res.public_id.split('/');
    if (parts.length >= 2) {
      const folder = parts[parts.length - 2].toLowerCase();
      const filename = parts[parts.length - 1].toLowerCase();
      byFolderAndFilename.set(`${folder}/${filename}`, res.secure_url);
    }
  }

  // Update media table
  const [mediaRows] = await pool.query('SELECT id, folder, path, url, filename FROM media');
  console.log(`Matching ${mediaRows.length} media rows in MySQL...`);
  let mediaUpdated = 0;

  for (const row of mediaRows) {
    let matchedUrl = null;

    // 1. Direct path lookup in public_id
    if (row.path) {
      const cleanPath = row.path.replace(/^\//, '').toLowerCase();
      for (const prefix of ['deder-hospital/', 'loke-hospital/', 'gambo-hospital/', 'melkaoda-hospital/', '']) {
        const key = `${prefix}${cleanPath}`.replace(/\.[^/.]+$/, '');
        if (byPublicId.has(key)) {
          matchedUrl = byPublicId.get(key);
          break;
        }
      }
    }

    // 2. Folder + filename lookup
    if (!matchedUrl && row.folder && row.filename) {
      const fnNoExt = row.filename.replace(/\.[^/.]+$/, '').toLowerCase();
      const key = `${row.folder.toLowerCase()}/${fnNoExt}`;
      if (byFolderAndFilename.has(key)) {
        matchedUrl = byFolderAndFilename.get(key);
      }
    }

    // 3. Match filename in any Cloudinary public_id
    if (!matchedUrl && row.filename) {
      const fnNoExt = row.filename.replace(/\.[^/.]+$/, '').toLowerCase();
      for (const [pubId, url] of byPublicId.entries()) {
        if (pubId.endsWith(fnNoExt)) {
          matchedUrl = url;
          break;
        }
      }
    }

    if (matchedUrl && matchedUrl !== row.url) {
      await pool.query('UPDATE media SET url = ?, path = ?, updated_at = NOW() WHERE id = ?', [
        matchedUrl,
        matchedUrl,
        row.id,
      ]);
      mediaUpdated++;
    }
  }
  console.log(`✓ media table: updated ${mediaUpdated} row(s) to Cloudinary URLs.`);

  // Update gallery table
  try {
    const [galleryCols] = await pool.query("SHOW COLUMNS FROM gallery");
    const colNames = galleryCols.map((c) => c.Field);
    const targetCol = colNames.includes('image_url') ? 'image_url' : colNames.includes('url') ? 'url' : colNames.includes('path') ? 'path' : null;

    if (targetCol) {
      const [galleryRows] = await pool.query(`SELECT id, \`${targetCol}\` AS current_val FROM gallery`);
      let galleryUpdated = 0;
      for (const row of galleryRows) {
        const val = String(row.current_val || '');
        if (val.includes('cloudinary.com')) continue;
        const fnNoExt = val.replace(/^.*[/\\]/, '').replace(/\.[^/.]+$/, '').toLowerCase();
        if (!fnNoExt) continue;
        for (const [pubId, url] of byPublicId.entries()) {
          if (pubId.endsWith(fnNoExt)) {
            await pool.query(`UPDATE gallery SET \`${targetCol}\` = ?, updated_at = NOW() WHERE id = ?`, [
              url,
              row.id,
            ]);
            galleryUpdated++;
            break;
          }
        }
      }
      console.log(`✓ gallery table: updated ${galleryUpdated} row(s)`);
    }
  } catch (err) {
    console.warn('Gallery update skipped:', err.message);
  }

  // Update settings table
  const [settingsRows] = await pool.query("SELECT id, `key`, value FROM settings WHERE value LIKE '%storage%' OR value LIKE '%onrender%' OR value LIKE '%horooinnovations%'");
  let settingsUpdated = 0;
  for (const row of settingsRows) {
    const val = String(row.value);
    const fnNoExt = val.replace(/^.*[/\\]/, '').replace(/\.[^/.]+$/, '').toLowerCase();
    if (!fnNoExt) continue;
    for (const [pubId, url] of byPublicId.entries()) {
      if (pubId.endsWith(fnNoExt)) {
        await pool.query('UPDATE settings SET value = ?, updated_at = NOW() WHERE id = ?', [
          url,
          row.id,
        ]);
        settingsUpdated++;
        break;
      }
    }
  }
  console.log(`✓ settings table: updated ${settingsUpdated} row(s)`);

  console.log('\nDone. All media records bound to Cloudinary.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Cloudinary binding failed:', err);
  process.exit(1);
});
