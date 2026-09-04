# Operations runbook

Deployment, backup, recovery and incident procedure for the Melka Oda General
Hospital platform.

---

## 1. Services

| Service | Render name | Root | Health |
|---|---|---|---|
| API | `melkaoda-hospital-api` | `backend/` | `GET /health` — returns `{ok, db}` |
| Web | `melkaoda-hospital-web` | `frontend/` | `GET /` |

Both are defined in `render.yaml`. The database is MySQL 8.4 on Aiven; media is
on Cloudinary.

> **Both services are on Render's free plan.** That means an ephemeral disk, no
> autoscaling, and a cold start measured at over 60 seconds after idle. Move
> them to a paid always-on plan before launch.

> **The public identity is `melkaoda-web.onrender.com`** — a PaaS subdomain, not
> a hospital-owned domain. Attach a real domain *before* search engines index
> the current URLs; migrating later forfeits accumulated SEO.

---

## 2. Environment variables

`backend/.env.example` is the reference: every variable the API reads, with a
comment on what breaks when it is wrong. The Render dashboard is the source of
truth for what is actually deployed — not any file in this repository.

Variables that must be right, and what happens when they are not:

| Variable | Wrong value costs you |
|---|---|
| `NODE_ENV` | Anything but `production` disables every production guard, error masking and the Cloudinary requirement |
| `JWT_SECRET` | A weak key is the only thing between a stranger and a forged admin token. ≥32 random characters |
| `ADMIN_PASSWORD` | ≥16 characters, three character classes, no dictionary stem — the API refuses to boot otherwise |
| `ROOT_ADMIN_EMAILS` | Governs who may manage other super admins. **Only applied when `SCHEMA_BOOTSTRAP` is on** |
| `TRUST_PROXY_HOPS` | Too high lets a client forge `X-Forwarded-For` and evade rate limiting; too low puts every caller in one bucket. Render edge + Next rewrite = `2` |
| `SCHEMA_BOOTSTRAP` | Leave at `0`. Otherwise every boot issues DDL and seeds data |
| `DB_SSL_INSECURE` | Encrypts the database link without authenticating the server. Never set it; provide `MYSQL_ATTR_SSL_CA` instead |
| `FRONTEND_URL` | CORS denies every cross-origin request without it |
| `MAIL_*` | Without these, contact replies, application receipts and password resets are silently never delivered |

**Never keep a copy of the deployed environment in the repository folder.** It
carries the database password, the JWT signing key, the Cloudinary secret and
the mail password. If one has been copied anywhere, rotate it.

---

## 3. Deploying

Render builds on push to `main`. CI must be green first
(`.github/workflows/ci.yml`).

Schema changes are **not** applied by a deploy — `SCHEMA_BOOTSTRAP=0`. Run them
deliberately:

```bash
cd backend
npm run migrate
```

Rehearse against a restored copy first. Every migration must be idempotent (see
the README).

---

## 4. Backup and recovery

> **Status: not yet verified.** A backup that has never been restored is not a
> backup. Everything below is the target state; work through it and record the
> dates.

### 4.1 What must be backed up

| Store | Contains | Backed up? |
|---|---|---|
| MySQL (Aiven) | All content, users, audit log, form submissions | ☐ Enable Aiven automated backups, ≥30 days retention |
| Cloudinary | Every image, document and résumé | ☐ Not currently in scope — add it |
| Render disk | Nothing durable — ephemeral | n/a |

### 4.2 Targets

Agree these with the hospital and write the agreed numbers here:

- **RPO** (acceptable data loss): ______
- **RTO** (acceptable time to restore): ______

Neither can be claimed until section 4.4 has been completed at least once.

### 4.3 Taking a manual backup

```bash
mysqldump --single-transaction --routines --set-gtid-purged=OFF \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p "$DB_DATABASE" \
  | gzip > "melkaoda-$(date +%F).sql.gz"
```

**Store it in encrypted object storage. Never in the repository, never in a
shared folder, never in an email.** A dump of this database contains
administrator password hashes and the personal data of members of the public who
used the contact form.

### 4.4 Restore drill — do this before launch, then quarterly

1. Create an empty staging database.
2. Restore the most recent backup into it.
3. Point a local API at it (`backend/.env`, `SCHEMA_BOOTSTRAP=0`).
4. Verify: an administrator can sign in; one CMS page renders; one image loads;
   `/health` reports `db: up`.
5. **Record the wall-clock time from step 1 to step 4. That is your real RTO.**
6. Note the date and result below.

| Date | Restored from | Measured RTO | Result | By |
|---|---|---|---|---|
| | | | | |

---

## 5. Monitoring

> **Status: none in place.** No uptime check, no error tracking, no log
> retention, no alerting. Set up at least the following.

