import { query, queryOne } from '../config/db.js';
import { ok, fail, paginate } from '../utils/helpers.js';
import { logAudit } from '../services/audit.js';
import { signedMediaUrl, privateMediaPath } from '../services/media.js';
import { validator } from '../utils/validate.js';

/**
 * Read side for the two public forms.
 *
 * `job_applications` and `event_registrations` were written by the public
 * endpoints and read by nothing at all — no route, no page, no export. The
 * hospital advertised jobs and events, collected applicants' and attendees'
 * personal data, and had no way to see it (MEL2-BIZ-001).
 *
 * Résumés are never returned as a URL in a list or detail payload. The file is
 * private in Cloudinary and is reached only through the download endpoint
 * below, which mints a five-minute signed link and writes an audit entry naming
 * who opened whose CV.
 */

const APPLICATION_STATUSES = ['submitted', 'under_review', 'shortlisted', 'rejected', 'hired'];
const REGISTRATION_STATUSES = ['pending', 'confirmed', 'attended', 'cancelled'];

// ─── Job applications ────────────────────────────────────────────────────────

export async function listApplications(req, res) {
  const { page, perPage, offset } = paginate(req.query, { page: 1, perPage: 25 });
  const where = ['1=1'];
  const params = {};

  if (req.query.status) {
    where.push('a.status = :status');
    params.status = req.query.status;
  }
  if (req.query.career_id) {
    where.push('a.career_id = :career_id');
    params.career_id = req.query.career_id;
  }
  const search = String(req.query.search || req.query.q || '').trim();
  if (search) {
    where.push(
      `(a.first_name LIKE :search OR a.last_name LIKE :search OR a.email LIKE :search OR a.phone LIKE :search)`
    );
    params.search = `%${search}%`;
  }

  const whereSql = where.join(' AND ');
  const rows = await query(
    `SELECT a.id, a.career_id, a.first_name, a.last_name, a.email, a.phone,
            a.cover_letter, a.status, a.reviewed_by, a.reviewed_at, a.notes,
            a.created_at, a.updated_at,
            a.resume_media_id,
            c.title AS career_title, c.slug AS career_slug,
            u.name AS reviewer_name
     FROM job_applications a
     LEFT JOIN careers c ON c.id = a.career_id
     LEFT JOIN users u ON u.id = a.reviewed_by
     WHERE ${whereSql}
     ORDER BY a.created_at DESC
     LIMIT ${perPage} OFFSET ${offset}`,
    params
  );
  const totalRow = await queryOne(
    `SELECT COUNT(*) AS total FROM job_applications a WHERE ${whereSql}`,
    params
  );

  for (const row of rows) {
    // A boolean, not a link — the link is minted per download, per request.
    row.has_resume = Boolean(row.resume_media_id);
    delete row.resume_media_id;
    row.career = row.career_id ? { id: row.career_id, title: row.career_title } : null;
  }

  const [statusCounts, careers] = await Promise.all([
    query(`SELECT status, COUNT(*) AS total FROM job_applications GROUP BY status`),
    query(
      `SELECT DISTINCT c.id, c.title
       FROM job_applications a INNER JOIN careers c ON c.id = a.career_id
       ORDER BY c.title ASC`
    ),
  ]);

  return ok(res, {
    data: rows,
    meta: { total: Number(totalRow?.total || 0), page, perPage },
    filters: {
      statuses: APPLICATION_STATUSES,
      counts: Object.fromEntries(statusCounts.map((r) => [r.status, Number(r.total)])),
      careers,
    },
  });
}

export async function showApplication(req, res) {
  const row = await queryOne(
    `SELECT a.*, c.title AS career_title, c.slug AS career_slug, u.name AS reviewer_name
     FROM job_applications a
     LEFT JOIN careers c ON c.id = a.career_id
     LEFT JOIN users u ON u.id = a.reviewed_by
     WHERE a.id = :id LIMIT 1`,
    { id: req.params.id }
  );
  if (!row) return fail(res, 'Application not found', 404);

  row.has_resume = Boolean(row.resume_media_id);
  // Legacy rows carry a relative Laravel path (`resumes/xxx.pdf`) that nothing
  // serves; say so rather than offering a download that will 404.
  row.resume_is_legacy = Boolean(!row.resume_media_id && row.resume_path);
  delete row.resume_media_id;
  delete row.resume_path;

  // Not the generic `view` action: that one is filtered out as page-navigation
  // noise. Opening a named person's application is exactly the access that
  // should leave a trace.
  await logAudit(req, 'view_application', {
    modelType: 'job_applications',
    modelId: row.id,
  });

  return ok(res, row);
}

/**
 * Mint a short-lived signed URL for one applicant's résumé.
 *
 * Every call is audited. This is the only path to the file.
 */
