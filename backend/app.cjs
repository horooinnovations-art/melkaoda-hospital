/**
 * CommonJS entry point for cPanel (CloudLinux NodeJS Selector).
 *
 * `app.js` is the file the web server loads by default and is the one to
 * prefer. This one exists for hosts running Node older than 22.12, where
 * `require()` cannot load an ES module at all and `app.js` would fail with
 * ERR_REQUIRE_ESM. The `.cjs` extension opts this file out of the
 * `"type": "module"` declaration in package.json.
 *
 * Point the startup file here only if the Node version cannot load `app.js`.
 */

function fail(err) {
  console.error('[startup] failed to start the API:', err && err.stack ? err.stack : err);
  process.exit(1);
}

try {
  /**
   * Preferred path. From Node 22.12, `require()` loads an ES module provided
   * nothing in the graph uses top-level await — this one does not. The server
   * then finishes starting, `app.listen()` included, before this call returns,
   * which is what LiteSpeed's lsnode.js and Passenger want: both hook
   * `http.Server.listen` during the require, and a listen that happens a tick
   * later races that hand-off.
   */
  require('./src/server.js');
} catch (err) {
  if (err && err.code === 'ERR_REQUIRE_ESM') {
    /**
     * Node < 22.12. Dynamic import is the only way in from CommonJS. The server
     * starts one microtask later than the web server would like; if that proves
     * unreliable, the real fix is a newer Node, not more code here.
     */
    import('./src/server.js').catch(fail);
  } else {
    fail(err);
  }
}