| Signal | Source | Alert when |
|---|---|---|
| Availability | `GET /health` every minute | Two consecutive failures |
| Database | `/health` `db` field | `down` |
| Error rate | API 5xx | >1% of requests over 5 minutes |
| Latency | API p95 | >2s over 10 minutes |
| Failed logins | `audit_logs` where `action='login_failed'` | >20 in 10 minutes |
| Account lockouts | log line `account_locked` | Any |
| Mail delivery | log line `mail_failed` | Any |
| Disk / memory | Render metrics | >85% |

Logs are JSON lines on stdout (`utils/logger.js`). Ship them to a retained sink;
Render's own retention is short.

---

## 6. Incident response

### Suspected credential compromise

1. Rotate `JWT_SECRET` in the Render dashboard and redeploy. **This invalidates
   every issued token immediately** — it is the fastest global sign-out.
2. Rotate the database password, the Cloudinary secret and the mail password.
3. Force-reset the affected accounts (Admin → Users, set a new password). This
   also sets `password_changed_at`, ending that user's other sessions.
4. Review `audit_logs` for the period: filter by `action` = `login`,
   `login_failed`, `download`, and by user.

### Locked out of the panel entirely

1. Use the password reset link on the sign-in page. It requires `MAIL_*` to be
   configured.
2. If mail is down: set `ADMIN_RESET_PASSWORD=1` in the Render dashboard with a
   known good `ADMIN_EMAIL` / `ADMIN_PASSWORD`, redeploy once, sign in, then
   **remove the variable and redeploy again**.

### A user is locked out by failed attempts

Ten failures locks an account for 15 minutes (`LOGIN_MAX_ATTEMPTS`,
`LOGIN_LOCK_MINUTES`). To clear it early:

```sql
UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE email = ?;
```

### Database unreachable

`/health` returns 503 with a fixed message; the API stays up and public pages
serve from cache for up to 60 seconds. Check Aiven status and the connection
limit (the pool is 20 per process).

---

## 7. Administrator accounts

Review quarterly. The production database has previously carried active
super-admin accounts belonging to unrelated predecessor projects.

```sql
-- Who has full access?
SELECT u.id, u.email, u.status, u.is_root_admin, u.last_login_at
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
WHERE r.slug IN ('super_admin','admin') AND u.deleted_at IS NULL
ORDER BY u.is_root_admin DESC, u.id;
```

Every row must correspond to a named, current member of staff. Offboard the rest
(Admin → Users → Deactivate). The root-admin tier should be held by one or two
people, on hospital-controlled addresses — not personal consumer mailboxes.

`ROOT_ADMIN_EMAILS` only takes effect when `SCHEMA_BOOTSTRAP` is on. With it off
in production, set the flag directly:

```sql
UPDATE users SET is_root_admin = 0;
UPDATE users SET is_root_admin = 1 WHERE email IN ('...');
```

---

## 8. Pre-launch checklist

Data and accounts:

- [ ] Every super-admin and admin account accounted for by name; the rest disabled
- [ ] `is_root_admin` set deliberately, on hospital-controlled addresses
- [ ] Test rows removed: role "test name", permission "test", gallery "test titleeeee", test contact submissions
- [ ] Legacy `/storage/...` avatars migrated or cleared (users 1, 3, 5)
- [ ] Rebrand run once as a data migration, so stored text says "Melka Oda"

Secrets:

- [ ] Database dumps purged from git history; all nine leaked account passwords reset
- [ ] `JWT_SECRET`, `DB_PASSWORD`, `CLOUDINARY_API_SECRET`, `MAIL_PASSWORD` rotated
- [ ] No `.env` or dump anywhere under the project folder
- [ ] `ADMIN_PASSWORD` regenerated (`openssl rand -base64 24`)

Configuration:

- [ ] `NODE_ENV=production`, `SCHEMA_BOOTSTRAP=0`, `TRUST_PROXY_HOPS=2`
- [ ] `DB_SSL_INSECURE` absent; `MYSQL_ATTR_SSL_CA` set
- [ ] `MAIL_*` configured and a test reply received
- [ ] `SITE_URL` set to the final domain

Infrastructure:

- [ ] Both services on a paid always-on plan
- [ ] Custom domain attached and TLS verified
- [ ] Automated backups enabled with ≥30 days retention
- [ ] One restore drill completed and recorded in section 4.4
- [ ] Uptime, error and latency alerting live

Verification:

- [ ] CI green
- [ ] `npm run migrate` runs clean twice against a restored copy
- [ ] A job application submitted publicly appears in Admin → Applications
- [ ] A gallery item switched off disappears from `/gallery`
- [ ] A résumé URL without a signature returns 401/404
