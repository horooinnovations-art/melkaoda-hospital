# Melka Oda General Hospital

Public website and content management platform for Melka Oda General Hospital.

Next.js 15 (public site + admin panel) → Express 4 API → MySQL 8. Two Node
applications, deployed to cPanel under Phusion Passenger.

```
Browser ──► Next.js  melkaoda.horooinnovations.com     ──► Express API
            SSR pages                                      melkaodaapi.horooinnovations.com
            admin SPA                                          │
                                                               ├─► MySQL 8 (local to the account)
                                                               └─► uploads/ + storage/private/
```

| | |
|---|---|
| Frontend | `frontend/` — Next.js 15, React 19, TypeScript, Tailwind 4, RTK Query |
| Backend | `backend/` — Node ESM, Express 4, mysql2, bcryptjs, jsonwebtoken |
| Database | MySQL 8, local to the cPanel account |
| Media | This account's disk (`MEDIA_DRIVER=local`); Cloudinary still supported |
| Auth | HS256 JWT, 7-day expiry, Bearer header, revoked by `password_changed_at` |

Deploying: **[`docs/CPANEL-DEPLOYMENT.md`](docs/CPANEL-DEPLOYMENT.md)**.

---

## Running it locally

You need Node 20+, and a **local MySQL database** — not the production one. See
"Never point development at production" below; it is the reason several things
in this repository are the way they are.

```bash
# 1. API
cd backend
cp .env.example .env          # then fill it in — see the comments in that file
npm install
npm run migrate               # applies database/migrations/*.sql in order
npm run dev                   # http://127.0.0.1:5000

# 2. Web
cd ../frontend
cp .env.local.example .env.local
npm install
npm run dev                   # http://127.0.0.1:3000
```

The admin panel is at `/admin`. On a database with no administrator at all, the
API creates one from `ADMIN_EMAIL` / `ADMIN_PASSWORD` on first boot and does
nothing on subsequent boots.

### Checks

```bash
cd backend  && npm test        # 87 unit tests, no database required
cd frontend && npm run typecheck && npx next lint && npm run build
```

CI runs all of these on every pull request (`.github/workflows/ci.yml`), plus a
scan that refuses to let a database dump, a `.env` file, a password hash or a
private key be committed.

---

## Never point development at production

`backend/.env` decides which database every command in `backend/` talks to,
including `npm run dev` and every script in `src/scripts/`. Pointing it at the
production database has bitten this project before, so three guards exist:

1. **Boot-time DDL is refused** when `NODE_ENV` is not `production` and
   `DB_HOST` is not local. Starting a dev server can no longer `ALTER TABLE`
   live hospital data.
2. **`SCHEMA_BOOTSTRAP=0`** should be set in every shared environment. Schema
   changes go through `npm run migrate`, which is reviewable.
3. **Every mutating script refuses to run without `--confirm`**, and makes you
   type the database name back when the target is remote. All of them accept
   `--dry-run`.

```bash
npm run rebrand:melkaoda -- --dry-run    # show what would change
npm run rebrand:melkaoda -- --confirm    # then actually change it
```

---

## Migrations

Ordered `.sql` files in `database/migrations/`, tracked in `schema_migrations`
by filename. `npm run migrate` applies anything not yet recorded.

**Every migration must be idempotent.** MySQL commits DDL as it goes, so a file
that fails half way through cannot be rolled back — the runner's transaction
cannot help you. Guard each change:

```sql
SET @stmt := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `users` ADD COLUMN `example` INT NOT NULL DEFAULT 0',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'example'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;
```

Rehearse against a restored copy of production before running against
production. There is no baseline schema file yet — see
`docs/OPERATIONS.md` for what that means for rebuilding an environment.

---

## Permissions

Two gates, in order: a **role** must be one of `admin`, `super_admin`, `editor`,
`doctor`, `staff`; then a **permission** slug must be held. `super_admin`
bypasses the permission gate. Above it sits `users.is_root_admin`, which governs
who may manage other super admins — granted only by `ROOT_ADMIN_EMAILS` at boot
or by direct SQL, never by anything a request can send.

Adding a CRUD resource without a `RESOURCE_PERMISSIONS` entry throws at startup,
so an unprotected admin route cannot be added by forgetting one.

A role editor can only grant permissions they hold themselves.

---

## Repository layout

```
backend/src/
  config/       env validation, db pool, CORS, permission catalogue, boot schema
  controllers/  core (auth/settings/contact), crudFactory, resources, rbac,
                submissions (applications + registrations), passwordReset
  middleware/   authenticate, requireRoles, requirePermission
  services/     media (local disk or Cloudinary), mail, audit, loginThrottle
  utils/        asyncHandler, validate, sqlSafe, password, mediaUrl, logger
  scripts/      migrate + one-off maintenance scripts (all guarded)
frontend/src/
  app/          public routes and /admin panel routes
  components/   admin/, layout/, nova/ (public design system), shared/, ui/
  lib/          api client, permissions map, media helpers, sanitizeHtml
  store/        RTK Query slices: apiSlice (public), adminApi (panel)
database/
  migrations/   ordered, idempotent .sql
  scripts/      package-cpanel.mjs — builds the two upload bundles
docs/
  CPANEL-DEPLOYMENT.md  deploying to cPanel, start to finish
  OPERATIONS.md         backup, recovery and incident runbook
```

---

## Things worth knowing before you change something

- **Public responses are served verbatim.** Text is not rewritten on the way
  out. A previous version replaced "Deder"/"Gambo"/"Loke" with "Melka Oda" in
  every public response, which corrupted real Ethiopian place names and made the
  public site disagree with the editor. Rebranding is a data migration.
- **Uploads are checked by content, not just extension.** `assertUploadContent`
  compares magic bytes against the claimed type.
- **Résumés are private.** On Cloudinary they use the `authenticated` delivery
  type; on local disk they are written under `storage/private/`, outside every
  statically-served directory. Either way they are reached only through
  `GET /admin/job-applications/:id/resume`, which writes an audit entry naming
  who opened whose file. Never put one in a list payload.
- **Every route handler is wrapped.** `safeRouter` catches rejected promises;
  Express 4 does not, and an unwrapped async throw returns no response at all.
- **Media has two drivers.** `MEDIA_DRIVER=local` writes to this account's disk
  (correct on cPanel, where it is durable); `cloudinary` is for hosts with an
  ephemeral disk. Production must state one — there is no silent default.
- **CMS HTML is sanitised at render**, in `Prose` and `AdminCrudPage`, via
  DOMPurify. Do not add a third `dangerouslySetInnerHTML` without it.

---

## Documentation

- [`docs/CPANEL-DEPLOYMENT.md`](docs/CPANEL-DEPLOYMENT.md) — deploying to
  cPanel: database migration, both Passenger apps, media, HTTPS, redeploys.
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md) — environment variables, backup and
  restore, incident response, pre-launch checklist.
- [`backend/.env.example`](backend/.env.example) — every variable the API reads,
  with what happens when it is wrong.
