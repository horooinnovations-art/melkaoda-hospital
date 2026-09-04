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

/**
 * Leading bytes each accepted binary format must start with.
 *
 * The extension and the browser-declared MIME type are both attacker-supplied,
 * and the Office formats deliberately accept `application/octet-stream`, so for
 * those the extension was the only gate at all. Checking the magic number after
 * the file lands is the first check on the actual content (MEL2-SEC-009).
 *
 * Text formats (csv, txt) have no signature and are validated by extension and
 * size only — they are inert, and are never served from this origin.
 */
const MAGIC = {
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  png: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  gif: [[0x47, 0x49, 0x46, 0x38]],
  webp: [[0x52, 0x49, 0x46, 0x46]], // RIFF; "WEBP" checked at offset 8
  pdf: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  mp4: [], // ftyp box sits at offset 4; checked separately
  webm: [[0x1a, 0x45, 0xdf, 0xa3]],
  doc: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]], // OLE2
  xls: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  docx: [[0x50, 0x4b, 0x03, 0x04]], // zip
  xlsx: [[0x50, 0x4b, 0x03, 0x04]],
};

/**
 * Read the first bytes of an uploaded file and confirm they match the format
 * the extension claims.
 *
 * @returns {boolean} true when the content is consistent, or unverifiable by
 *   signature (text formats), in which case the extension gate stands alone.
 */
export function contentMatchesExtension(filePath, ext) {
  const signatures = MAGIC[ext];
  if (signatures === undefined) return true; // csv, txt — nothing to compare
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const head = Buffer.alloc(16);
    const read = fs.readSync(fd, head, 0, 16, 0);
    if (read < 4) return false;

    if (ext === 'mp4') {
      // ISO base media: bytes 4-7 are "ftyp".
      return head.slice(4, 8).toString('latin1') === 'ftyp';
    }
    if (ext === 'webp') {
      return (
        head.slice(0, 4).toString('latin1') === 'RIFF' &&
        head.slice(8, 12).toString('latin1') === 'WEBP'
      );
    }
    return signatures.some((sig) => sig.every((byte, i) => head[i] === byte));
  } catch {
    return false;
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        /* already closed */
      }
    }
  }
}

/**
 * Reject a stored upload whose bytes contradict its extension.
 *
 * Runs after multer has written the file, because the signature is only
 * readable once there is a file to read. Deletes the temp file on rejection so
 * a probing attacker cannot fill the disk.
 */
export function assertUploadContent(file) {
  if (!file?.path) return;
  const ext = path.extname(file.originalname).toLowerCase().replace(/^\./, '');
  if (contentMatchesExtension(file.path, ext)) return;
  try {
    fs.unlinkSync(file.path);
  } catch {
    /* nothing more to do */
  }
  const err = new Error('Unsupported file type');
  err.status = 415;
  throw err;
}

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

