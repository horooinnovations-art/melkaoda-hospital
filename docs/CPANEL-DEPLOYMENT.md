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
  api/    ~0.4 MB   (no node_modules — installed on the server)
  web/    ~80 MB    (node_modules bundled — do NOT npm install this one)
```

Then zip each directory separately:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/zip-cpanel.ps1 `
  -SourceRoot dist-cpanel -OutputDir "$HOME/Downloads"
```

Producing `melkaoda-cpanel-backend-<date>.zip` and
`melkaoda-cpanel-frontend-<date>.zip`.

**Do not use PowerShell's `Compress-Archive` for this.** It writes Windows path
separators into the entry names, which Windows tolerates and Linux does not: on
the server every entry extracts as one file whose *name* contains backslashes,
so instead of a directory tree you get a flat pile of files called things like
`src\config\db.js` — and Passenger reports only that it cannot find the startup
file. The script above names each entry with forward slashes. Any tool that
produces POSIX paths (7-Zip, `tar -a -c -f`, WinRAR) is equally fine.

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

1. Upload and extract `api.zip` into the application root.
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

1. Upload and extract `web.zip` into the application root.
2. **Do not run NPM Install.** The bundle already contains exactly the
   dependencies it needs; installing would pull devDependencies the standalone
   build deliberately omits.
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
| 503 from `/health` | Database credentials, or the user lacks privileges on the prefixed database name. |
| Uploads fail in production | `MEDIA_DRIVER` unset. Production must state one; there is no silent default. |
| Everyone rate-limited together | `TRUST_PROXY_HOPS` wrong. Passenger behind Apache is `1`. |
| Contact replies never arrive | `MAIL_*` unset. The reply is saved either way, and the panel says delivery failed. |
| `robots.txt` has no host | `SITE_URL` not set on the web app. |
