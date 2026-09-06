# cPanel deployment

Deploying Melka Oda General Hospital to cPanel.

| | |
|---|---|
| Public site | `https://melkaoda.horooinnovations.com` |
| API | `https://melkaodaapi.horooinnovations.com` |
| Database | cPanel MySQL, local to the account |
| Media | This account's disk (`uploads/`, `storage/private/`) |

Two Node applications, each with its own application root, its own subdomain and
its own Passenger process.

---

## 0. What is different about cPanel

Worth reading before the first deploy — each of these has its own failure mode
and none of them announces itself clearly.

**Passenger boots a file, not a command.** There is no `npm start`. cPanel runs
one startup file under Phusion Passenger. The API needs a CommonJS entry
(`app.cjs`) because its `package.json` declares `"type": "module"` and Passenger
loads the startup file with `require()` — handing it ESM fails with
`ERR_REQUIRE_ESM`, and the error names Passenger rather than the cause.

**The Next.js build is not runnable as-is.** `output: "standalone"` writes
`.next/standalone/` *without* `.next/static`. Upload only what Next produced and
the site serves HTML with no CSS and no JavaScript — at HTTP 200, so it reads as
a styling bug rather than a missing directory. `npm run package:cpanel` performs
that copy.

**The API URL is compiled in, not read at runtime.** `NEXT_PUBLIC_API_URL` is
baked into the client bundle *and* into the standalone server's rewrite table at
build time. Setting it in cPanel afterwards does nothing. Get it right before
building, or rebuild.

**The disk is durable.** Unlike Render, files written here survive restarts —
which is why `MEDIA_DRIVER=local` is the right choice. The corollary is that
`uploads/` and `storage/` hold the only copy of every image, document and
résumé, and cPanel's account backup is what protects them.

---

## 1. Before you start

- [ ] DNS: `melkaoda` and `melkaodaapi` A records pointing at the server
- [ ] Both subdomains created in cPanel → **Domains**
- [ ] AutoSSL issued for both (cPanel → **SSL/TLS Status**)
- [ ] Node.js available in cPanel → **Setup Node.js App** (Node 20 LTS or newer)
- [ ] A MySQL database, a user, and the user granted ALL PRIVILEGES on it
- [ ] An email account for `no-reply@melkaoda.horooinnovations.com`

cPanel prefixes database and user names with the account name — if the account
is `horoo`, a database called `melkaoda` is really `horoo_melkaoda`. Use the
full prefixed names in `.env`.

---

## 2. Move the database

**The Melka Oda site currently shares one Aiven database (`defaultdb`) with the
Deder, Gambo and Loke sites** — same host, same credentials, same tables. That
is why the `users` table contains `admin@gambohospital.com` and
`admin@lokehospital.com` as active super admins: they are not stale rows, they
are the live administrators of the sibling sites, and today each of them can
administer this one.

Moving to a local database is what ends that. Do not skip it and do not point
cPanel at the shared instance.

### 2.1 Export

```bash
mysqldump --single-transaction --routines --set-gtid-purged=OFF \
  -h <aiven-host> -P <port> -u <user> -p defaultdb \
  > melkaoda-export.sql
```

### 2.2 Import

Upload the dump, then in cPanel → **phpMyAdmin** (or over SSH):

```bash
mysql -u horoo_melkaoda -p horoo_melkaoda < melkaoda-export.sql
```

### 2.3 Separate the accounts — do this immediately after importing

The import brings the sibling sites' administrators with it. Until you run this,
the new database has the same problem as the old one.

```sql
-- Who can administer this site?
SELECT u.id, u.email, u.status, u.is_root_admin, u.last_login_at
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
WHERE r.slug IN ('super_admin','admin') AND u.deleted_at IS NULL
ORDER BY u.is_root_admin DESC, u.id;
```

Every row must be a named, current member of Melka Oda staff. Disable the rest:

```sql
UPDATE users SET status = 'inactive', deleted_at = NOW()
WHERE email IN ('admin@ggh.com','admin@dedrhospital.com',
                'admin@gambohospital.com','admin@lokehospital.com');
```

Then set the root-admin tier deliberately — `ROOT_ADMIN_EMAILS` is only applied
at boot while `SCHEMA_BOOTSTRAP` is on, and it is off in production:

