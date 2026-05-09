# Operation Tracking Dashboard

A fullstack incident/ticket management dashboard. React frontend, Express + Postgres backend, JWT auth.

## Repo Layout

```
client/     # React + Vite frontend
server/     # Express + Postgres backend
```

Each app has its own `package.json` and its own `.env`. Never combine them — Vite inlines client env vars into the public bundle, so server secrets must stay in `server/.env`.

## Prerequisites

- Node.js 18+ (project tested on 20 and 22)
- PostgreSQL 14+ running locally
- `psql` on PATH (used by the seed script)

## First-Time Setup

### 1. Create the database

```bash
createdb operation_tracking_dashboard
```

(Or via `psql`: `CREATE DATABASE operation_tracking_dashboard;`)

### 2. Configure the backend

```bash
cd server
cp .env.example .env
npm install
```

Open `server/.env` and fill in the values. The most important one is `JWT_SECRET` — the server **refuses to boot** without a real secret. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the output as the value of `JWT_SECRET`. Confirm `DATABASE_URL` matches your Postgres setup and `CORS_ORIGIN` matches the URL Vite serves on (default `http://localhost:5173`).

### 3. Seed the database

From inside `server/`:

```bash
npm run seed
```

This drops and recreates the schema, then loads demo data. **Re-run it whenever the schema changes** — the project does not yet have a real migrations tool.

The seed creates three demo accounts:

| Email | Password | Role |
|---|---|---|
| admin@nokia.com | admin1234 | admin |
| operator@nokia.com | operator1234 | operator |
| viewer@nokia.com | viewer1234 | viewer |

### 4. Configure the frontend

```bash
cd ../client
cp .env.example .env
npm install
```

The default `VITE_API_URL=/api` works with the Vite dev proxy — no edits needed unless you change the backend port.

## Running

Two processes, two terminals.

```bash
# Terminal 1 — backend
cd server
npm run dev          # nodemon, watches server/src
```

```bash
# Terminal 2 — frontend
cd client
npm run dev          # Vite, default http://localhost:5173
```

Vite's dev server proxies `/api/*` to `http://localhost:3001`, so the frontend code only ever talks to `/api/...`.

Visit `http://localhost:5173` and log in with one of the demo accounts.

## Common Tasks

**Reset the database** (wipes data, reapplies schema, reloads demo accounts and tickets):

```bash
cd server && npm run seed
```

**Rotate the JWT secret**: change `JWT_SECRET` in `server/.env` and restart the backend. All existing logins are invalidated — every user has to sign in again.

**Production build of the client**:

```bash
cd client && npm run build
# Output in client/dist/
```

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Server exits on boot with `JWT_SECRET is set to a known placeholder value` | You haven't generated a real secret yet — see step 2 above. |
| `column t.<x> does not exist` after pulling new code | Schema drift. Re-run `npm run seed` in `server/`. |
| CORS error in the browser console | `CORS_ORIGIN` in `server/.env` doesn't match the URL Vite is serving on. |
| 401s after restarting the backend | You changed `JWT_SECRET`. Log out and log in again. |

## API Surface

All `/api/*` routes except `/api/health` and `/api/auth/*` require a `Bearer` token.

```
GET    /api/health
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/auth/me

GET    /api/tickets
POST   /api/tickets                 (admin, operator)
PUT    /api/tickets/:id             (admin, operator — operators limited to own/assigned)
DELETE /api/tickets/:id             (admin, operator — operators limited to own)
GET    /api/tickets/:id
GET    /api/tickets/:id/history
GET    /api/tickets/:id/comments
POST   /api/tickets/:id/comments    (admin, operator)
DELETE /api/tickets/:id/comments/:commentId

GET    /api/users
PATCH  /api/users/:id/role          (admin)
```
