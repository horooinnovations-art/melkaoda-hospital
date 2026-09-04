import { Router } from 'express';

/**
 * Express 4 does not forward a rejected promise from an async handler to the
 * error middleware: the rejection surfaces as an `unhandledRejection` and the
 * request receives no response at all, holding the socket until the client or
 * the proxy gives up (MEL2-SEC-003).
 *
 * `wrap` catches both the synchronous throw and the rejection and hands them to
 * `next`, so every failure ends at the masking error handler in server.js.
 *
 * Error middleware (arity 4) is passed through untouched — wrapping it would
 * change its signature and Express would stop recognising it as an error
 * handler.
 */
export function wrap(handler) {
  if (typeof handler !== 'function') return handler;
  if (handler.length === 4) return handler;

  const wrapped = function wrappedHandler(req, res, next) {
    let result;
    try {
      result = handler.call(this, req, res, next);
    } catch (err) {
      next(err);
      return;
    }
    if (result && typeof result.catch === 'function') {
      result.catch(next);
    }
    return result;
  };
  // Keep the name in stack traces pointing at the real handler.
  Object.defineProperty(wrapped, 'name', { value: handler.name || 'handler' });
  return wrapped;
}

const ROUTING_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'all', 'use'];

/**
 * A Router whose every registered handler is wrapped.
 *
 * Doing this at the Router rather than at each call site means a route added
 * later cannot reintroduce the hang by forgetting a try/catch — the failure
 * mode this guards against is silent, so it must not depend on remembering.
 */
export function safeRouter(...args) {
  const router = Router(...args);

  for (const method of ROUTING_METHODS) {
    const original = router[method].bind(router);
    router[method] = (...handlers) => {
      // `use(fn)` and `get('/path', fn)` both land here; a leading string,
      // RegExp or array is a path, never a handler.
      return original(
        ...handlers.map((h) => (typeof h === 'function' ? wrap(h) : h))
      );
    };
  }

  return router;
}
