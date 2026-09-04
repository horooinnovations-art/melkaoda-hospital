import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import pool from './config/db.js';
import { bootstrapSchema } from './config/bootstrapSchema.js';
import { assertEnvOrExit, isProduction } from './config/env.js';
import { resolveCorsOrigin } from './config/cors.js';
import { logger } from './utils/logger.js';

dotenv.config();
assertEnvOrExit();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

/**
 * Render (and any reverse proxy) terminates TLS and forwards the real client
 * address in X-Forwarded-For. Without this, `req.ip` is the proxy's address for
 * every request: all three rate limiters share a single bucket — so eight login
 * attempts a minute locks out every administrator — and audit_logs,
 * users.last_login_ip and contact_submissions.ip_address all record the proxy
 * (MEL-DEVOPS-001).
 *
 * TRUST_PROXY_HOPS must match the real number of proxies in front of this
 * process, because a hop count that is too high lets a client forge its own
 * address by sending its own X-Forwarded-For. Render's edge is one hop; the
 * Next.js rewrite proxy in front of it makes two.
 */
const TRUST_PROXY_HOPS = Number(process.env.TRUST_PROXY_HOPS ?? (isProduction() ? 2 : 0));
if (TRUST_PROXY_HOPS > 0) {
  app.set('trust proxy', TRUST_PROXY_HOPS);
  logger.info(`trust proxy set to ${TRUST_PROXY_HOPS} hop(s)`);
} else {
  app.set('trust proxy', false);
}

// Express advertises itself by default; helmet's hidePoweredBy removes it, but
// be explicit so it survives a helmet config change.
app.disable('x-powered-by');

process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection', {
    error: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', { error: err.message, stack: err.stack });
  setTimeout(() => process.exit(1), 250);
});

app.use(compression());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(
  cors({
    origin: resolveCorsOrigin,
    // Auth is a Bearer token, not a cookie — no credentialed cross-origin
    // requests are made, so this stays off (MEL-INFO-001).
    credentials: false,
  })
);
/**
 * A 10 MB JSON limit applied to every route, including the unauthenticated
 * contact form, on a 512 MB instance — a handful of concurrent maximum-size
 * bodies is enough to pressure memory (MEL2-API-001). File uploads do not come
 * through here; multer handles multipart with its own 8 MB per-file limit. The
 * largest legitimate JSON body is a settings save with rich-text fields.
 */
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '512kb' }));
app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.JSON_BODY_LIMIT || '512kb',
    // Caps how many keys a form body may carry, so a crafted body cannot make
    // the parser do unbounded work.
    parameterLimit: 500,
  })
);

/**
 * Method spoofing for multipart forms, which cannot issue PUT/DELETE directly.
 *
 * Restricted to POST: previously any verb could be rewritten, so a GET could be
 * routed into a DELETE handler (MEL-SEC-015). The query-string form is dropped
 * as well — a URL is too easy to get a browser or crawler to follow.
 */
const OVERRIDABLE = new Set(['PUT', 'PATCH', 'DELETE']);
app.use((req, _res, next) => {
  if (req.method !== 'POST') return next();
  const raw = req.headers['x-http-method-override'] || req.body?._method;
  if (typeof raw === 'string' && OVERRIDABLE.has(raw.toUpperCase())) {
    req.method = raw.toUpperCase();
  }
  next();
});
app.use(
  '/uploads',
  express.static(path.resolve('uploads'), {
    maxAge: '7d',
    etag: true,
    lastModified: true,
  })
);

/** Cache public read GETs at the edge / browser for a short TTL. */
app.use('/api/v1/public', (req, res, next) => {
  if (req.method === 'GET') {
    res.set(
      'Cache-Control',
      'public, max-age=30, s-maxage=60, stale-while-revalidate=300'
    );
  }
  next();
});

app.get('/health', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, service: 'Melka Oda General Hospital API', db: 'up' });
  } catch (err) {
    // Never echo the driver's text — it names hosts, users and schemas, and this
    // endpoint is unauthenticated. NODE_ENV is not consulted, because a
    // mis-set NODE_ENV must not be able to turn disclosure back on.
    logger.error('health_db_down', { error: err.message });
    res.status(503).json({ ok: false, db: 'down', error: 'Database unavailable' });
  }
});

app.use('/api/v1', routes);

/**
 * Unmatched API paths returned Express's default HTML error page, which breaks
 * every client that expects the JSON envelope (MEL-BUG-001).
 */
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `No such endpoint: ${req.method} ${req.baseUrl}${req.path}`,
  });
});

app.use((err, _req, res, _next) => {
  const ref = Math.random().toString(36).slice(2, 10);
  logger.error('express_error', { ref, error: err.message, stack: err.stack });

  // Multer and body-parser raise client errors here; those are safe to name.
  const status = err.status || err.statusCode || 500;
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File is too large (max 8 MB)' });
  }
  if (err.message === 'Unsupported file type') {
    return res.status(415).json({ success: false, message: 'Unsupported file type' });
  }
  if (status >= 400 && status < 500) {
    return res.status(status).json({ success: false, message: 'Request could not be processed' });
  }

  // 5xx: fixed text plus a correlation id, regardless of NODE_ENV.
  return res.status(500).json({
    success: false,
    message: 'Something went wrong on our side. Please try again.',
    ref,
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Melka Oda Hospital API listening on http://0.0.0.0:${PORT}`);
  // Boot-time schema guards issue DDL and DML. On a shared or production
  // database that should be a deliberate act, not a side effect of starting the
  // process (MEL-ENV-001) — set SCHEMA_BOOTSTRAP=0 to skip it and run
  // `npm run migrate` instead.
  if (process.env.SCHEMA_BOOTSTRAP === '0' || process.env.SCHEMA_BOOTSTRAP === 'false') {
    logger.info('schema_bootstrap_disabled', { reason: 'SCHEMA_BOOTSTRAP=0' });
    return;
  }
  // A refusal here is deliberate and must be loud — it means this process was
  // about to issue DDL against a database it should not be touching.
  bootstrapSchema().catch((err) =>
    logger.error('schema_bootstrap_skipped', { error: err.message })
  );
});

function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await pool.end();
      logger.info('Database pool closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error closing DB pool', { error: err.message });
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

