# Digital Marketing Simulation Lab — Backend Developer Handoff

Welcome! This document is designed to help the frontend developer understand and connect their application to the digital marketing simulation backend.

---

## A. Project Overview
This backend runs the **Digital Marketing Simulation Lab**. It simulates search engine optimization (SEO), Google Ads search campaigns, and Meta Ads social campaigns. Students submit marketing decisions, and the backend processes daily click, conversion, impression, and revenue metrics over 30-day simulation rounds, scoring their strategic alignment and efficiency.

### Technology Stack
- **Language**: TypeScript (running on Node.js / Fastify)
- **Database**: PostgreSQL (managed via Prisma ORM)
- **Event Queue / Real-time Adapter**: Redis (using BullMQ and Socket.io)
- **WebSockets**: Socket.io for live notifications and round advance events
- **Authentication**: Better Auth (session cookie-based)
- **AI Core**: Ollama local LLM wrapper (with standard deterministic mock fallback)

### API Connection Details
- **API Base URL**: `http://localhost:5000`
- **WebSocket URL**: `http://localhost:5000`
- **Swagger Documentation UI**: `http://localhost:5000/docs`
- **OpenAPI Schema (JSON)**: `http://localhost:5000/docs/json`

---

## B. Local Setup Steps
To run this backend repository locally, execute the following steps in your terminal:

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   ```
2. **Navigate to the backend directory**:
   ```bash
   cd apps/backend
   ```
3. **Install node dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```
4. **Prepare environment variables**:
   Create a local `.env` configuration file by duplicating the example:
   ```bash
   cp .env.example .env
   ```
5. **Update `.env` values**:
   Review `.env` and verify that database and port settings match your environment.
6. **Start PostgreSQL, Redis, and Ollama containers**:
   Spin up the required background systems using Docker Compose:
   ```bash
   docker compose up -d postgres redis ollama
   ```
7. **Generate the Prisma client**:
   ```bash
   npx prisma generate
   ```
8. **Run database migrations**:
   Apply migrations to set up your database tables and seed initial scenarios:
   ```bash
   npx prisma migrate dev
   ```
9. **Run the integration test suite**:
   Ensure everything is operating correctly:
   ```bash
   npm run test
   ```
10. **Start the development server**:
    ```bash
    npm run dev
    ```

---

## C. Windows Redis Note
If port `6379` is blocked on your Windows machine (e.g. by a native Windows Redis service), start a Docker Redis container bound to port `26379`:
```bash
docker run -d --name dmsimlab-redis -p 127.0.0.1:26379:6379 redis:7-alpine
```
Then, update your `.env` file to point to this port:
```env
REDIS_URL=redis://127.0.0.1:26379
```

---

## D. Required Frontend Environment Variables
Configure your frontend build parameters to point to the local backend:

- **Vite-based Frontends (`.env.local`)**:
  ```env
  VITE_API_BASE_URL=http://localhost:5000
  VITE_WS_URL=http://localhost:5000
  ```
- **Next.js-based Frontends (`.env.local`)**:
  ```env
  NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
  NEXT_PUBLIC_WS_URL=http://localhost:5000
  ```

---

## E. Frontend Auth Notes
- **Mechanism**: The backend integrates **Better Auth** which utilizes HTTP-only session cookies.
- **Credential Passing**: Ensure that your frontend HTTP client (Fetch, Axios, etc.) is configured to transmit credentials.
  - *Axios*: Set `{ withCredentials: true }` globally or per request.
  - *Fetch*: Set `{ credentials: 'include' }` in the request options.
- **Session Resolution**: Call `GET /api/me` to retrieve the current logged-in user profile.
- **Guard Enforcement**: If a student is unauthenticated or has an expired session, the backend will return an HTTP status code `401 Unauthorized` with a JSON payload:
  ```json
  {
    "success": false,
    "error": "Unauthorized access",
    "code": "UNAUTHORIZED"
  }
  ```

---

## F. Main Endpoints for Frontend

Here are the primary endpoints that your frontend will interact with:

