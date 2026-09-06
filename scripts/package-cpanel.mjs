#!/usr/bin/env node
/**
 * Assemble the two directories that get uploaded to cPanel.
 *
 * Run from the repository root:
 *
 *   npm run package:cpanel
 *
 * Produces `dist-cpanel/api/` and `dist-cpanel/web/`, each ready to be zipped,
 * uploaded and extracted into its own cPanel application root.
 *
 * The web bundle exists because `next build` with `output: "standalone"` does
 * NOT produce a runnable directory on its own: it writes `.next/standalone/`
 * without `.next/static` and, depending on the version, without `public`. Both
 * have to be copied in beside `server.js` or the site serves HTML with no CSS,
 * no JavaScript and no images — and does it with a 200, so it looks like a
 * styling bug rather than a missing build step. This script does that copy so
 * nobody has to remember it.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist-cpanel');
const api = path.join(out, 'api');
const web = path.join(out, 'web');

const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';
/**
 * Node refuses to spawn a `.cmd` without a shell since 18.20.2 (the Windows
 * argument-injection fix), so packaging from a Windows workstation fails with
 * EINVAL unless we opt in. The deployment target is Linux, but the person
 * running this script usually is not.
 */
const spawnOpts = isWindows ? { shell: true } : {};

function log(msg) {
  console.log(`\x1b[36m[package]\x1b[0m ${msg}`);
}

function warn(msg) {
  console.warn(`\x1b[33m[package]\x1b[0m ${msg}`);
}

function die(msg) {
  console.error(`\x1b[31m[package]\x1b[0m ${msg}`);
  process.exit(1);
}

