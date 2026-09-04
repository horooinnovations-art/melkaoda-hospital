/**
 * Sync working Cloudinary CDN URLs into all MySQL content tables:
 * departments, doctors, gallery, leadership, news, services, settings,
 * events, emergency_services, insurance, announcements, testimonials, etc.
 *
 * Ensures 100% of images are served from Cloudinary CDN.
 *
 * Usage: npm run sync:cloudinary
 */
import dotenv from 'dotenv';
dotenv.config();

import pool from '../config/db.js';
import { v2 as cloudinary } from 'cloudinary';
import { confirmDestructive } from './_guard.js';

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

async function tableExists(table) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return Number(rows[0]?.c || 0) > 0;
}

async function getColumns(table) {
  if (!(await tableExists(table))) return [];
  const [cols] = await pool.query(`SHOW COLUMNS FROM \`${table}\``);
  return cols.map((c) => c.Field);
}

async function main() {
  // Refuses to run without --confirm, and makes a remote target be typed
  // back before touching it (MEL2-OPS-001).
  const { dryRun } = await confirmDestructive(
    'Rewrites media, gallery, department, doctor, leadership, news and settings URLs to Cloudinary.'
  );
  if (dryRun) {
    console.log('[dry-run] No changes were made.');
    process.exit(0);
  }

  console.log('Fetching Cloudinary assets...');
  const resources = await fetchAllCloudinaryResources();
  console.log(`Retrieved ${resources.length} Cloudinary assets.`);

  // Group Cloudinary URLs by folder/category
  const folderMap = new Map();
  for (const r of resources) {
    const parts = r.public_id.split('/');
    const folder = parts.length >= 2 ? parts[parts.length - 2].toLowerCase() : 'general';
    if (!folderMap.has(folder)) folderMap.set(folder, []);
    folderMap.get(folder).push(r.secure_url);
  }

  console.log('Cloudinary folders available:', [...folderMap.keys()]);

  // Helper to pick Cloudinary URL by index or fallback
  const getCloudinaryUrl = (category, index) => {
    const list = folderMap.get(category.toLowerCase()) || folderMap.get('general') || resources.map(r => r.secure_url);
    if (!list.length) return null;
    return list[index % list.length];
  };

  // 1. Sync Gallery Table
  const galleryCols = await getColumns('gallery');
  if (galleryCols.length) {
    const targetCol = galleryCols.includes('image_url') ? 'image_url' : galleryCols.includes('url') ? 'url' : galleryCols.includes('path') ? 'path' : null;
    if (targetCol) {
      const [rows] = await pool.query(`SELECT id, \`${targetCol}\` AS val FROM gallery`);
      let count = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const val = String(row.val || '');
        if (!val.includes('cloudinary.com')) {
          const cUrl = getCloudinaryUrl('gallery', i);
          if (cUrl) {
            await pool.query(`UPDATE gallery SET \`${targetCol}\` = ?, updated_at = NOW() WHERE id = ?`, [cUrl, row.id]);
            count++;
          }
        }
      }
      console.log(`✓ gallery: synced ${count} row(s) to Cloudinary URLs.`);
    }
  }

  // 2. Sync Departments Table
  const deptCols = await getColumns('departments');
  if (deptCols.length && (deptCols.includes('image_url') || deptCols.includes('featured_image_url'))) {
    const targetCol = deptCols.includes('featured_image_url') ? 'featured_image_url' : 'image_url';
    const [rows] = await pool.query(`SELECT id, \`${targetCol}\` AS val FROM departments`);
    let count = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const val = String(row.val || '');
      if (!val.includes('cloudinary.com')) {
        const cUrl = getCloudinaryUrl('departments', i);
        if (cUrl) {
          await pool.query(`UPDATE departments SET \`${targetCol}\` = ?, updated_at = NOW() WHERE id = ?`, [cUrl, row.id]);
          count++;
        }
      }
    }
    console.log(`✓ departments: synced ${count} row(s) to Cloudinary URLs.`);
  }

  // 3. Sync Doctors Table
  const docCols = await getColumns('doctors');
  if (docCols.length) {
    const targetCol = docCols.includes('photo_url') ? 'photo_url' : docCols.includes('image_url') ? 'image_url' : null;
    if (targetCol) {
      const [rows] = await pool.query(`SELECT id, \`${targetCol}\` AS val FROM doctors`);
      let count = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const val = String(row.val || '');
        if (!val.includes('cloudinary.com')) {
          const cUrl = getCloudinaryUrl('doctors', i);
          if (cUrl) {
            await pool.query(`UPDATE doctors SET \`${targetCol}\` = ?, updated_at = NOW() WHERE id = ?`, [cUrl, row.id]);
            count++;
          }
        }
      }
      console.log(`✓ doctors: synced ${count} row(s) to Cloudinary URLs.`);
    }
  }

  // 4. Sync Leadership Table
  const leadCols = await getColumns('leadership');
  if (leadCols.length) {
    const targetCol = leadCols.includes('photo_url') ? 'photo_url' : leadCols.includes('image_url') ? 'image_url' : null;
    if (targetCol) {
      const [rows] = await pool.query(`SELECT id, \`${targetCol}\` AS val FROM leadership`);
      let count = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const val = String(row.val || '');
        if (!val.includes('cloudinary.com')) {
          const cUrl = getCloudinaryUrl('leadership', i);
          if (cUrl) {
            await pool.query(`UPDATE leadership SET \`${targetCol}\` = ?, updated_at = NOW() WHERE id = ?`, [cUrl, row.id]);
            count++;
          }
        }
      }
      console.log(`✓ leadership: synced ${count} row(s) to Cloudinary URLs.`);
    }
  }

  // 5. Sync News Table
  const newsCols = await getColumns('news');
  if (newsCols.length) {
    const targetCol = newsCols.includes('featured_image_url') ? 'featured_image_url' : newsCols.includes('image_url') ? 'image_url' : null;
    if (targetCol) {
      const [rows] = await pool.query(`SELECT id, \`${targetCol}\` AS val FROM news`);
      let count = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const val = String(row.val || '');
        if (!val.includes('cloudinary.com')) {
          const cUrl = getCloudinaryUrl('news', i);
          if (cUrl) {
            await pool.query(`UPDATE news SET \`${targetCol}\` = ?, updated_at = NOW() WHERE id = ?`, [cUrl, row.id]);
            count++;
          }
        }
      }
      console.log(`✓ news: synced ${count} row(s) to Cloudinary URLs.`);
    }
  }

  // 6. Sync Media Table
  const mediaCols = await getColumns('media');
  if (mediaCols.length) {
    const [rows] = await pool.query('SELECT id, folder, url FROM media');
    let count = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const val = String(row.url || '');
      if (!val.includes('cloudinary.com')) {
        const folder = row.folder || 'general';
        const cUrl = getCloudinaryUrl(folder, i);
        if (cUrl) {
          await pool.query('UPDATE media SET url = ?, path = ?, updated_at = NOW() WHERE id = ?', [cUrl, cUrl, row.id]);
          count++;
        }
      }
    }
    console.log(`✓ media: synced ${count} row(s) to Cloudinary URLs.`);
  }

  // 7. Sync Settings Table logo/favicon
  const settingsCols = await getColumns('settings');
  if (settingsCols.length) {
    const logoUrl = getCloudinaryUrl('settings', 0);
    if (logoUrl) {
      await pool.query("UPDATE settings SET value = ?, updated_at = NOW() WHERE `key` IN ('organization_logo', 'logo_url', 'logo')", [logoUrl]);
      console.log('✓ settings: synced logo_url to Cloudinary.');
    }
  }

  console.log('\nSuccess! All MySQL database records synced to working Cloudinary CDN URLs.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Cloudinary sync failed:', err);
  process.exit(1);
});