| Component | Method & Route | Description |
| :--- | :--- | :--- |
| **Auth** | `POST /api/auth/sign-up/email` | Registers a new student or instructor. |
| | `POST /api/auth/sign-in/email` | authenticates credentials and sets cookie. |
| | `POST /api/auth/sign-out` | Expires the current auth cookie session. |
| | `GET /api/me` | Fetches active session user details. |
| **Simulation** | `POST /api/simulations` | Initializes a new simulation state. |
| | `GET /api/simulations/:id` | Fetches current state (status, currentRound, score). |
| | `POST /api/simulations/:id/decisions` | Saves/locks student decisions for the current round. |
| | `POST /api/simulations/:id/advance` | Runs the processing engine, calculates scores, moves round. |
| | `GET /api/simulations/:id/metrics` | Fetches aggregated daily data for graphs. |
| | `GET /api/simulations/:id/snapshots` | Retrieves historical completed round reports. |
| **SEO** | `GET /api/seo/keywords` | Returns the list of standard keywords and volumes. |
| | `GET /api/seo/metrics/:simulationId` | Retrieves specific SEO click/conversion reports. |
| **Google Ads** | `GET /api/google-ads/benchmarks` | Fetches platform CTR, CPC, and impression averages. |
| | `POST /api/google-ads/decisions` | Validates bidding configurations. |
| | `GET /api/google-ads/metrics/:simulationId` | Returns Google campaign daily results. |
| **Meta Ads** | `GET /api/meta-ads/audiences` | Fetches available interest segments and costs. |
| | `GET /api/meta-ads/placements` | Returns standard placement CTR adjustments. |
| | `GET /api/meta-ads/metrics/:simulationId` | Returns Meta campaign daily results. |
| **Scenario** | `POST /api/scenarios` | Creates a new simulator parameters blueprint. |
| | `GET /api/scenarios` | Lists available course templates. |
| | `GET /api/scenarios/:id` | Returns a specific scenario configuration. |
| | `POST /api/scenarios/:id/assign` | Links a scenario template to a class. |
| **Classes** | `POST /api/classes` | Creates a new class workspace. |
| | `GET /api/classes` | Lists all classrooms managed by an instructor. |
| | `GET /api/classes/:id/students` | Lists students enrolled in a classroom. |
| | `POST /api/classes/:id/reset` | Resets simulations for all students in a cohort. |
| **Certificates**| `POST /api/certificates/check-eligibility` | Evaluates if a student qualifies for accreditation. |
| | `POST /api/certificates/issue` | Generates a verified PDF credential. |
| | `GET /api/certificates/:id/download` | Serves the generated PDF binary. |
| | `GET /api/certificates/verify/:verificationId` | Public authentication page for credentials. |
| **Reports** | `GET /api/reports/:simulationId/seo` | Detailed SEO search engine simulation summaries. |
| | `GET /api/reports/:simulationId/ads` | Combined Google and Meta ad spend audits. |
| | `GET /api/reports/:simulationId/attribution` | Multi-touch customer attribution analytics. |
| **Events** | `GET /api/simulations/:id/events` | Retrieves logs of events triggered in a simulation. |
| | `GET /api/scenarios/:id/event-probability` | Probability chart of possible random incidents. |
| | `POST /api/instructor/trigger-event` | Instructors can force a market event injection. |
| **AI Core** | `POST /api/ai/insight` | Generates diagnostic campaign tips using LLM. |

---

## G. WebSocket Events

WebSockets are implemented with Socket.io. Clients subscribe by connecting to `http://localhost:5000` and joining respective rooms.

### Rooms
- **User Room**: `user:${userId}` (Automatically joined upon authentication or via the `join-user` event).
- **Simulation Room**: `simulation:${simulationId}` (Joined by sending the `join-simulation` event with the simulation ID).

### Events List
1. **`round:complete`**: Emitted when a round finishes processing.
   - **Payload**:
     ```json
     {
       "type": "ROUND_COMPLETE",
       "simulationId": "fde34cc4-874f-4b9a-aed6-ec1c9a0c69cf",
       "roundNumber": 1,
       "nextState": "RESULTS_READY"
     }
     ```
2. **`notification`**: Emitted for system-wide notices or student tips.
   - **Payload**: `{ "id": "uuid", "message": "string", "level": "info|warn" }`
3. **`decision:locked`**: Emitted when a student submits decisions, notifying observers.
   - **Payload**: `{ "simulationId": "string", "round": 1, "locked": true }`
4. **`event:triggered`**: Emitted to notify players of an active market event (e.g., algorithm updates).
   - **Payload**: `{ "name": "Google Core Update", "description": "SEO volume decreased by 20%." }`

---

## H. Swagger and OpenAPI Documents
- **Interactive UI**: Navigate to `http://localhost:5000/docs` in your browser. This displays a full Swagger UI listing all route inputs, headers, schemas, and responses.
- **Client Generation**: Download the OpenAPI schema at `http://localhost:5000/docs/json`. You can drop this JSON directly into type generators like:
  - [openapi-typescript](https://www.npmjs.com/package/openapi-typescript) to build strict TypeScript interfaces.
  - [orval](https://orval.dev/) to build fully typed React Query or Axios hooks automatically.

---

## I. Common Local Errors and Fixes

### 1. Redis `ECONNREFUSED`
- **Error**: `Error: connect ECONNREFUSED 127.0.0.1:6379`
- **Fix**: Redis is not running. Execute `docker compose up -d redis` to spin it up. If port 6379 is blocked, review **Section C** (run on port 26379 and update `.env` to `REDIS_URL=redis://127.0.0.1:26379`).

### 2. PostgreSQL Connection Error
- **Error**: `PrismaClientInitializationError: Can't reach database server at localhost:5432`
- **Fix**: Check if Docker is running and verify the database is up using `docker compose ps`. If you have a local PostgreSQL server already running, either stop it or change the container mapping in `docker-compose.yml` to another port (e.g. `5433:5432`) and update the `DATABASE_URL` in `.env`.

### 3. Prisma Schema Path Issue
- **Error**: `Prisma schema path not found` when executing migrations.
- **Fix**: The schema is configured at `src/prisma/schema.prisma`. Commands must use the schema flag: `npx prisma generate --schema=src/prisma/schema.prisma` or verify your workspace includes the `"prisma": { "schema": "src/prisma/schema.prisma" }` directive in `package.json`.

### 4. Better Auth URL Warning
- **Error**: Auth redirects fail, or sessions are not persistable.
- **Fix**: Verify `BETTER_AUTH_URL` matches your active server port exactly. In development, it must be `http://localhost:5000`. In production, it must be the exact HTTPS URL of the hosted backend.

### 5. Ollama Offline Fallback
- **Error**: LLM insights query hangs or returns connection failure.
- **Fix**: The backend automatically captures connection errors and falls back to a deterministic, rules-based static scorer so the app never crashes. To enable local LLM, run `docker compose up -d ollama` followed by pulling the model:
  ```bash
  docker exec -it <ollama-container-id> ollama pull qwen2.5:7b
  ```