function copyDir(from, to, { optional = false } = {}) {
  if (!fs.existsSync(from)) {
    if (optional) return false;
    die(`missing expected directory: ${from}`);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
  return true;
}

function copyFile(from, to, { optional = false } = {}) {
  if (!fs.existsSync(from)) {
    if (optional) return false;
    die(`missing expected file: ${from}`);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  return true;
}

// ── Preflight ────────────────────────────────────────────────────────────────

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl) {
  die(
    'NEXT_PUBLIC_API_URL is not set.\n' +
      '        It is compiled into the client bundle and into the standalone server\'s\n' +
      '        rewrite table — setting it on the cPanel side afterwards does nothing.\n' +
      '        Example:\n' +
      '          NEXT_PUBLIC_API_URL=https://melkaodaapi.horooinnovations.com/api/v1 npm run package:cpanel'
  );
}
if (!/^https:\/\//i.test(apiUrl) && !process.env.ALLOW_INSECURE_API_URL) {
  die(`NEXT_PUBLIC_API_URL should be https in production (got "${apiUrl}").`);
}

log(`API URL baked into the build: ${apiUrl}`);

// ── Clean ────────────────────────────────────────────────────────────────────

if (fs.existsSync(out)) {
  log('removing previous dist-cpanel/');
  fs.rmSync(out, { recursive: true, force: true });
}
fs.mkdirSync(out, { recursive: true });

// ── API bundle ───────────────────────────────────────────────────────────────

log('assembling api/');
copyDir(path.join(root, 'backend', 'src'), path.join(api, 'src'));
copyFile(path.join(root, 'backend', 'package.json'), path.join(api, 'package.json'));
copyFile(path.join(root, 'backend', 'package-lock.json'), path.join(api, 'package-lock.json'));
copyFile(path.join(root, 'backend', 'app.cjs'), path.join(api, 'app.cjs'));
copyFile(
  path.join(root, 'backend', '.env.cpanel.example'),
  path.join(api, '.env.example'),
  { optional: true }
);
// Migrations travel with the API so `npm run migrate` works on the server.
copyDir(path.join(root, 'database', 'migrations'), path.join(api, 'database', 'migrations'));

// Writable directories Passenger will not create for us.
for (const dir of ['uploads', 'storage/private', 'tmp']) {
  fs.mkdirSync(path.join(api, dir), { recursive: true });
  fs.writeFileSync(path.join(api, dir, '.gitkeep'), '');
}

// ── Web bundle ───────────────────────────────────────────────────────────────

log('building the frontend (this takes a few minutes)…');
execFileSync(npm, ['run', 'build'], {
  cwd: path.join(root, 'frontend'),
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
  ...spawnOpts,
});

const standalone = path.join(root, 'frontend', '.next', 'standalone');
if (!fs.existsSync(standalone)) {
  die(
    'next build produced no .next/standalone directory.\n' +
      '        Check that next.config.mjs still sets output: "standalone".'
  );
}

log('assembling web/');
copyDir(standalone, web);

/**
 * Remove the standalone bundle's node_modules.
 *
 * CloudLinux's NodeJS Selector — what cPanel's "Setup Node.js App" actually is —
 * keeps an application's dependencies in a per-app virtual environment and puts
 * a *symlink* named `node_modules` in the application root pointing at it. It
 * refuses to set the app up at all if a real directory of that name is already
 * there:
 *
 *   Cloudlinux NodeJS Selector demands to store node modules for application
 *   in separate folder (virtual environment) pointed by symlink called
 *   "node_modules". That's why application should not contain folder/file
 *   with such name in application root
 *
 * So the dependencies are installed on the server with "Run NPM Install",
 * exactly like the API. Next's standalone output only *prunes* node_modules; it
 * does not change what the code requires, and `next` and `react` are pinned to
 * exact versions in package.json, so a server-side install resolves the same
 * tree the build was traced against.
 */
fs.rmSync(path.join(web, 'node_modules'), { recursive: true, force: true });

// The two copies the standalone output leaves behind.
copyDir(
  path.join(root, 'frontend', '.next', 'static'),
  path.join(web, '.next', 'static')
);
const hadPublic = copyDir(path.join(root, 'frontend', 'public'), path.join(web, 'public'), {
  optional: true,
});
if (!hadPublic) warn('frontend/public does not exist — skipped.');

// Passenger boots this directly; Next's standalone server.js is already
// CommonJS and reads process.env.PORT, so no shim is needed on this side.
if (!fs.existsSync(path.join(web, 'server.js'))) {
  die('the standalone bundle has no server.js — the build did not complete.');
}

/**
 * Ship a runtime-only package.json.
 *
 * Next copies the source package.json into the standalone output verbatim,
 * devDependencies and all. Those exist to *produce* a build — TypeScript,
 * ESLint, Tailwind, the @types packages — and the build has already happened.
 * Installing them on the server costs time, disk and inodes (shared hosting
 * meters all three) for nothing.
 *
 * `dependencies` is kept whole and untouched: the server renders React
 * components during SSR, so packages that look client-only (framer-motion,
 * leaflet, tiptap) really are imported at request time.
 */
const webPkgPath = path.join(web, 'package.json');
const webPkg = JSON.parse(fs.readFileSync(webPkgPath, 'utf8'));
const droppedDevDeps = Object.keys(webPkg.devDependencies || {}).length;
delete webPkg.devDependencies;
// Only `start` is meaningful once built; the rest reference tools that are gone.
webPkg.scripts = { start: 'node server.js' };
fs.writeFileSync(webPkgPath, `${JSON.stringify(webPkg, null, 2)}\n`);

// The lockfile makes the server-side install reproducible rather than
// "whatever npm resolved today".
copyFile(
  path.join(root, 'frontend', 'package-lock.json'),
  path.join(web, 'package-lock.json'),
  { optional: true }
);

log(
  `web/package.json: kept ${Object.keys(webPkg.dependencies || {}).length} runtime ` +
    `dependencies, dropped ${droppedDevDeps} build-only ones`
);

// ── Verify ───────────────────────────────────────────────────────────────────

const checks = [
  [path.join(api, 'app.cjs'), 'API Passenger entry'],
  [path.join(api, 'src', 'server.js'), 'API server'],
  [path.join(web, 'server.js'), 'Web Passenger entry'],
  [path.join(web, '.next', 'static'), 'Web static assets'],
];
for (const [target, label] of checks) {
  if (!fs.existsSync(target)) die(`${label} missing at ${target}`);
}

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(full) : fs.statSync(full).size;
  }
  return total;
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

console.log('');
log('done.');
console.log(`
  dist-cpanel/
    api/   ${mb(dirSize(api))}   → upload to the API application root
    web/   ${mb(dirSize(web))}   → upload to the web application root

  Next steps (full detail in docs/CPANEL-DEPLOYMENT.md):
    1. Zip each directory and upload it to its application root.
    2. API app  → startup file: app.cjs   then "Run NPM Install".
    3. Web app  → startup file: server.js   then "Run NPM Install".
                  Both apps install on the server: CloudLinux keeps node_modules
                  in a per-app virtual environment and refuses to set the app up
                  if a real node_modules directory is sitting in the app root.
    4. Create the .env file in the API root from .env.example.
    5. Restart both applications.
`);
