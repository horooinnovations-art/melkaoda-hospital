/**
 * Phusion Passenger entry point (cPanel → Setup Node.js App).
 *
 * cPanel does not run `npm start`. It boots one file with the Node binary under
 * Passenger, and the "Application startup file" field must point here.
 *
 * Why CommonJS, and why `.cjs`:
 *   - `backend/package.json` declares `"type": "module"`, so every `.js` file in
 *     this tree is ESM. The `.cjs` extension opts this one file back into
 *     CommonJS regardless.
 *   - Passenger loads the startup file with `require()`. Handing it an ESM file
 *     fails with ERR_REQUIRE_ESM on the Node 18/20 builds cPanel usually ships,
 *     and the app never starts — with an error that points at Passenger rather
 *     than at the cause.
 *   - Dynamic `import()` is available inside CommonJS on every supported Node,
 *     and is the bridge between the two.
 *
 * Set the startup file to `app.cjs`. Nothing else in the codebase changes.
 */

process.on('unhandledRejection', (reason) => {
  // Passenger surfaces stderr in the app's error log; without this a boot-time
  // rejection dies silently and the app just never answers.
  console.error('[passenger] unhandled rejection during startup:', reason);
});

import('./src/server.js').catch((err) => {
  console.error('[passenger] failed to start the API:', err && err.stack ? err.stack : err);
  process.exit(1);
});