export async function downloadResume(req, res) {
  const application = await queryOne(
    `SELECT id, first_name, last_name, resume_media_id, resume_path
     FROM job_applications WHERE id = :id LIMIT 1`,
    { id: req.params.id }
  );
  if (!application) return fail(res, 'Application not found', 404);

  if (!application.resume_media_id) {
    return fail(
      res,
      application.resume_path
        ? 'This application predates the current file storage and its résumé is no longer available.'
        : 'No résumé was attached to this application.',
      404
    );
  }

  const media = await queryOne(`SELECT * FROM media WHERE id = :id LIMIT 1`, {
    id: application.resume_media_id,
  });
  if (!media) return fail(res, 'The stored file could not be found', 404);

  // Audit before serving, so an access is recorded even if the transfer fails
  // part-way. This is someone's CV; who opened it matters more than whether the
  // download completed.
  await logAudit(req, 'download', {
    modelType: 'job_applications',
    modelId: application.id,
    newValues: { resume_media_id: media.id, filename: media.original_filename },
  });

  // Cloudinary driver: hand back a short-lived signed URL.
  const url = signedMediaUrl(media, 300);
  if (url) {
    return ok(res, { url, filename: media.original_filename, expires_in: 300 });
  }

  // Local driver: the file is under PRIVATE_UPLOAD_ROOT, which nothing serves
  // statically, so stream it from here rather than exposing a path.
  const filePath = privateMediaPath(media);
  if (!filePath) {
    return fail(res, 'This file cannot be served from the current storage', 409);
  }

  const filename = String(media.original_filename || 'resume.pdf').replace(/["\\\r\n]/g, '');
  res.setHeader('Content-Type', media.mime_type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  // Never let a browser sniff a CV into something executable.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.sendFile(filePath);
}

export async function updateApplication(req, res) {
  const existing = await queryOne(
    `SELECT id, status, notes FROM job_applications WHERE id = :id LIMIT 1`,
    { id: req.params.id }
  );
  if (!existing) return fail(res, 'Application not found', 404);

  const status = String(req.body?.status || existing.status);
  if (!APPLICATION_STATUSES.includes(status)) {
    return fail(res, `Status must be one of: ${APPLICATION_STATUSES.join(', ')}`, 422);
  }

  const v = validator(req.body).string('notes', { required: false, max: 5000, label: 'Notes' });
  if (!v.ok) return fail(res, v.message, 422);
  const notes = req.body?.notes !== undefined ? v.values.notes : existing.notes;

  await query(
    `UPDATE job_applications
     SET status = :status, notes = :notes, reviewed_by = :uid, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = :id`,
    { id: existing.id, status, notes: notes ?? null, uid: req.user.id }
  );

  await logAudit(req, 'update', {
    modelType: 'job_applications',
    modelId: existing.id,
    oldValues: { id: existing.id, status: existing.status },
    newValues: { id: existing.id, status },
  });

  const row = await queryOne(
    `SELECT id, status, notes, reviewed_by, reviewed_at FROM job_applications WHERE id = :id`,
    { id: existing.id }
  );
  return ok(res, row);
}

// ─── Event registrations ─────────────────────────────────────────────────────

export async function listRegistrations(req, res) {
  const { page, perPage, offset } = paginate(req.query, { page: 1, perPage: 25 });
  const where = ['1=1'];
  const params = {};

  if (req.query.status) {
    where.push('r.status = :status');
    params.status = req.query.status;
  }
  if (req.query.event_id) {
    where.push('r.event_id = :event_id');
    params.event_id = req.query.event_id;
  }
  const search = String(req.query.search || req.query.q || '').trim();
  if (search) {
    where.push(
      `(r.name LIKE :search OR r.email LIKE :search OR r.phone LIKE :search OR r.organization LIKE :search)`
    );
    params.search = `%${search}%`;
  }

  const whereSql = where.join(' AND ');
  const rows = await query(
    `SELECT r.*, e.title AS event_title, e.slug AS event_slug, e.event_date
     FROM event_registrations r
     LEFT JOIN events e ON e.id = r.event_id
     WHERE ${whereSql}
     ORDER BY r.created_at DESC
     LIMIT ${perPage} OFFSET ${offset}`,
    params
  );
  const totalRow = await queryOne(
    `SELECT COUNT(*) AS total FROM event_registrations r WHERE ${whereSql}`,
    params
  );

  for (const row of rows) {
    row.event = row.event_id ? { id: row.event_id, title: row.event_title } : null;
  }

  const [statusCounts, events] = await Promise.all([
    query(`SELECT status, COUNT(*) AS total FROM event_registrations GROUP BY status`),
    query(
      `SELECT DISTINCT e.id, e.title
       FROM event_registrations r INNER JOIN events e ON e.id = r.event_id
       ORDER BY e.title ASC`
    ),
  ]);

  return ok(res, {
    data: rows,
    meta: { total: Number(totalRow?.total || 0), page, perPage },
    filters: {
      statuses: REGISTRATION_STATUSES,
      counts: Object.fromEntries(statusCounts.map((r) => [r.status, Number(r.total)])),
      events,
    },
  });
}

export async function updateRegistration(req, res) {
  const existing = await queryOne(
    `SELECT id, status, notes FROM event_registrations WHERE id = :id LIMIT 1`,
    { id: req.params.id }
  );
  if (!existing) return fail(res, 'Registration not found', 404);

  const status = String(req.body?.status || existing.status);
  if (!REGISTRATION_STATUSES.includes(status)) {
    return fail(res, `Status must be one of: ${REGISTRATION_STATUSES.join(', ')}`, 422);
  }

  const v = validator(req.body).string('notes', { required: false, max: 5000, label: 'Notes' });
  if (!v.ok) return fail(res, v.message, 422);
  const notes = req.body?.notes !== undefined ? v.values.notes : existing.notes;

  await query(
    `UPDATE event_registrations SET status = :status, notes = :notes, updated_at = NOW() WHERE id = :id`,
    { id: existing.id, status, notes: notes ?? null }
  );

  await logAudit(req, 'update', {
    modelType: 'event_registrations',
    modelId: existing.id,
    oldValues: { id: existing.id, status: existing.status },
    newValues: { id: existing.id, status },
  });

  return ok(res, await queryOne(`SELECT * FROM event_registrations WHERE id = :id`, { id: existing.id }));
}

export { APPLICATION_STATUSES, REGISTRATION_STATUSES };