export function cloudinaryConfigured() {
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

/**
 * Where uploaded files live: `cloudinary` or `local`.
 *
 * Local storage was previously refused outright in production, with the reason
 * "Render disk is ephemeral". That is true of Render and false of cPanel, where
 * the account's disk is exactly as durable as the database — so the check
 * blocked the one host where local files are perfectly safe.
 *
 * `MEDIA_DRIVER` makes the choice explicit rather than inferring it from
 * whether Cloudinary credentials happen to be present. Production must state
 * one or the other; there is no silent fallback that could put files somewhere
 * the operator did not intend.
 */
export function mediaDriver() {
  const configured = String(process.env.MEDIA_DRIVER || '').trim().toLowerCase();
  if (configured === 'local' || configured === 'cloudinary') return configured;
  return cloudinaryConfigured() ? 'cloudinary' : 'local';
}

/** Web-served upload root. Everything here is public by design. */
const PUBLIC_ROOT = path.resolve(process.env.UPLOAD_DIR || 'uploads');
/**
 * Private upload root — deliberately NOT under the directory server.js serves
 * statically, so no path under it is reachable over HTTP at all. Résumés live
 * here on the local driver and are streamed only by the authorised, audited
 * download endpoint (MEL2-SEC-004).
 */
const PRIVATE_ROOT = path.resolve(process.env.PRIVATE_UPLOAD_DIR || 'storage/private');

/**
 * Folders whose contents are personal data and must never be delivered from a
 * public URL. On Cloudinary they use the `authenticated` delivery type; on the
 * local driver they are written under PRIVATE_ROOT.
 */
const PRIVATE_FOLDERS = new Set(['resumes']);

export function isPrivateFolder(folder) {
  return PRIVATE_FOLDERS.has(String(folder || ''));
}

/** A safe single path segment — no traversal, no separators. */
function safeSegment(value, fallback) {
  const cleaned = String(value || '').replace(/[^A-Za-z0-9._-]/g, '');
  return cleaned && cleaned !== '.' && cleaned !== '..' ? cleaned : fallback;
}

/**
 * Move a completed upload into its final directory on the local driver.
 *
 * @returns {{url: string, storedPath: string}} `url` is a web path for public
 *   files and a non-resolvable `private:` marker for private ones, so a private
 *   file can never be rendered as a link by accident.
 */
function storeLocally(file, folder) {
  const isPrivate = isPrivateFolder(folder);
  const root = isPrivate ? PRIVATE_ROOT : PUBLIC_ROOT;
  const dirName = safeSegment(folder, 'general');
  const targetDir = path.join(root, dirName);
  fs.mkdirSync(targetDir, { recursive: true });

  const fileName = safeSegment(path.basename(file.path), `${Date.now()}`);
  const target = path.join(targetDir, fileName);
  fs.renameSync(file.path, target);

  if (isPrivate) {
    // Relative to PRIVATE_ROOT, so the record survives the account being moved
    // to a different absolute path.
    return { url: `private:${dirName}/${fileName}`, storedPath: `${dirName}/${fileName}` };
  }
  return { url: `/uploads/${dirName}/${fileName}`, storedPath: `${dirName}/${fileName}` };
}

/**
 * Resolve a private local media row to a real path, refusing anything that
 * escapes PRIVATE_ROOT.
 */
export function privateMediaPath(media) {
  const relative = String(media?.path || '').replace(/^private:/, '');
  if (!relative) return null;
  const resolved = path.resolve(PRIVATE_ROOT, relative);
  // Path traversal guard: a stored value of "../../.env" must not resolve.
  if (resolved !== PRIVATE_ROOT && !resolved.startsWith(PRIVATE_ROOT + path.sep)) {
    return null;
  }
  return fs.existsSync(resolved) ? resolved : null;
}

export { PUBLIC_ROOT as UPLOAD_ROOT, PRIVATE_ROOT as PRIVATE_UPLOAD_ROOT };

export async function saveMedia(file, userId = null, folder = 'general') {
  // Throws 415 and removes the temp file if the bytes contradict the extension.
  assertUploadContent(file);

  let url;
  let storedPath = file.path;
  let publicId = null;
  const isPrivate = isPrivateFolder(folder);
  const driver = mediaDriver();

  if (driver === 'cloudinary') {
    if (!cloudinaryConfigured()) {
      throw new Error(
        'MEDIA_DRIVER=cloudinary but CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET are not all set.'
      );
    }
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: `${process.env.CLOUDINARY_FOLDER || 'melkaoda-hospital'}/${folder}`,
        resource_type: isPrivate ? 'raw' : 'auto',
        // `authenticated` refuses unsigned delivery. A CV carries a home
        // address, a date of birth and an employment history; it must not sit
        // behind a URL that works for anyone who ever sees it.
        ...(isPrivate ? { type: 'authenticated', access_mode: 'authenticated' } : {}),
      });
      url = result.secure_url;
      storedPath = result.secure_url;
      publicId = result.public_id;
    } finally {
      // The temp file used to leak onto the container disk whenever the upload
      // threw, because the unlink sat after the call that failed.
      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch {
        /* the file is already gone, or the disk is read-only; not fatal */
      }
    }
  } else {
    // Local driver. Durable on cPanel; include `uploads/` and `storage/` in the
    // backup routine, because nothing else will.
    try {
      const stored = storeLocally(file, folder);
      url = stored.url;
      storedPath = stored.storedPath;
    } catch (err) {
      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch {
        /* nothing more to do */
      }
      throw err;
    }
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

  // `cloudinary_public_id`, `cloudinary_resource_type` and `is_private` were
  // added to the schema for exactly this purpose but were never written: the
  // public id is what lets us mint a signed URL and delete the remote asset,
  // and without it a private upload could be neither served nor cleaned up.
  const result = await query(
    `INSERT INTO media (user_id, filename, original_filename, mime_type, size, path, url,
                        cloudinary_public_id, cloudinary_resource_type, is_private,
                        type, folder, created_at, updated_at)
     VALUES (:user_id, :filename, :original_filename, :mime_type, :size, :path, :url,
             :public_id, :resource_type, :is_private,
             :type, :folder, NOW(), NOW())`,
    {
      user_id: userId,
      filename: path.basename(String(storedPath)),
      original_filename: file.originalname,
      mime_type: file.mimetype,
      size: file.size,
      path: storedPath,
      url,
      public_id: publicId,
      resource_type: publicId ? (isPrivate ? 'raw' : 'auto') : null,
      is_private: isPrivate ? 1 : 0,
      type,
      folder,
    }
  );

  return queryOne(`SELECT * FROM media WHERE id = :id`, { id: result.insertId });
}