```sql
UPDATE users SET is_root_admin = 0;
UPDATE users SET is_root_admin = 1 WHERE email IN ('<the real operator>');
```

Finally, clear the leftover test data:

```sql
DELETE FROM roles WHERE slug = 'test-name';
DELETE FROM permissions WHERE slug = 'test';
DELETE FROM gallery WHERE title LIKE 'test%';
```

### 2.4 Rebrand the stored content

Public responses are now served verbatim — the API no longer rewrites text on
the way out, because doing so made the site disagree with the editor and
corrupted real Ethiopian place names. Some stored rows still say "Loke" or
"Gambo". Fix the data once:

```bash
npm run rebrand:melkaoda -- --dry-run     # review
npm run rebrand:melkaoda -- --confirm     # apply
```

---

## 3. Build the bundles

On your workstation, from the repository root:

```bash
NEXT_PUBLIC_API_URL=https://melkaodaapi.horooinnovations.com/api/v1 \
NEXT_PUBLIC_SITE_NAME="Melka Oda General Hospital" \
npm run package:cpanel
```

Produces:

```
dist-cpanel/
  api/    ~0.3 MB   (no node_modules — installed on the server)
  web/    ~15 MB    (no node_modules — installed on the server)
```

Neither bundle ships `node_modules`. That is not an optimisation — see
"node_modules belongs to the server" below.

Then archive each directory:

```bash
npm run archive:cpanel
```

Producing `melkaoda-cpanel-backend-<date>.tar.gz` and
`melkaoda-cpanel-frontend-<date>.tar.gz` in `~/Downloads`.

### Use .tar.gz, not .zip

cPanel runs ClamAV with the Sanesecurity "Foxhole" signatures on File Manager
uploads, and **`Sanesecurity.Foxhole.JS_Zip_2` matches any ZIP archive
containing JavaScript files**. It exists to catch JS-in-a-zip email
attachments. The frontend bundle is ~3,000 `.js` files in a zip, so it matches
that shape exactly while containing nothing malicious — the signature keys on
the container format, not on behaviour. The upload is refused with:

```
Sanesecurity.Foxhole.JS_Zip_2.UNOFFICIAL FOUND
```

It is a false positive, and it is not worth arguing with: the signature is
ZIP-specific, so the same bytes in a gzipped tar upload fine. tar also
preserves POSIX paths and permissions, which ZIP written on Windows does not —
`Compress-Archive` in particular writes Windows separators into entry names, so
on Linux every entry extracts as one file *named* `src\config\db.js` instead of
a directory tree, and Passenger reports only that it cannot find the startup
file. (`scripts/zip-cpanel.ps1` remains for anyone who needs a correct ZIP.)

If File Manager still objects, upload over SFTP or FTP instead — the ClamAV
hook runs on the File Manager upload path, not on the SSH/FTP one.

---

### cPanel writes its own broken app.js

Creating an application makes NodeJS Selector drop a CommonJS boilerplate
`app.js` into the application root and name it as the default startup file:

```js
var http = require('http');
http.createServer(...)
```

The API package declares `"type": "module"`, so Node parses that stub as ESM and
the app dies before it starts:

```
ReferenceError: require is not defined in ES module scope
```

The bundle ships **both** entry points so this cannot bite: `app.cjs` (CommonJS,
works on every Node) and `app.js` (ESM, overwrites the stub on extraction and
works from Node 22.12 onward, where `require()` can load ESM). Set the startup
file to **`app.cjs`** — but if it is left at `app.js`, the API still boots.

---

### node_modules belongs to the server, not the bundle

cPanel's "Setup Node.js App" is CloudLinux's **NodeJS Selector**. It keeps each
application's dependencies in a per-app virtual environment
(`~/nodevenv/<app>/<node-version>/lib/node_modules`) and puts a *symlink* named
`node_modules` in the application root pointing at it. If a real directory of
that name is already sitting in the root, it refuses to set the app up:

```
Cloudlinux NodeJS Selector demands to store node modules for application in
separate folder (virtual environment) pointed by symlink called "node_modules".
That's why application should not contain folder/file with such name in
application root
```

Next's `output: "standalone"` produces a pruned `node_modules` beside
`server.js`, which is exactly the shape NodeJS Selector rejects. So the
packaging script deletes it and both apps install on the server instead.

