# Loke General Hospital

Modern hospital website rebuilt from the Deder Hospital platform with a **new technology stack** and a **completely redesigned frontend**.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Redux Toolkit + RTK Query, shadcn-style UI, Framer Motion |
| Backend | Node.js, Express, MySQL (same schema as the original hospital CMS) |
| Media | Local uploads or Cloudinary |

## Features

- Full public hospital website (departments, doctors, services, news, gallery, careers, events, FAQs, emergency, insurance, health education, CMS pages)
- Complete Admin CMS (same modules as the original panel, **excluding appointments**)
- **Leadership History** — chronological former leaders with admin CRUD + public timeline page
- JWT admin auth, media library, contact inbox, settings, roles/users, audit logs

## Project structure

```
loke-general-hospital/
├── frontend/          # Next.js app (public site + /admin)
├── backend/           # Express API
└── database/          # SQL migrations (leadership_history)
```

## Quick start

### 1. Database

Use the **existing MySQL database** from the Deder Hospital project (same tables). Then add the new table:

```bash
cd backend
cp .env.example .env   # set DB_* credentials
npm install
npm run migrate:leadership-history
```

### 2. Backend

```bash
cd backend
npm run dev
# API → http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # or use existing .env.local
npm install
npm run dev
# Site → http://localhost:3000
# Admin → http://localhost:3000/admin/login
```

Default admin (from shared DB): `admin@dederhospital.com`

## Design

Premium editorial hospital identity — deep teal, warm brass, Fraunces + Outfit typography, full-bleed heroes, and motion — intentionally distinct from the previous purple/blue UI.

## API

All routes are under `/api/v1`:

- Public: `/public/*`
- Admin: `/admin/*` (Bearer JWT)

Health check: `GET /health`
