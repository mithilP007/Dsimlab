# DM SimLab — Real-Time Trend-Based Digital Marketing Simulation Lab

DM SimLab is a Real-Time Trend-Based Digital Marketing Simulation Lab for universities, instructors, students, and individual learners. It supports SEO, Google Ads, Meta Ads-style campaign simulation, role-based dashboards, daily decision locking, checkpoint justification, accreditation reports, certificates, and Super Admin platform management.

| Service | URL |
|---------|-----|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:5000` |
| Swagger Docs | `http://localhost:5000/docs` |

---

## Final Release Quality Checklist
- [x] **Backend tests**: 126/126 passed
- [x] **Frontend build**: passed
- [x] **Prisma migrations**: up to date
- [x] **E2E Playwright**: passed
- [x] **RBAC/security**: passed
- [x] **Super Admin**: completed
- [x] **Instructor**: completed
- [x] **Student**: completed
- [x] **Individual learner**: completed
- [x] **Certification**: completed

---

## Prerequisites

Make sure you have these installed before starting:

- [Node.js](https://nodejs.org/) v18+ (check: `node -v`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for the database)
- Git

---

## Quick Start (First Time)

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd <repo-folder>
```

### 2. Install all dependencies

```bash
npm install
```

> This installs dependencies for both `apps/frontend` and `apps/backend` via npm workspaces.

---

### 3. Set up the Backend

#### 3a. Start the database (Docker required)

```bash
cd apps/backend
docker compose -f docker-compose.dev.yml up -d
```

This starts:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`

Verify they are running:
```bash
docker compose -f docker-compose.dev.yml ps
```

Both services should show `healthy`.

---

#### 3b. Create your `.env` file

```bash
cp .env.example .env
```

The defaults in `.env.example` work out-of-the-box with the Docker setup above — **you don't need to change anything** for local development.

---

#### 3c. Run database migrations

```bash
npx prisma migrate dev
```

This creates all the database tables. You only need to do this once (or after pulling new migrations).

---

#### 3d. Start the backend

```bash
npm run dev
```

You should see:
```
INFO: HTTP Server listening on http://0.0.0.0:5000
INFO: Socket.io WebSocket server initialised.
```

---

### 4. Set up the Frontend (new terminal)

```bash
cd apps/frontend
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Running Both Together (from repo root)

```bash
# Terminal 1 — backend
cd apps/backend && npm run dev

# Terminal 2 — frontend
cd apps/frontend && npm run dev
```

---

## Stopping the Database

```bash
cd apps/backend
docker compose -f docker-compose.dev.yml down
```

To also delete all database data (full reset):
```bash
docker compose -f docker-compose.dev.yml down -v
```

---

## Common Problems & Fixes

### `Can't reach database server at localhost:5432`
Docker is not running or the container hasn't started yet.
```bash
# Start Docker Desktop first, then:
docker compose -f docker-compose.dev.yml up -d
```

### `prisma migrate dev` fails with "schema not found"
Make sure you are running the command from inside `apps/backend/`, not the repo root.

### Port `5432` already in use
You have a local PostgreSQL installation. Either stop it or change the port in `docker-compose.dev.yml`:
```yaml
ports:
  - "5433:5432"   # host port 5433 → container 5432
```
Then update `DATABASE_URL` in `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/dmsimlab?schema=public"
```

### Port `5000` already in use
Change the `PORT` in `apps/backend/.env`:
```env
PORT=5001
```

### Backend starts but shows Redis errors
Redis is optional. The app falls back to in-memory mode automatically.  
If you want to enable it, make sure Docker is running the dev stack and uncomment `REDIS_URL` in `.env`.

### Frontend shows auth/API errors
Make sure the backend is running on port `5000` before opening the frontend.

---

## Project Structure

```
.
├── apps/
│   ├── backend/      Fastify + Prisma + TypeScript  → :5000
│   └── frontend/     Vite + React 19 + TypeScript   → :5173
└── package.json      npm workspaces root
```

See [apps/backend/BACKEND_HANDOFF.md](apps/backend/BACKEND_HANDOFF.md) for full API docs and WebSocket events.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Zustand, Tailwind CSS v4 |
| Backend | Fastify v4, TypeScript, Prisma v5 |
| Database | PostgreSQL 16 (Docker) |
| Auth | better-auth (session cookies) |
| Real-time | Socket.io |
| Job Queue | BullMQ + Redis (optional, in-memory fallback) |
| AI Insights | Ollama (optional, rules-based fallback) |
