# DM SimLab Deployment Guide

This document outlines the procedures for deploying DM SimLab to production. The platform is structured as a full-stack Node.js monorepo composed of a Fastify backend API (with PostgreSQL/Redis/Prisma) and a Vite-built React frontend.

---

## 1. Production Requirements

- **Node.js**: v18+ (LTS recommended)
- **Docker & Docker Compose**: For containerized PostgreSQL database, Redis store, and optional Ollama service.
- **Database**: PostgreSQL v16 (local or managed cloud service like AWS RDS, GCP Cloud SQL, Supabase).
- **Caching & WebSocket adapter**: Redis v7 (required for scaling WebSockets and job queues).
- **Reverse Proxy**: Nginx or Traefik with TLS/SSL certificate protection.
- **Process Manager**: PM2 (if deploying bare-metal) or Docker Compose (containerized).

---

## 2. Production Environment Setup

### Backend Environment Variables (`apps/backend/.env`)

Configure the following variables for production deployment:

```env
# Application Settings
PORT=5000
NODE_ENV=production

# Database Connection (Direct Prisma pool URI)
DATABASE_URL="postgresql://<username>:<password>@<db-host>:<db-port>/dmsimlab?schema=public"

# Redis Server Connection
REDIS_URL="redis://<redis-host>:<redis-port>"

# Better Auth Secret (Generate using: openssl rand -hex 32)
BETTER_AUTH_SECRET="your-super-secret-auth-hash"
BETTER_AUTH_URL="https://api.yourdomain.com"

# CORS Allowed Origins
FRONTEND_URL="https://simlab.yourdomain.com"

# Optional AI Configuration
OLLAMA_HOST="http://ollama-host:11434"
OLLAMA_MODEL="qwen2.5:7b"
```

### Frontend Environment Variables (`apps/frontend/.env`)

Configure the API endpoint root pointing to the backend domain:

```env
# API URL Base Endpoint
VITE_API_URL="https://api.yourdomain.com"
```

---

## 3. Deployment Methods

### Method A: Docker Compose Orchestration (Containerized)

We provide a production orchestration file at `apps/backend/docker-compose.prod.yml`.

1. **Copy environments**: Set up `.env` files inside `apps/backend` and `apps/frontend`.
2. **Build and start services**:
   ```bash
   cd apps/backend
   docker compose -f docker-compose.prod.yml up -d --build
   ```
   This initializes:
   - **app**: The compiled Fastify application server listening on port `5000`.
   - **postgres**: A persistent PostgreSQL instance.
   - **redis**: Cache database for Socket.io.
   - **ollama**: Large Language Model host (optional).

3. **Verify running containers**:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

---

### Method B: Bare-Metal Deployment (Nginx + PM2)

Use this method if deploying on a VPS (e.g. AWS EC2, DigitalOcean Droplet, Linode) without Docker.

#### 1. Setup PostgreSQL & Redis
- Install PostgreSQL and create database `dmsimlab`.
- Install Redis-server.

#### 2. Deploy Backend
1. Clone the codebase and install workspace dependencies:
   ```bash
   npm install --production=false
   ```
2. Navigate to the backend folder and compile:
   ```bash
   cd apps/backend
   npm run prisma:generate
   npx prisma migrate deploy
   npm run build
   ```
3. Start the process using PM2:
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

#### 3. Deploy Frontend
1. Navigate to the frontend directory:
   ```bash
   cd apps/frontend
   ```
2. Build the production bundle:
   ```bash
   npm run build
   ```
   This generates static assets in the `apps/frontend/dist` directory.
3. Configure **Nginx** to serve the static assets and reverse proxy the API requests:
   ```nginx
   server {
       listen 80;
       server_name simlab.yourdomain.com;

       location / {
           root /var/www/simlab/apps/frontend/dist;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       location /api/ {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
       }
   }
   ```

---

## 4. Maintenance Operations

### Schema Upgrades
When pulling schema changes, apply existing migrations to the database directly:
```bash
cd apps/backend
npx prisma migrate deploy
```

### Database Backup
Back up your database using PostgreSQL `pg_dump`:
```bash
docker exec -t <postgres-container-id> pg_dump -U postgres dmsimlab > backup.sql
```
