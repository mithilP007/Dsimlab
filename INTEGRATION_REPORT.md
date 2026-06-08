# DM SimLab — Frontend-Backend Integration Report

This report summarizes the complete integration of the React/Vite frontend application with the Fastify/Prisma backend. All mock fallbacks, client-side simulated data delays, and fake state variables have been replaced with real endpoints and real-time Socket.io events.

---

## 1. Environment Configuration

The frontend references environmental settings via runtime Zod schema validation in `src/lib/env.ts`, preventing unconfigured startups.

### `.env` File (Frontend Root)
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
VITE_APP_NAME=DM SimLab
```

---

## 2. API Client & Session Authentication

Better-Auth establishes HttpOnly session cookies for browser state management. Therefore, the Axios instance handles credential cookies natively.

* **Client Path**: `src/lib/api.ts`
* **Configuration**:
  - `baseURL`: `import.meta.env.VITE_API_BASE_URL`
  - `withCredentials: true` (Critical for forwarding cookies)
  - `timeout: 15000` (15s request ceiling)
* **Response Interceptors**:
  - **401**: Redirects immediately to `/login` to refresh expired sessions.
  - **403**: Displays "Access denied" notification toast.
  - **500**: Triggers "Server error. Please try again." toast.
  - **Network Failures**: Triggers a connection error state in `useUiStore` and renders a persistent red top-banner: *"Cannot connect to DM SimLab servers. Please check your connection."*

---

## 3. Real-Time Communication (Socket.io)

Real-time feedback and state advancement notifications are driven by Socket.io, configured on `VITE_SOCKET_URL` with cross-origin cookie credentials.

* **Hook Path**: `src/hooks/useSocket.ts`
* **Channels & Rooms Joined**:
  - `user:${userId}` (Personal alerts and system updates)
  - `simulation:${simulationId}` (Simulation-specific state sync)
* **Event Handlers**:
  - `round:complete`: Triggers a beep, refetches metrics/snapshots, synchronizes state, and clears UI loaders.
  - `decision:locked`: Set simulation status to `LOCKED` (uppercase matching DB state).
  - `event:triggered`: Emits a custom browser event to display the `EventAlert` modal.
  - `notification`: Triggers system notifications/injected market event toast alerts.
  - `disconnect`: Displays a network-loss banner indicating reconnection efforts.

---

## 4. Endpoints Mapping

Every client-side store has been refactored to hit real backend HTTP routes:

### A. Authentication & User Management
* **Active Session**: `GET /api/auth/me` & `GET /api/me` (mapped to lowercase roles `individual`, `student-college`, `instructor`, `admin`)
* **Individual Signup**: `POST /api/auth/register/individual`
* **Student Registration**: `POST /api/auth/register/student`
* **Instructor Signin / Registration**: `POST /api/auth/sign-in/email` / `POST /api/auth/sign-up/email`
* **Signout**: `POST /api/auth/sign-out`

### B. Simulation Campaigns & Decisions
* **Create Simulation**: `POST /api/simulations`
* **Decision Submission**: `POST /api/simulations/:id/decisions`
  - Aggregates Google Ads keywords/bids, Meta placement, and SEO configurations into a single payload.
* **Advance Phase**: `POST /api/simulations/:id/advance`
* **Metrics Series**: `GET /api/simulations/:id/metrics` & `GET /api/simulations/:id/snapshots`

### C. Metrics, Scoring & Analytics
* **Score breakdown**: `GET /api/v1/scoring/breakdown`
* **Leaderboard**: `GET /api/v1/scoring/leaderboard`
* **AI Coach Insights**: `POST /api/ai/insight` (requests strategic guidance for `seo`, `google_ads`, or `meta_ads`)

### D. Instructor Portal
* **Manage Cohorts**: `GET /api/classes` & `POST /api/classes`
* **Student Performance**: `GET /api/classes/:id/students`
* **Audit Trails**: `GET /api/audit/simulations/:id/trail`
* **Simulation Approvals**: `POST /api/simulations/:id/approve`

### E. Certification & Verification
* **Check Eligibility**: `POST /api/certificates/check-eligibility`
* **Issue Certificate**: `POST /api/certificates/issue`
* **Public Verification**: `GET /api/certificates/verify/:verificationId`
  - Wired to the public route `/verify/:verificationId` pointing to the new `VerificationPortal.tsx` component.

---

## 5. Build Verification Results

The frontend application has been fully compiled for production environment validation.

* **Command Executed**: `tsc -b && vite build`
* **Result**: `✓ built in 3.22s`
* **Status**: Compiled successfully with **0 errors**.
