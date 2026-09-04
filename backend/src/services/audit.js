import { query } from '../config/db.js';

function scrubRequestData(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = { ...raw };
  for (const key of Object.keys(out)) {
    if (/password|token|secret|authorization|cookie/i.test(key)) {
      out[key] = '[redacted]';
    }
  }
  return out;
}

function computeChanges(oldValues = {}, newValues = {}) {
  const changes = {};
  for (const [key, value] of Object.entries(newValues || {})) {
    if (['password', 'remember_token'].includes(key)) continue;
    const prev = oldValues?.[key];
    if (prev !== undefined && String(prev) !== String(value)) {
      changes[key] = { old: prev, new: value };
    }
  }
  return Object.keys(changes).length ? changes : null;
}

/**
 * Actions not worth a row.
 *
 * `view` and `dashboard_view` made up 63% of the audit table and told nobody
 * anything — they buried the entries that matter (who changed what, who signed
 * in, who opened an applicant's file) under page-navigation noise
 * (MEL2-SEC-010). Set AUDIT_LOG_VIEWS=1 to record them anyway.
 */
const NOISY_ACTIONS = new Set(['view', 'dashboard_view']);

function shouldRecord(action) {
  if (!NOISY_ACTIONS.has(action)) return true;
  return process.env.AUDIT_LOG_VIEWS === '1' || process.env.AUDIT_LOG_VIEWS === 'true';
}

/**
 * Audit trail. Never throws — auditing must not break the request it records.
 */
export async function logAudit(req, action, {
  modelType = null,
  modelId = null,
  oldValues = null,
  newValues = null,
  userId = undefined,
  extra = {},
} = {}) {
  try {
    if (!shouldRecord(String(action || ''))) return;

    const changes =
      action === 'update' && oldValues && newValues
        ? computeChanges(oldValues, newValues)
        : null;

    await query(
      `INSERT INTO audit_logs (
         user_id, action, model_type, model_id,
         old_values, new_values, changes,
         ip_address, user_agent, url, method, request_data, response_status,
         created_at, updated_at
       ) VALUES (
         :user_id, :action, :model_type, :model_id,
         :old_values, :new_values, :changes,
         :ip_address, :user_agent, :url, :method, :request_data, :response_status,
         NOW(), NOW()
       )`,
      {
        user_id: userId !== undefined ? userId : req?.user?.id || null,
        action: String(action || 'unknown').slice(0, 50),
        model_type: modelType ? String(modelType).slice(0, 100) : null,
        model_id: modelId != null ? Number(modelId) : null,
        old_values: oldValues ? JSON.stringify(oldValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null,
        changes: changes ? JSON.stringify(changes) : null,
        ip_address: String(req?.ip || req?.headers?.['x-forwarded-for'] || '0.0.0.0').slice(0, 45),
        user_agent: req?.headers?.['user-agent'] ? String(req.headers['user-agent']).slice(0, 2000) : null,
        url: req?.originalUrl ? String(req.originalUrl).slice(0, 500) : null,
        method: req?.method ? String(req.method).slice(0, 10) : null,
        request_data: JSON.stringify(scrubRequestData(req?.body) || {}),
        response_status: extra.response_status != null ? Number(extra.response_status) : 200,
      }
    );
  } catch (err) {
    console.warn('[audit] log failed:', err.message);
  }
}

export async function logLogin(req, user, success = true) {
  await logAudit(req, success ? 'login' : 'login_failed', {
    modelType: 'users',
    modelId: user?.id || null,
    userId: success ? user?.id || null : null,
    newValues: user
      ? { id: user.id, email: user.email, name: user.name }
      : { email: req?.body?.email || null },
    extra: { response_status: success ? 200 : 401 },
  });
}

export async function logLogout(req) {
  await logAudit(req, 'logout', {
    modelType: 'users',
    modelId: req?.user?.id || null,
  });
}
