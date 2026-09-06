/**
 * Application entry point for cPanel (CloudLinux NodeJS Selector).
 *
 * The web server — LiteSpeed's `lsnode.js`, or Phusion Passenger on an Apache
 * host — loads this file with `require()` and hooks `http.Server.listen` while
 * it does. Two constraints follow, and both have already bitten this deployment:
 *
 *  1. Creating an application makes NodeJS Selector write its own CommonJS
 *     boilerplate `app.js` into the application root and name it as the default
 *     startup file. This package declares `"type": "module"`, so Node parses
 *     that stub as ESM and it dies on `require is not defined in ES module
 *     scope`. Shipping a file of the same name is what replaces it — extracting
 *     a release cannot delete a file the archive does not contain.
 *
 *  2. `require()` can load an ES module only when nothing in the graph uses
 *     top-level await. An earlier version of this file used
 *     `await import('./src/server.js')`, which made the module itself async and
 *     failed with:
 *
 *         ERR_REQUIRE_ASYNC_MODULE: require() cannot be used on an ESM graph
 *         with top-level await
 *
 * Hence a plain static import. It keeps the graph synchronous, so `require()`
 * resolves it, and `src/server.js` finishes evaluating — including its
 * `app.listen()` — before the require returns. That is what the web server
 * expects; a deferred listen races its socket hand-off.
 *
 * Nothing else belongs in this file. `import` declarations are hoisted, so any
 * statement written above one still runs after it — the process-level
 * `unhandledRejection` and `uncaughtException` handlers therefore live in
 * `src/server.js`, where they are installed before anything can fail.
 *
 * Node 22.12 is the floor for `require(esm)`. On anything older, point the
 * startup file at `app.cjs` instead.
 */
import './src/server.js';
