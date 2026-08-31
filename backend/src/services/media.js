import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { query, queryOne } from '../config/db.js';
import { normalizeMediaUrl } from '../utils/mediaUrl.js';

export { normalizeMediaUrl };

const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/^\./, '');
    const mime = String(file.mimetype || '').toLowerCase();
    // Office / text formats: Windows and some browsers send
    // application/octet-stream for these, so the extension is what we trust.
    const OCTET = 'application/octet-stream';
    const allowed = {
      jpg: ['image/jpeg'],
      jpeg: ['image/jpeg'],
      png: ['image/png'],
      gif: ['image/gif'],
      webp: ['image/webp'],
      pdf: ['application/pdf'],
      mp4: ['video/mp4'],
      webm: ['video/webm'],
      // Downloads centre document formats.
      doc: ['application/msword', OCTET],
      docx: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/zip',
        OCTET,
      ],
      xls: ['application/vnd.ms-excel', OCTET],
      xlsx: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip',
        OCTET,
      ],
      csv: ['text/csv', 'application/csv', 'text/plain', OCTET],
      txt: ['text/plain', OCTET],
    };
    const okExt = Boolean(allowed[ext]);
    const okMime = okExt && allowed[ext].includes(mime);
    const ok = okExt && okMime;
    cb(ok ? null : new Error('Unsupported file type'), ok);
  },
});

function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

if (cloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function saveMedia(file, userId = null, folder = 'general') {
  let url;
  let storedPath = file.path;

  if (cloudinaryConfigured()) {
    const result = await cloudinary.uploader.upload(file.path, {
      // Shared Cloudinary account still hosts assets under deder-hospital.
      folder: `${process.env.CLOUDINARY_FOLDER || 'deder-hospital'}/${folder}`,
      resource_type: 'auto',
    });
    url = result.secure_url;
    storedPath = result.secure_url;
    fs.unlinkSync(file.path);
  } else {
    if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
      throw new Error(
        'Cloudinary is required in production. Local uploads are not durable on Render/cPanel.'
      );
    }
    url = `/uploads/${path.basename(file.path)}`;
  }

  // `media.type` is enum('image','document','video','audio') — anything that is
  // not obviously media (Word, Excel, CSV, PDF…) is filed as a document.
  const type = file.mimetype.startsWith('image')
    ? 'image'
    : file.mimetype.startsWith('video')
      ? 'video'
      : file.mimetype.startsWith('audio')
        ? 'audio'
        : 'document';

  // Match Deder media schema (no disk / cloudinary_public_id columns)
  const result = await query(
    `INSERT INTO media (user_id, filename, original_filename, mime_type, size, path, url, type, folder, created_at, updated_at)
     VALUES (:user_id, :filename, :original_filename, :mime_type, :size, :path, :url, :type, :folder, NOW(), NOW())`,
    {
      user_id: userId,
      filename: path.basename(String(storedPath)),
      original_filename: file.originalname,
      mime_type: file.mimetype,
      size: file.size,
      path: storedPath,
      url,
      type,
      folder,
    }
  );

  return queryOne(`SELECT * FROM media WHERE id = :id`, { id: result.insertId });
}

export async function attachPhoto(row, photoKey = 'photo_id', as = 'photo') {
  if (!row?.[photoKey]) {
    row[as] = null;
    return row;
  }
  const media = await queryOne(
    `SELECT id, url, alt_text, path, type, folder FROM media WHERE id = :id`,
    { id: row[photoKey] }
  );
  if (media) {
    media.url = normalizeMediaUrl(media.url);
    media.path = normalizeMediaUrl(media.path);
  }
  row[as] = media;
  if (media?.url) row[`${as}_url`] = media.url;
  return row;
}

export async function attachPhotos(rows, photoKey = 'photo_id', as = 'photo') {
  if (!Array.isArray(rows) || !rows.length) return rows;
  const ids = Array.from(new Set(rows.map((r) => r?.[photoKey]).filter(Boolean)));
  if (!ids.length) {
    for (const r of rows) {
      if (r) r[as] = null;
    }
    return rows;
  }

  const params = {};
  const placeholders = ids.map((id, index) => {
    const key = `id_${index}`;
    params[key] = id;
    return `:${key}`;
  });

  const mediaRows = await query(
    `SELECT id, url, alt_text, path, type, folder FROM media WHERE id IN (${placeholders.join(', ')})`,
    params
  );

  const mediaMap = new Map();
  for (const media of mediaRows) {
    media.url = normalizeMediaUrl(media.url);
    media.path = normalizeMediaUrl(media.path);
    mediaMap.set(media.id, media);
  }

  for (const row of rows) {
    if (!row) continue;
    const media = mediaMap.get(row[photoKey]) || null;
    row[as] = media;
    if (media?.url) row[`${as}_url`] = media.url;
  }
  return rows;
}