/**
 * A short-lived signed URL for a private asset.
 *
 * Only ever called from an authorised admin route. Returns null when the row is
 * not private or predates the public-id column, so the caller can say so rather
 * than hand back a URL that will not work.
 *
 * @param {object} media  a row from `media`
 * @param {number} ttlSeconds
 */
export function signedMediaUrl(media, ttlSeconds = 300) {
  if (!media?.cloudinary_public_id || !cloudinaryConfigured()) return null;
  return cloudinary.utils.private_download_url(
    media.cloudinary_public_id,
    // Cloudinary wants the format without the dot.
    String(media.original_filename || '').split('.').pop() || 'pdf',
    {
      resource_type: media.cloudinary_resource_type || 'raw',
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + ttlSeconds,
    }
  );
}

/**
 * Remove the remote asset as well as the row.
 *
 * Deleting a media row used to drop the database record and leave the
 * Cloudinary asset behind forever, with no audit entry (MEL2-OPS-002).
 */
export async function destroyMedia(media) {
  if (media?.cloudinary_public_id && cloudinaryConfigured()) {
    try {
      await cloudinary.uploader.destroy(media.cloudinary_public_id, {
        resource_type: media.cloudinary_resource_type || 'image',
        type: media.is_private ? 'authenticated' : 'upload',
      });
    } catch (err) {
      // A remote delete that fails must not block the local one, but it has to
      // be visible — otherwise orphaned assets accumulate silently.
      console.warn(`[media] cloudinary destroy failed for #${media.id}: ${err.message}`);
    }
  } else if (media?.path && !/^https?:\/\//i.test(String(media.path))) {
    // Local driver: remove the file from disk too, or cPanel accumulates
    // unreferenced uploads until the account fills.
    try {
      const target = media.is_private
        ? privateMediaPath(media)
        : path.resolve(PUBLIC_ROOT, String(media.path).replace(/^\/+/, ''));
      if (target && target.startsWith(media.is_private ? PRIVATE_ROOT : PUBLIC_ROOT)) {
        if (fs.existsSync(target)) fs.unlinkSync(target);
      }
    } catch (err) {
      console.warn(`[media] local delete failed for #${media.id}: ${err.message}`);
    }
  }
  await query(`DELETE FROM media WHERE id = :id`, { id: media.id });
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
