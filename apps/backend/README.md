# Marketing Simulation Backend

This is the backend server for the Digital Marketing Simulation platform, built using Node.js, TypeScript, Fastify, Prisma (PostgreSQL), BullMQ, and Socket.io.

---

## Table of Contents
1. [Setup Instructions](#setup-instructions)
2. [Docker Commands](#docker-commands)
3. [Redis Configuration & Port Note](#redis-configuration--port-note)
4. [Prisma Database Migration Commands](#prisma-database-migration-commands)
5. [Development & Build Scripts](#development--build-scripts)
6. [API & Swagger Documentation URLs](#api--swagger-documentation-urls)
7. [WebSocket Event Directory](#websocket-event-directory)
8. [Ollama Local LLM Setup](#ollama-local-llm-setup)
9. [Certificate Upload Path](#certificate-upload-path)

---

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in the required values:
   ```bash
   cp .env.example .env
   ```

3. **Initialize Database Schema and Seeding**:
   ```bash
   npx prisma migrate dev
   npm run prisma:seed
   ```

4. **Run the Server in Development Mode**:
   ```bash
   npm run dev
   ```

---

## Docker Commands

To run all application dependencies (PostgreSQL database, Redis, and Ollama) or run the entire backend containerized:

* **Start all background services (recommended for local development)**:
  ```bash
  docker compose up -d postgres redis ollama
  ```

* **Start the full stack (including the app itself)**:
  ```bash
  docker compose up -d
  ```

* **Stop all running containers**:
  ```bash
  docker compose down
  ```

---

## Redis Configuration & Port Note

The application uses Redis for BullMQ task scheduling and Socket.io scaling.
* **Default Port**: By default, Redis runs on port `6379`.
* **Configuring URL**: You can change the target host or port by setting `REDIS_URL` in your `.env` file (e.g. `REDIS_URL="redis://127.0.0.1:6379"`).

---

## Prisma Database Migration Commands

Ensure database schemas are synced and migration tracking is clean:

* **Check Migration Status** (non-destructive):
  ```bash
  npx prisma migrate status
  ```

* **Run Dev Migrations** (creates/applies pending migrations, can reset database if out of sync):
  ```bash
  npx prisma migrate dev
  ```

* **Deploy Migrations in Production** (safely runs pending migrations without database push / reset):
  ```bash
  npx prisma migrate deploy
  ```

* **Open Prisma Studio UI**:
  ```bash
  npx prisma studio
  ```

> [!WARNING]
> Do not use `npx prisma db push` for production changes. Always use `npx prisma migrate deploy` to apply migrations deterministically.

---

## Development & Build Scripts

The package includes the following scripts under `package.json`:

* **Start Development Mode** (auto-restart on changes):
  ```bash
  npm run dev
  ```

* **Compile TypeScript Build** (compiles TS files into the `dist/` directory):
  ```bash
  npm run build
  ```

* **Start Production Build** (runs the compiled JavaScript in `dist/index.js`):
  ```bash
  npm run start
  ```

* **Run Unit & Integration Tests**:
  ```bash
  npm run test
  ```

---

## API & Swagger Documentation URLs

* **API Base URL**: `http://localhost:5000` (or configured `PORT` / `BETTER_AUTH_URL`)
* **Swagger/OpenAPI Documentation UI**: `http://localhost:5000/docs`
* **Static OpenAPI JSON Spec**: Generated dynamically on startup at `openapi.json` (also served at `/docs/json`).

---

## WebSocket Event Directory

The real-time notification layer is powered by Socket.io. Clients can subscribe to specific rooms and receive status events.

### Client-to-Server Subscription Events
* `join-user` (Payload: `userId` string) - Joins the private room `user:${userId}` to receive user-level notifications.
* `join-simulation` (Payload: `simulationId` string) - Joins the room `simulation:${simulationId}` to receive round processing and simulation updates.
* `join` (Payload: `userId` string) - Legacy event kept for backwards compatibility.

### Server-to-Client Broadcast Events
* `round:complete` - Emitted when a simulation round finishes processing.
* `simulation:status` - Emitted when a simulation status changes (e.g., `DECISION_OPEN`, `PROCESSING`, `RESULTS_READY`).
* `ai:insight` - Emitted when AI recommendations or insight generation finishes.
* `instructor:event` - Emitted when instructors alter cohort-wide simulation parameters.

---

## Ollama Local LLM Setup

AI Insights require a running instance of Ollama:

1. **Install Ollama**: Download and install from [ollama.com](https://ollama.com).
2. **Pull the Required Model**:
   ```bash
   ollama pull qwen2.5:7b
   ```
3. **Configure Environment Variables**: Set `OLLAMA_HOST` (e.g., `http://127.0.0.1:11434`) and `OLLAMA_MODEL` (e.g., `qwen2.5:7b`) in your `.env`.

---

## Certificate Upload Path

* Generated PDF certificates are automatically saved to the local folder:
  `uploads/certificates` under the backend project root.
* Ensure this directory is write-accessible by the Node.js server.

---

## Production Deployment Instructions

Follow these instructions to host the backend application in a production environment.

### Hosting Platforms

#### 1. Railway (Recommended)
Railway is highly recommended for Docker-based deployments since it automatically reads the multi-stage `Dockerfile`.
1. Create a new project on Railway.
2. Link your GitHub repository.
3. Add a **PostgreSQL** database service and a **Redis** service from the Railway templates.
4. Set the backend service environment variables (copy from `.env.production.example`):
   - `DATABASE_URL`: Set to the PostgreSQL service connection string.
   - `REDIS_URL`: Set to the Redis service connection string.
   - `BETTER_AUTH_SECRET`: Add a secure 32-character random string.
   - `BETTER_AUTH_URL`: The URL of your deployed Railway app (e.g. `https://your-backend.up.railway.app`).
   - `FRONTEND_URL`: The URL of your deployed frontend app (e.g. `https://your-frontend.vercel.app`).
   - `PORT`: Set to `5000` (or let Railway assign it).
5. Deploy. Railway will build the Dockerfile and launch the container.

#### 2. Render
1. Create a new **Web Service** on Render.
2. Link your GitHub repository.
3. Select **Docker** as the Runtime (Render will automatically use the `Dockerfile`).
4. Under Environment, add all variables from `.env.production.example`.
5. Connect to external databases (e.g. Neon for Postgres, Upstash for Redis).
6. Set the `PORT` to `5000`.

#### 3. Fly.io or VPS
For a standard Linux VPS (e.g. DigitalOcean, AWS EC2):
1. Install Node.js v20, Docker, and PM2.
2. Clone the repository and install dependencies: `npm install --production --legacy-peer-deps`.
3. Create `.env` containing your production environment secrets.
4. Run migrations: `npx prisma migrate deploy`.
5. Run using PM2 cluster mode:
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

---

### Database and Cache Services

#### Neon PostgreSQL
For a serverless PostgreSQL database (like Neon):
1. Sign up on [Neon.tech](https://neon.tech) and create a database.
2. Copy the connection string.
3. Use the transaction connection string (usually port `5432` or pooler) for `DATABASE_URL`.
4. Ensure `?sslmode=require` is appended to the connection string.

#### Redis Cloud / Upstash Redis
For serverless or cloud-hosted Redis:
1. Sign up on [Upstash](https://upstash.com) or [Redis Labs](https://redis.io/cloud).
2. Create a Redis database and copy the Redis URL (e.g., `redis://default:password@endpoint.upstash.io:6379`).
3. Set the `REDIS_URL` env variable in your backend host.

---

### AI Ollama Cloud/Local Limitation & Fallback

> [!IMPORTANT]
> If your backend is deployed to a cloud environment (e.g. Render, Railway, Fly.io) and your Ollama model is running on your local computer, the cloud-hosted backend **cannot** access your local machine's Ollama instance.
>
> **Implications**:
> - To run AI insights in production, you must host Ollama on a cloud server (e.g., a VPS with GPU/CPU capability) or modify the service client to use an API model.
> - **However, the application will still function correctly**: The backend implements an automatic connection fallback. If the backend fails to connect to Ollama, it falls back to a deterministic, rule-based analytics engine that generates structure-compliant campaign recommendations. No crashes will occur.

---

### Frontend Deployment Connection & CORS Settings

When deploying the frontend (e.g., on Vercel, Netlify, or Amplify):

1. **Frontend Environment Variables**: Set the backend base URL.
   - For Vite (`.env.production`):
     ```env
     VITE_API_BASE_URL=https://your-backend-app.railway.app
     VITE_WS_URL=https://your-backend-app.railway.app
     ```
   - For Next.js (`.env.production`):
     ```env
     NEXT_PUBLIC_API_BASE_URL=https://your-backend-app.railway.app
     NEXT_PUBLIC_WS_URL=https://your-backend-app.railway.app
     ```
2. **Backend CORS Settings**:
   - Ensure the backend environment variable `FRONTEND_URL` is set to the exact URL of your deployed frontend (e.g. `https://your-frontend.vercel.app`).
   - The backend reads `FRONTEND_URL` on startup to register the allowed origin for CORS cookies and authorization.

