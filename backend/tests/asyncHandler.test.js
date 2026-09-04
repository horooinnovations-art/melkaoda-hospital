import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { wrap, safeRouter } from '../src/utils/asyncHandler.js';

/**
 * Express 4 does not forward a rejected promise from an async handler to the
 * error middleware. The rejection surfaces as an `unhandledRejection` and the
 * request gets no response at all — the socket is held until the client gives
 * up. Two of the affected handlers were unauthenticated public endpoints
 * (MEL2-SEC-003).
 *
 * These tests assert the fix rather than the framework: a throwing handler must
 * reach the error middleware and produce a status code.
 */

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function get(server, path) {
  const { port } = server.address();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { signal: controller.signal });
    return { status: res.status, body: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

test('a rejected async handler reaches the error middleware', async () => {
  const app = express();
  app.get(
    '/boom',
    wrap(async () => {
      throw new Error('async boom');
    })
  );
  app.use((_err, _req, res, _next) => res.status(500).json({ handled: true }));

  const server = await listen(app);
  try {
    const res = await get(server, '/boom');
    assert.equal(res.status, 500);
    assert.match(res.body, /handled/);
  } finally {
    server.close();
  }
});

test('a synchronous throw reaches the error middleware too', async () => {
  const app = express();
  app.get(
    '/sync-boom',
    wrap(() => {
      throw new Error('sync boom');
    })
  );
  app.use((_err, _req, res, _next) => res.status(500).json({ handled: true }));

  const server = await listen(app);
  try {
    assert.equal((await get(server, '/sync-boom')).status, 500);
  } finally {
    server.close();
  }
});

test('a handler that succeeds is untouched', async () => {
  const app = express();
  app.get(
    '/fine',
    wrap(async (_req, res) => res.json({ ok: true }))
  );

  const server = await listen(app);
  try {
    const res = await get(server, '/fine');
    assert.equal(res.status, 200);
    assert.match(res.body, /"ok":true/);
  } finally {
    server.close();
  }
});

test('safeRouter wraps every handler registered on it', async () => {
  const app = express();
  const router = safeRouter();
  router.get('/explode', async () => {
    throw new Error('router boom');
  });
  app.use('/api', router);
  app.use((_err, _req, res, _next) => res.status(500).json({ handled: true }));

  const server = await listen(app);
  try {
    assert.equal((await get(server, '/api/explode')).status, 500);
  } finally {
    server.close();
  }
});

test('safeRouter preserves middleware chains and their order', async () => {
  const app = express();
  const router = safeRouter();
  const seen = [];
  router.get(
    '/chain',
    (_req, _res, next) => {
      seen.push('first');
      next();
    },
    async (_req, _res, next) => {
      seen.push('second');
      next();
    },
    async (_req, res) => {
      seen.push('third');
      res.json({ seen });
    }
  );
  app.use(router);

  const server = await listen(app);
  try {
    const res = await get(server, '/chain');
    assert.equal(res.status, 200);
    assert.deepEqual(seen, ['first', 'second', 'third']);
  } finally {
    server.close();
  }
});

test('error middleware keeps its four-argument signature', () => {
  const errorMiddleware = (_err, _req, _res, _next) => {};
  // Wrapping would drop it to three arguments and Express would stop treating
  // it as an error handler — a silent, total loss of error handling.
  assert.equal(wrap(errorMiddleware), errorMiddleware);
});