If you ever see that error again, the fix is to remove `node_modules` from the
application root and click **Run NPM Install** — do not try to keep a real
directory there.

**Extracting a new bundle does not clear it.** `tar` adds and overwrites; it
never deletes what is not in the archive. A `node_modules` left by an earlier
upload survives every redeploy until you remove it yourself.

Removing it through File Manager usually disappoints: it is thousands of files
in deep paths, and the delete times out half way. Renaming is instant, because
it only touches one directory entry:

```bash
# cPanel → Terminal, or over SSH
cd ~/melkaoda.horooinnovations.com
mv node_modules _old_node_modules   # instant; unblocks the Selector at once
rm -rf _old_node_modules            # then clean up at leisure
ls -la                              # confirm: no node_modules of any kind
```

If Terminal is not available, do the same in File Manager: **Rename**
`node_modules` to `_old_node_modules` (fast), reload the NodeJS Selector page,
then delete the renamed folder afterwards.

After **Run NPM Install** succeeds, `ls -la` shows `node_modules` again — this
time as a symlink into `~/nodevenv/...`, which is what it should be. Leave it
alone; later redeploys extract over the top of it safely.

---

## 4. The API application

**cPanel → Setup Node.js App → Create Application**

| Field | Value |
|---|---|
| Node.js version | 20.x or newer |
| Application mode | Production |
| Application root | `apps/melkaoda-api` |
| Application URL | `melkaodaapi.horooinnovations.com` |
| Application startup file | `app.cjs` |

Then:

1. Upload `melkaoda-cpanel-backend-<date>.tar.gz` into the application root and
   **Extract** it there. The archive has no wrapper directory, so its contents
   land directly in the root — which is what Passenger expects.
2. Create `.env` there from the included `.env.example`. Fill in every value —
   the API refuses to start on an invalid production configuration rather than
   running unprotected, and the message names the variable.
3. Generate the secrets:
   ```bash
   openssl rand -base64 48   # JWT_SECRET
   openssl rand -base64 24   # ADMIN_PASSWORD
   ```
   `ADMIN_PASSWORD` must be ≥16 characters across three character classes and
   must not contain "admin", "hospital" or "melkaoda" — those are rejected at
   boot.
4. Click **Run NPM Install**.
5. Enter the virtual environment (the `source ...activate` line cPanel shows at
   the top of the app page) and apply the schema:
   ```bash
   cd ~/apps/melkaoda-api
   npm run migrate
   ```
   Migrations are idempotent, so a second run is a no-op. `SCHEMA_BOOTSTRAP=0`
   means restarts never change the schema on their own.
6. Make the writable directories writable:
   ```bash
   chmod 755 ~/apps/melkaoda-api/uploads ~/apps/melkaoda-api/storage/private
   ```
7. **Restart** the application.

Verify:

```bash
curl -s https://melkaodaapi.horooinnovations.com/health
# {"ok":true,"service":"Melka Oda General Hospital API","db":"up"}
```

A 503 with `"db":"down"` means the database credentials are wrong. Passenger
logs boot failures to `~/logs/` and to the app's error log in the cPanel UI.

---

## 5. The web application

**cPanel → Setup Node.js App → Create Application**

| Field | Value |
|---|---|
| Node.js version | 20.x or newer |
| Application mode | Production |
| Application root | `apps/melkaoda-web` |
| Application URL | `melkaoda.horooinnovations.com` |
| Application startup file | `server.js` |

1. Upload `melkaoda-cpanel-frontend-<date>.tar.gz` into the application root and
   **Extract** it there. No wrapper directory; `server.js` must end up at the
   root itself.
2. Click **Run NPM Install** — same as the API. The shipped `package.json`
   carries only the 33 runtime dependencies (the build-only ones are stripped,
   since the build already happened), and `next` and `react` are pinned to
   exact versions, so the install resolves the same tree the build was traced
   against. Expect ~194 packages.
3. Add these environment variables in the cPanel app screen — these are read at
   request time, so unlike `NEXT_PUBLIC_API_URL` they can be corrected without
   rebuilding:

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `SITE_URL` | `https://melkaoda.horooinnovations.com` |

   `SITE_URL` drives `robots.txt`, `sitemap.xml` and canonical tags. Without it
   they omit the host entirely rather than publish a wrong one — correct, but it
   leaves the site unindexable.
