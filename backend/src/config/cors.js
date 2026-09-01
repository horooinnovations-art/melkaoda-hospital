import { isProduction } from './env.js';

/**
 * Which browser origins may call this API.
 *
 * Extracted from server.js so it can be unit-tested without booting a listener.
 *
 * Two failures were fixed here:
 *  - the resolver used to end with `if (configured.length === 0) return allow`,
 *    so an unset FRONTEND_URL turned CORS into allow-all (MEL-SEC-008);
 *  - it accepted `http://localhost:*` in production as well as development
 *    (MEL-SEC-009).
 *
 * Both now fail closed.
 */
export function configuredOrigins(raw = process.env.FRONTEND_URL) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

/**
 * @param {string|undefined} origin  the request's Origin header
 * @returns {boolean} whether to echo Access-Control-Allow-Origin
 */
export function isOriginAllowed(origin, { production = isProduction(), frontendUrl } = {}) {
  // Same-origin and non-browser callers (curl, server-side fetch, the Next.js
  // rewrite proxy) send no Origin. There is nothing to authorize.
  if (!origin) return true;

  if (configuredOrigins(frontendUrl).includes(origin)) return true;

  // Local Next preview origins, development only.
  if (!production && LOCAL_ORIGIN.test(origin)) return true;

  return false;
}

/** cors() callback adapter. */
export function resolveCorsOrigin(origin, callback) {
  callback(null, isOriginAllowed(origin));
}
