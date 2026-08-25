import { createCrud } from './crudFactory.js';
import { query, queryOne } from '../config/db.js';
import { ok, fail, toBool, paginate, parseJsonField } from '../utils/helpers.js';
import { normalizeMediaUrl } from '../utils/mediaUrl.js';
import { slugLookupCandidates } from '../utils/settings.js';

const WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

function normalizeDateTime(value) {
  if (typeof value !== 'string') return value;
  return value.includes('T') ? value.replace('T', ' ') : value;
}

function parseList(value, separator = /\r?\n/) {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'object') return value;
  const text = String(value).trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // Fall through to delimited text parsing.
  }
  return text
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function jsonArrayText(value, separator = /\r?\n/) {
  const parsed = parseList(value, separator);
  if (parsed === undefined) return undefined;
  return JSON.stringify(Array.isArray(parsed) ? parsed : []);
}

function normalizeJsonObjectText(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'object') return JSON.stringify(value);
  const text = String(value).trim();
  if (!text) return JSON.stringify({});
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed && typeof parsed === 'object' ? parsed : {});
  } catch {
    return JSON.stringify({});
  }
}

function normalizeDateTimeFields(data, fields) {
  for (const field of fields) {
    if (data[field]) data[field] = normalizeDateTime(data[field]);
  }
}

function normalizeLineJsonFields(data, fields) {
  for (const field of fields) {
    if (data[field] !== undefined) data[field] = jsonArrayText(data[field]);
  }
}

function normalizeCsvJsonFields(data, fields) {
  for (const field of fields) {
    if (data[field] !== undefined) data[field] = jsonArrayText(data[field], ',');
  }
}

function normalizeDoctorSchedule(data) {
  const schedule = {};
  for (const day of WEEK_DAYS) {
    const key = `availability_${day}`;
    if (data[key] !== undefined && String(data[key]).trim()) {
      schedule[day] = String(data[key]).trim();
    }
    delete data[key];
  }

  if (Object.keys(schedule).length) {
    data.availability_schedule = JSON.stringify(schedule);
  } else if (data.availability_schedule !== undefined) {
    data.availability_schedule = normalizeJsonObjectText(data.availability_schedule);
  }
}

function normalizeIdList(value) {
  if (value === undefined || value === null || value === '') return [];
  const raw = Array.isArray(value) ? value : [value];
  return [
    ...new Set(
      raw
        .flatMap((item) => String(item).split(','))
        .map((item) => Number(item))
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];
}

async function syncDoctorSpecializations(doctorId, value) {
  const ids = normalizeIdList(value);
  try {
    await query(`DELETE FROM doctor_specializations WHERE doctor_id = :doctorId`, { doctorId });
    for (const specializationId of ids) {
      await query(
        `INSERT IGNORE INTO doctor_specializations (doctor_id, specialization_id, created_at, updated_at)
         VALUES (:doctorId, :specializationId, NOW(), NOW())`,
        { doctorId, specializationId }
      );
    }
  } catch (err) {
    // Older deployments may not have the pivot table yet; the doctor record should still save.
    if (err?.code !== 'ER_NO_SUCH_TABLE') throw err;
  }
}

async function attachDoctorSpecializations(rows) {
  const ids = rows.map((row) => row.id).filter(Boolean);
  if (!ids.length) return;
  const placeholders = ids.map((_, i) => `:doc${i}`).join(', ');
  const params = Object.fromEntries(ids.map((id, i) => [`doc${i}`, id]));
  try {
    const specs = await query(
      `SELECT ds.doctor_id, s.id, s.name, s.slug
       FROM doctor_specializations ds
       INNER JOIN specializations s ON s.id = ds.specialization_id
       WHERE ds.doctor_id IN (${placeholders})`,
      params
    );
    const byDoctor = {};
    for (const spec of specs) {
      if (!byDoctor[spec.doctor_id]) byDoctor[spec.doctor_id] = [];
      byDoctor[spec.doctor_id].push({ id: spec.id, name: spec.name, slug: spec.slug });
    }
    for (const row of rows) {
      row.specializations = byDoctor[row.id] || [];
    }
  } catch (err) {
    if (err?.code !== 'ER_NO_SUCH_TABLE') throw err;
  }
}

function option(label, value) {
  return { label: String(label), value: String(value) };
}

async function safeOptions(res, loader) {
  try {
    return ok(res, await loader());
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.code === 'ER_BAD_FIELD_ERROR') {
      return ok(res, []);
    }
    console.error(err);
    return fail(res, err.message, 500);
  }
}