4. **Restart** the application.

Verify:

```bash
curl -sI https://melkaoda.horooinnovations.com/ | head -1
curl -s  https://melkaoda.horooinnovations.com/robots.txt
```

The robots response must name `melkaoda.horooinnovations.com`. If the host line
is missing, `SITE_URL` is not set.

---

## 6. Bring the media across

New uploads go to local disk as soon as `MEDIA_DRIVER=local` is set. Existing
media rows still point at the shared Cloudinary account. Until they are brought
over, the site is not self-contained.

```bash
cd ~/apps/melkaoda-api
node src/scripts/cloudinaryToLocal.js --dry-run    # report
node src/scripts/cloudinaryToLocal.js --confirm    # download + repoint
```

Safe to re-run; a failed asset keeps its Cloudinary URL so the site keeps
working and the row can be retried. Do not decommission the Cloudinary account
until this reports zero failures — and search `settings` and page content for
`res.cloudinary.com` first, since URLs pasted inside rich-text bodies are not
covered by the script.

---

## 7. Force HTTPS

Passenger serves the app; Apache sits in front. Add to `public_html/.htaccess`
for each subdomain's document root:

```apache
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
```

Leave the rest of that file alone — cPanel writes the Passenger directives into
it, and editing them by hand breaks the app.

---

## 8. Redeploying

**Code change:**

1. `npm run package:cpanel` on your workstation.
2. Upload and extract over the application root. For the web app, delete the old
   `.next/` first — stale chunks are served with `immutable` cache headers and
   will not be replaced by an overwrite.
3. API only: **Run NPM Install** if `package.json` changed.
4. **Restart** the application.

`uploads/`, `storage/` and `.env` are not part of the bundle and survive a
redeploy. Verify that after your first one.

**Schema change:** `npm run migrate` inside the API's virtual environment.
Rehearse against a copy first; MySQL commits DDL as it goes, so a migration that
fails half way cannot be rolled back.

---

## 9. Backups

Everything that matters now lives on this account:

| What | Where |
|---|---|
| Content, users, audit log, submissions | MySQL database |
| Images and documents | `apps/melkaoda-api/uploads/` |
| Applicant résumés | `apps/melkaoda-api/storage/private/` |
| Secrets | `apps/melkaoda-api/.env` |

Enable cPanel's full account backup on a schedule and download a copy off the
server — a backup that lives only on the machine it protects is not a backup.

**Then restore one, before launch.** Import a dump into a scratch database,
point a local API at it, and confirm an administrator can sign in and a page
renders. Record how long it took: that is your real recovery time, and until
you have measured it you do not have one.

---

## 10. Troubleshooting

| Symptom | Cause |
|---|---|
| Site loads with no styling | `.next/static` missing from the web root. Re-run `package:cpanel`; don't hand-copy. |
| Admin panel loads, nothing saves | `FRONTEND_URL` doesn't exactly match the site origin, so CORS refuses. No trailing slash. |
| API calls go to onrender.com | Built with the wrong `NEXT_PUBLIC_API_URL`. Rebuild — it cannot be fixed on the server. |
| App won't start, `ERR_REQUIRE_ESM` | Startup file is `src/server.js`. It must be `app.cjs`. |
| `require is not defined in ES module scope` in `app.js` | cPanel's own boilerplate stub is still there. Re-extract the bundle (its `app.js` overwrites it) and set the startup file to `app.cjs`. |
| `ls` shows no `.next` | `.next` is a dotfile — plain `ls` hides it. Use `ls -la`. If it really is absent, the bundle was never extracted there. |
| "NodeJS Selector demands to store node modules..." | A real `node_modules` directory is in the application root, usually left by an earlier upload — extracting a new bundle does not remove it. Rename it (instant), then **Run NPM Install**. |
| 503 from `/health` | Database credentials, or the user lacks privileges on the prefixed database name. |
| Uploads fail in production | `MEDIA_DRIVER` unset. Production must state one; there is no silent default. |
| Everyone rate-limited together | `TRUST_PROXY_HOPS` wrong. Passenger behind Apache is `1`. |
| Contact replies never arrive | `MAIL_*` unset. The reply is saved either way, and the panel says delivery failed. |
| `robots.txt` has no host | `SITE_URL` not set on the web app. |
