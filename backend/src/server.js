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
import { logger } from './utils/logger.js';

dotenv.config();
assertEnvOrExit();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

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

/** Allow configured FRONTEND_URL(s) plus known Render frontends / local Next. */
function resolveCorsOrigin(origin, callback) {
  const configured = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const localDev = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
  const knownFrontends = [
    'https://gambo-general-hospital-website.onrender.com',
    'https://loke-general-hospital-website.onrender.com',
    'https://loke-hospital-web.onrender.com',
    'https://gambo-general-hospital.onrender.com',
  ];
  const renderFrontend =
    /^https:\/\/([a-z0-9-]+\.)*(gambo|loke)[-a-z0-9]*\.(onrender\.com|horooinnovations\.com)$/i;

  if (!origin) return callback(null, true);
  if (configured.includes(origin)) return callback(null, true);
  if (knownFrontends.includes(origin)) return callback(null, true);
  if (renderFrontend.test(origin)) return callback(null, true);
  if (!isProduction() && localDev.test(origin)) return callback(null, true);
  if (localDev.test(origin)) return callback(null, true);
  if (configured.length === 0 && !isProduction()) {
    return callback(null, true);
  }
  return callback(null, false);
}

app.use(
  cors({
    origin: resolveCorsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/** Support HTTP method spoofing (_method=PUT in FormData/queries/headers) */
app.use((req, _res, next) => {
  const methodOverride = req.query?._method || req.headers?.['x-http-method-override'];
  if (methodOverride && typeof methodOverride === 'string') {
    req.method = methodOverride.toUpperCase();
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
    res.json({ ok: true, service: 'Gambo General Hospital API', db: 'up' });
  } catch (err) {
    res.status(503).json({
      ok: false,
      db: 'down',
      error: isProduction() ? 'Database unavailable' : err.message,
    });
  }
});

app.use('/api/v1', routes);

app.use((err, _req, res, _next) => {
  logger.error('express_error', {
    error: err.message,
    stack: isProduction() ? undefined : err.stack,
  });
  res.status(err.status || 500).json({
    success: false,
    message: isProduction() ? 'Server error' : err.message || 'Server error',
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Gambo Hospital API listening on http://0.0.0.0:${PORT}`);
  bootstrapSchema().catch((err) =>
    logger.warn('schema_bootstrap_skipped', { error: err.message })
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