export const departments = createCrud({
  table: 'departments',
  slugFrom: 'name',
  mediaField: 'featured_image_id',
  mediaAs: 'featured_image',
  mediaFolder: 'departments',
  publicFilter: 'is_active = 1',
  searchable: ['name', 'description', 'short_description'],
  orderBy: '`order` ASC, name ASC',
  mapIncoming: async (data, _req, mode) => {
    if (mode === 'create' && data.is_active === undefined) data.is_active = 1;
    if (data.category_id === '') data.category_id = null;
    if (data.head_doctor_id === '') data.head_doctor_id = null;
    return data;
  },
});

export const departmentCategories = createCrud({
  table: 'department_categories',
  softDelete: false,
  slugFrom: 'name',
  publicFilter: 'is_active = 1',
  searchable: ['name'],
  orderBy: '`order` ASC, name ASC',
  mapIncoming: async (data, _req, mode) => {
    if (mode === 'create' && data.is_active === undefined) data.is_active = 1;
    return data;
  },
});

export const partnershipCategories = createCrud({
  table: 'partnership_categories',
  softDelete: false,
  slugFrom: 'name',
  publicFilter: 'is_active = 1',
  searchable: ['name'],
  orderBy: '`order` ASC, name ASC',
});

export async function listPartnershipCategories(req, res) {
  try {
    const rows = await query(
      "SELECT name FROM `partnership_categories` WHERE is_active = 1 ORDER BY `order` ASC, name ASC"
    );
    const options = rows.map((row) => ({ label: row.name, value: row.name }));
    return ok(res, options);
  } catch (err) {
    console.error(err);
    return fail(res, err.message, 500);
  }
}

export async function listDepartmentOptions(_req, res) {
  return safeOptions(res, async () => {
    const rows = await query(
      `SELECT id, name
       FROM departments
       WHERE deleted_at IS NULL AND COALESCE(is_active, 1) = 1
       ORDER BY \`order\` ASC, name ASC`
    );
    return rows.map((row) => option(`#${row.id} - ${row.name}`, row.id));
  });
}

export async function listDepartmentCategoryOptions(_req, res) {
  return safeOptions(res, async () => {
    const rows = await query(
      `SELECT id, name
       FROM department_categories
       WHERE COALESCE(is_active, 1) = 1
       ORDER BY \`order\` ASC, name ASC`
    );
    return rows.map((row) => option(row.name, row.id));
  });
}

export async function listDoctorOptions(_req, res) {
  return safeOptions(res, async () => {
    const rows = await query(
      `SELECT id, title, first_name, last_name, designation
       FROM doctors
       WHERE deleted_at IS NULL AND COALESCE(is_available, 1) = 1
       ORDER BY first_name ASC, last_name ASC`
    );
    return rows.map((row) => {
      const name = [row.title, row.first_name, row.last_name].filter(Boolean).join(' ');
      const label = row.designation ? `${name} (${row.designation})` : name;
      return option(label, row.id);
    });
  });
}

export async function listSpecializationOptions(_req, res) {
  return safeOptions(res, async () => {
    const rows = await query(
      `SELECT id, name
       FROM specializations
       WHERE COALESCE(is_active, 1) = 1
       ORDER BY name ASC`
    );
    return rows.map((row) => option(row.name, row.id));
  });
}

export async function listCategoryOptions(_req, res) {
  return safeOptions(res, async () => {
    const rows = await query(
      `SELECT id, name
       FROM categories
       ORDER BY name ASC`
    );
    return rows.map((row) => option(row.name, row.id));
  });
}

