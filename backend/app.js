/**
 * Fallback Passenger entry point.
 *
 * `app.cjs` is the entry this project recommends, and the one the deployment
 * guide tells you to put in cPanel's "Application startup file" field. This file
 * exists for one reason: when you create an application, CloudLinux's NodeJS
 * Selector writes its own boilerplate `app.js` into the application root —
 *
 *     var http = require('http');
 *     http.createServer(...)
 *
 * — and defaults the startup-file field to it. That stub is CommonJS, but this
 * package declares `"type": "module"`, so Node parses it as ESM and the app dies
 * before it starts:
 *
 *     ReferenceError: require is not defined in ES module scope
 *
 * Extracting a release does not remove the stub on its own (tar overwrites, it
 * does not delete), so shipping a file of the same name is what replaces it.
 * Whichever of `app.js` or `app.cjs` the startup field names, the API now boots.
 *
 * This file is ESM, matching `"type": "module"`. Passenger loads the startup
 * file with `require()`, which can load ESM from Node 22.12 onward. On an older
 * Node, set the startup file to `app.cjs` instead — that one is CommonJS and
 * works on every supported version.
 */

process.on('unhandledRejection', (reason) => {
  // Passenger surfaces stderr in the app's error log; without this a boot-time
  // rejection dies silently and the app simply never answers.
  console.error('[passenger] unhandled rejection during startup:', reason);
});

await import('./src/server.js');
