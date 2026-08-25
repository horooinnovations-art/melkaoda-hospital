export function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function created(res, data) {
  return ok(res, data, 201);
}

export function message(res, msg, status = 200) {
  return res.status(status).json({ success: true, message: msg });
}

export function fail(res, msg, status = 400) {
  return res.status(status).json({ success: false, message: msg });
}

export function slugify(text = '') {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseJsonField(value, fallback = null) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function toBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (value === '1' || value === 'true' || value === 'on' || value === 1) return true;
  if (value === '0' || value === 'false' || value === 0) return false;
  return Boolean(value);
}

export function paginate(queryParams = {}, defaults = { page: 1, perPage: 12 }) {
  const pageRaw = queryParams.page ?? defaults.page ?? 1;
  const perPageRaw = queryParams.perPage ?? queryParams.per_page ?? defaults.perPage ?? 12;
  const p = Math.max(1, Number(pageRaw) || 1);
  const pp = Math.min(100, Math.max(1, Number(perPageRaw) || 12));
  return { page: p, perPage: pp, offset: (p - 1) * pp };
}