export const doctors = createCrud({
  table: 'doctors',
  slugFrom: 'last_name',
  mediaField: 'photo_id',
  mediaFolder: 'doctors',
  publicFilter: 'is_available = 1',
  searchable: ['first_name', 'last_name', 'designation', 'title'],
  jsonFields: ['education', 'certifications', 'languages', 'availability_schedule'],
  orderBy: '`order` ASC, last_name ASC',
  mapIncoming: async (data, _req, mode) => {
    if (data.first_name && data.last_name && !data.slug) {
      data.slug = `${data.first_name}-${data.last_name}`.toLowerCase().replace(/\s+/g, '-');
    }
    normalizeLineJsonFields(data, ['education', 'certifications']);
    normalizeCsvJsonFields(data, ['languages']);
    normalizeDoctorSchedule(data);
    if (data.department_id === '') data.department_id = null;
    if (data.category_id === '') data.category_id = null;
    if (mode === 'create' && data.is_available === undefined) data.is_available = 1;
    if (mode === 'create' && data.is_featured === undefined) data.is_featured = 0;
    return data;
  },
  afterSave: async (row, data) => {
    if (!row?.id || data.specializations === undefined) return;
    await syncDoctorSpecializations(row.id, data.specializations);
  },
  afterFetch: async (rows) => {
    const ids = [...new Set(rows.map((r) => r.department_id).filter(Boolean))];
    if (ids.length) {
      const placeholders = ids.map((_, i) => `:d${i}`).join(', ');
      const params = Object.fromEntries(ids.map((id, i) => [`d${i}`, id]));
      const depts = await query(
        `SELECT id, name, slug FROM departments WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
        params
      );
      const byId = Object.fromEntries(depts.map((d) => [d.id, d]));
      for (const row of rows) {
        row.department = row.department_id ? byId[row.department_id] || null : null;
      }
    }
    await attachDoctorSpecializations(rows);
  },
});

export const services = createCrud({
  table: 'services',
  slugFrom: 'name',
  mediaField: 'featured_image_id',
  mediaAs: 'featured_image',
  mediaFolder: 'services',
  publicFilter: 'is_available = 1',
  searchable: ['name', 'description', 'short_description'],
  mapIncoming: async (data, _req, mode) => {
    if (data.department_id === '') data.department_id = null;
    if (mode === 'create' && data.is_available === undefined) data.is_available = 1;
    if (mode === 'create' && data.requires_appointment === undefined) data.requires_appointment = 1;
    return data;
  },
});

export const specializations = createCrud({
  table: 'specializations',
  softDelete: false,
  slugFrom: 'name',
  publicFilter: 'is_active = 1',
  searchable: ['name'],
  orderBy: 'name ASC',
  mapIncoming: async (data, _req, mode) => {
    if (mode === 'create' && data.is_active === undefined) data.is_active = 1;
    return data;
  },
});

export const leadership = createCrud({
  table: 'leadership',
  slugFrom: 'name',
  mediaField: 'photo_id',
  mediaFolder: 'leadership',
  publicFilter: 'is_active = 1',
  searchable: ['name', 'position'],
  jsonFields: ['education', 'certifications'],
  orderBy: '`order` ASC, id ASC',
  mapIncoming: async (data, _req, mode) => {
    normalizeLineJsonFields(data, ['education', 'certifications']);
    if (mode === 'create' && data.is_active === undefined) data.is_active = 1;
    if (mode === 'create' && data.is_featured === undefined) data.is_featured = 0;
    return data;
  },
});

export const leadershipHistory = createCrud({
  table: 'leadership_history',
  slugFrom: 'name',
  mediaField: 'photo_id',
  mediaFolder: 'leadership-history',
  publicFilter: 'is_active = 1',
  searchable: ['name', 'position'],
  jsonFields: ['education', 'achievements'],
  orderBy: 'tenure_start ASC, `order` ASC, id ASC',
  mapIncoming: async (data) => {
    normalizeLineJsonFields(data, ['education', 'achievements']);
    return data;
  },
});

export const news = createCrud({
  table: 'news',
  slugFrom: 'title',
  mediaField: 'featured_image_id',
  mediaAs: 'featured_image',
  mediaFolder: 'news',
  publicFilter: "status = 'published'",
  searchable: ['title', 'excerpt', 'content'],
  orderBy: 'published_at DESC, id DESC',
  mapIncoming: async (data, req, mode) => {
    if (mode === 'create' && !data.author_id && req.user) data.author_id = req.user.id;
    if (data.category_id === '') data.category_id = null;
    normalizeDateTimeFields(data, ['published_at']);
    if (mode === 'create' && !data.status) data.status = 'draft';
    if (data.status === 'published' && !data.published_at) {
      data.published_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
    if (data.is_featured !== undefined) data.is_featured = toBool(data.is_featured);
    return data;
  },
});

export const announcements = createCrud({
  table: 'announcements',
  slugFrom: 'title',
  mediaField: 'featured_image_id',
  mediaAs: 'featured_image',
  mediaFolder: 'announcements',
  publicFilter: "status = 'published'",
  searchable: ['title', 'excerpt', 'content'],
  orderBy: 'is_pinned DESC, published_at DESC, id DESC',
  mapIncoming: async (data, req, mode) => {
    if (mode === 'create' && !data.created_by && req.user) data.created_by = req.user.id;
    data.updated_by = req.user?.id;
    normalizeDateTimeFields(data, ['published_at', 'expires_at']);
    if (mode === 'create' && !data.type) data.type = 'announcement';
    if (mode === 'create' && !data.priority) data.priority = 'normal';
    if (mode === 'create' && !data.status) data.status = 'draft';
    if (data.status === 'published' && !data.published_at) {
      data.published_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
    return data;
  },
});

export const gallery = createCrud({
  table: 'gallery',
  softDelete: false,
  slugFrom: 'title',
  mediaField: 'media_id',
  mediaAs: 'media',
  mediaFolder: 'gallery',
  publicFilter: "COALESCE(type, 'image') = 'image'",
  searchable: ['title', 'description'],
  orderBy: '`order` ASC, id DESC',
  mapIncoming: async (data, _req, mode) => {
    if (mode === 'create') {
      if (!data.type) data.type = 'image';
    }
    if (data.category_id === '') data.category_id = null;
    return data;
  },
});

export const pages = createCrud({
  table: 'pages',
  slugFrom: 'title',
  mediaField: 'featured_image_id',
  mediaAs: 'featured_image',
  mediaFolder: 'pages',
  publicFilter: "status = 'published'",
  searchable: ['title', 'content', 'excerpt'],
  orderBy: '`order` ASC, id DESC',
  mapIncoming: async (data, req, mode) => {
    if (mode === 'create') data.created_by = req.user?.id;
    data.updated_by = req.user?.id;
    if (mode === 'create' && !data.status) data.status = 'draft';
    return data;
  },
});

export const events = createCrud({
  table: 'events',
  softDelete: false,
  slugFrom: 'title',
  mediaField: 'featured_image_id',
  mediaAs: 'featured_image',
  mediaFolder: 'events',
  publicFilter: "status IN ('upcoming','ongoing','completed')",
  searchable: ['title', 'description', 'location'],
  orderBy: 'event_date DESC',
  mapIncoming: async (data, req, mode) => {
    if (mode === 'create') data.created_by = req.user?.id;
    if (mode === 'create' && !data.status) data.status = 'upcoming';
    if (data.registration_required === undefined && mode === 'create') {
      data.registration_required = 0;
    }
    for (const field of ['event_time', 'end_time']) {
      if (data[field] === '') data[field] = null;
    }
    return data;
  },
});

export const careers = createCrud({
  table: 'careers',
  slugFrom: 'title',
  publicFilter: "status = 'open'",
  searchable: ['title', 'department', 'description'],
  orderBy: 'created_at DESC',
  mapIncoming: async (data, _req, mode) => {
    if (mode === 'create' && !data.employment_type) data.employment_type = 'full_time';
    if (mode === 'create' && !data.experience_level) data.experience_level = 'entry';
    if (mode === 'create' && !data.status) data.status = 'open';
    return data;
  },
});

export const testimonials = createCrud({
  table: 'testimonials',
  softDelete: false,
  mediaField: 'patient_photo_id',
  mediaAs: 'patient_photo',
  mediaFolder: 'testimonials',
  publicFilter: 'is_approved = 1',
  searchable: ['patient_name', 'content'],
  orderBy: '`order` ASC, id DESC',
  mapIncoming: async (data, _req, mode) => {
    if (data.department_id === '') data.department_id = null;
    if (data.doctor_id === '') data.doctor_id = null;
    if (mode === 'create' && data.rating === undefined) data.rating = 5;
    if (mode === 'create' && data.is_approved === undefined) data.is_approved = 0;
    if (mode === 'create' && data.is_featured === undefined) data.is_featured = 0;
    return data;
  },
});

export const faqs = createCrud({
  table: 'faqs',
  softDelete: false,
  publicFilter: 'is_active = 1',
  searchable: ['question', 'answer'],
  orderBy: '`order` ASC, id ASC',
});

export const insurance = createCrud({
  table: 'insurance',
  softDelete: false,
  slugFrom: 'name',
  mediaField: 'logo_id',
  mediaAs: 'logo',
  mediaFolder: 'insurance',
  publicFilter: 'is_active = 1',
  searchable: ['name', 'description'],
  orderBy: 'name ASC',
  mapIncoming: async (data, _req, mode) => {
    if (mode === 'create' && data.is_active === undefined) data.is_active = 1;
    return data;
  },
});

export const emergencyServices = createCrud({
  table: 'emergency_services',
  slugFrom: 'title',
  mediaField: 'featured_image_id',
  mediaAs: 'featured_image',
  mediaFolder: 'emergency',
  publicFilter: 'is_active = 1',
  searchable: ['title', 'description', 'short_description'],
  jsonFields: ['services_offered', 'procedures'],
  mapIncoming: async (data, _req, mode) => {
    normalizeLineJsonFields(data, ['services_offered', 'procedures']);
    if (mode === 'create' && data.is_active === undefined) data.is_active = 1;
    if (mode === 'create' && data.is_featured === undefined) data.is_featured = 0;
    if (mode === 'create' && data.is_24_hours === undefined) data.is_24_hours = 0;
    return data;
  },
});

export const healthEducation = createCrud({
  table: 'health_education',
  slugFrom: 'title',
  mediaField: 'featured_image_id',
  mediaAs: 'featured_image',
  mediaFolder: 'health-education',
  publicFilter: "status = 'published'",
  searchable: ['title', 'excerpt', 'content'],
  jsonFields: ['tags'],
  orderBy: 'published_at DESC, id DESC',
  mapIncoming: async (data, req, mode) => {
    if (mode === 'create' && !data.author_id) data.author_id = req.user?.id;
    normalizeDateTimeFields(data, ['published_at']);
    normalizeCsvJsonFields(data, ['tags']);
    if (mode === 'create' && !data.status) data.status = 'draft';
    if (data.status === 'published' && !data.published_at) {
      data.published_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
    return data;
  },
});

export const users = createCrud({
  table: 'users',
  searchable: ['name', 'email'],
  orderBy: 'id DESC',
  mapIncoming: async (data) => {
    // password hashing handled in dedicated route when needed
    delete data.password;
    return data;
  },
  afterFetch: async (rows) => {
    for (const row of rows) {
      delete row.password;
      delete row.remember_token;
      if (row.avatar) row.avatar = normalizeMediaUrl(row.avatar);
    }
  },
});

export const roles = createCrud({
  table: 'roles',
  softDelete: false,
  slugFrom: 'name',
  searchable: ['name', 'slug'],
  orderBy: 'id ASC',
});

export const permissions = createCrud({
  table: 'permissions',
  softDelete: false,
  slugFrom: 'name',
  searchable: ['name', 'slug', 'module'],
  orderBy: 'module ASC, id ASC',
});

export async function listMedia(req, res) {
  const { page = 1, perPage = 24 } = req.query;
  const offset = (Math.max(1, Number(page)) - 1) * Number(perPage);
  const rows = await query(
    `SELECT * FROM media ORDER BY created_at DESC LIMIT ${Number(perPage)} OFFSET ${offset}`
  );
  const total = await query(`SELECT COUNT(*) AS total FROM media`);
  return res.json({
    success: true,
    data: { data: rows, meta: { total: total[0].total, page: Number(page), perPage: Number(perPage) } },
  });
}

export async function listAuditLogs(req, res) {
  try {
    const { page, perPage, offset } = paginate(req.query, { page: 1, perPage: 50 });
    const where = ['1=1'];
    const params = {};

    if (req.query.user_id) {
      where.push('a.user_id = :user_id');
      params.user_id = req.query.user_id;
    }
    if (req.query.action) {
      where.push('a.action = :action');
      params.action = req.query.action;
    }
    if (req.query.model_type) {
      where.push('a.model_type = :model_type');
      params.model_type = req.query.model_type;
    }
    if (req.query.date_from) {
      where.push('DATE(a.created_at) >= :date_from');
      params.date_from = req.query.date_from;
    }
    if (req.query.date_to) {
      where.push('DATE(a.created_at) <= :date_to');
      params.date_to = req.query.date_to;
    }
    if (req.query.search) {
      where.push(
        `(a.action LIKE :search OR a.model_type LIKE :search OR a.ip_address LIKE :search OR u.name LIKE :search OR u.email LIKE :search)`
      );
      params.search = `%${req.query.search}%`;
    }

    const whereSql = where.join(' AND ');
    const rows = await query(
      `SELECT a.*, u.name AS user_name, u.email AS user_email
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE ${whereSql}
       ORDER BY a.created_at DESC
       LIMIT ${perPage} OFFSET ${offset}`,
      params
    );
    const totalRow = await queryOne(
      `SELECT COUNT(*) AS total
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE ${whereSql}`,
      params
    );

    const [actions, models, users] = await Promise.all([
      query(`SELECT DISTINCT action FROM audit_logs WHERE action IS NOT NULL ORDER BY action ASC`),
      query(
        `SELECT DISTINCT model_type FROM audit_logs WHERE model_type IS NOT NULL AND model_type != '' ORDER BY model_type ASC`
      ),
      query(
        `SELECT DISTINCT u.id, u.name, u.email
         FROM audit_logs a
         INNER JOIN users u ON u.id = a.user_id
         ORDER BY u.name ASC
         LIMIT 200`
      ),
    ]);

    for (const row of rows) {
      row.old_values = parseJsonField(row.old_values, row.old_values);
      row.new_values = parseJsonField(row.new_values, row.new_values);
      row.changes = parseJsonField(row.changes, row.changes);
      row.request_data = parseJsonField(row.request_data, row.request_data);
      row.user = row.user_id
        ? { id: row.user_id, name: row.user_name, email: row.user_email }
        : null;
    }

    return ok(res, {
      data: rows,
      meta: { total: Number(totalRow?.total || 0), page, perPage },
      filters: {
        actions: actions.map((r) => r.action),
        model_types: models.map((r) => r.model_type),
        users,
      },
    });
  } catch (err) {
    console.error(err);
    return fail(res, err.message, 500);
  }
}

export async function showAuditLog(req, res) {
  try {
    const row = await queryOne(
      `SELECT a.*, u.name AS user_name, u.email AS user_email
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.id = :id
       LIMIT 1`,
      { id: req.params.id }
    );
    if (!row) return fail(res, 'Audit log not found', 404);

    row.old_values = parseJsonField(row.old_values, row.old_values);
    row.new_values = parseJsonField(row.new_values, row.new_values);
    row.changes = parseJsonField(row.changes, row.changes);
    row.request_data = parseJsonField(row.request_data, row.request_data);
    row.user = row.user_id
      ? { id: row.user_id, name: row.user_name, email: row.user_email }
      : null;

    return ok(res, row);
  } catch (err) {
    console.error(err);
    return fail(res, err.message, 500);
  }
}

export async function applyCareer(req, res) {
  try {
    let career = [];
    for (const candidate of slugLookupCandidates(req.params.slug)) {
      career = await query(
        `SELECT * FROM careers WHERE LOWER(slug) = LOWER(?) AND status = 'open' AND deleted_at IS NULL LIMIT 1`,
        [candidate]
      );
      if (career[0]) break;
    }
    if (!career[0]) return res.status(404).json({ success: false, message: 'Job not found' });

    const { first_name, last_name, email, phone, cover_letter } = req.body;
    let resume_path = null;
    if (req.file) {
      const { saveMedia } = await import('../services/media.js');
      const media = await saveMedia(req.file, null, 'resumes');
      resume_path = media.url;
    }
    if (!first_name || !last_name || !email || !phone || !resume_path) {
      return res.status(422).json({ success: false, message: 'Missing required application fields' });
    }

    await query(
      `INSERT INTO job_applications (career_id, first_name, last_name, email, phone, resume_path, cover_letter, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', NOW(), NOW())`,
      [career[0].id, first_name, last_name, email, phone, resume_path, cover_letter || null]
    );
    return res.status(201).json({ success: true, message: 'Application submitted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function registerEvent(req, res) {
  try {
    let events = [];
    for (const candidate of slugLookupCandidates(req.params.slug)) {
      events = await query(`SELECT * FROM events WHERE LOWER(slug) = LOWER(?) LIMIT 1`, [candidate]);
      if (events[0]) break;
    }
    if (!events[0]) return res.status(404).json({ success: false, message: 'Event not found' });
    const { name, email, phone, organization, notes } = req.body;
    if (!name || !email || !phone) {
      return res.status(422).json({ success: false, message: 'Name, email and phone required' });
    }
    await query(
      `INSERT INTO event_registrations (event_id, name, email, phone, organization, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())`,
      [events[0].id, name, email, phone, organization || null, notes || null]
    );
    return res.status(201).json({ success: true, message: 'Registration submitted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
