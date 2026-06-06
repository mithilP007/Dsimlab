# DM SimLab – Frontend ↔ Backend Integration Report

Generated: 2026-06-06  
Backend: `http://localhost:3000` (Fastify + Prisma + Better-Auth)  
Frontend: `apps/frontend` (React + Vite + Zustand)

---

## ✅ Integration Status: COMPLETE

All mock data, demo-mode fallbacks, and fake authentication have been permanently removed.
The frontend is now fully wired to the real backend.

---

## 1. Environment & Config

| File | Purpose |
|------|---------|
| `apps/frontend/.env` | Declares `VITE_API_BASE_URL`, `VITE_SOCKET_URL`, `VITE_APP_NAME` |
| `src/lib/env.ts` | Zod-validated runtime env reader – throws hard error if `VITE_API_BASE_URL` is missing |
| `src/lib/config.ts` | Central config object (baseUrl, socketUrl, app name) |

---

## 2. API Client (`src/lib/api.ts`)

- **Axios** instance with `baseURL = VITE_API_BASE_URL + /api`
- `withCredentials: true` for Better-Auth session cookies
- Response interceptors:
  - **401** → clears auth store, redirects to `/login`
  - **403** → toast "Access denied"
  - **5xx** → toast "Server error"
  - **Network error** → toast "Cannot reach server"

---

## 3. Authentication (`src/stores/authStore.ts`)

| Action | Endpoint | Notes |
|--------|----------|-------|
| `login({ email, password })` | `POST /api/auth/sign-in/email` | Better-Auth |
| `register({ name, email, password, role })` | `POST /api/auth/register/individual` or `/register/student` | Custom route |
| `logout()` | `POST /api/auth/sign-out` | Clears cookie |
| `refreshSession()` | `GET /api/v1/auth/me` | Runs on every app load via `SessionBootstrap` |

**Pages updated:**
- `LoginScreen.tsx` – real async login, error toast on failure
- `InstructorLogin.tsx` – real login + signup, error handling
- `SignupIndividual.tsx` – real `register()` with plan selection
- `JoinClassScreen.tsx` – real `register()` with `classId` for student-college role

**Session rehydration** added via `<SessionBootstrap />` in `router/index.tsx` — silently calls `refreshSession()` on every page load; `ProtectedLayout` shows loading spinner during the check.

---

## 4. Real-Time (`src/hooks/useSocket.ts`)

- Singleton `socket.io-client` connection to `VITE_SOCKET_URL`
- Emits `join:simulation` with `simulationId` on mount
- Listens for `round:complete` → dispatches `simulationStore.advanceRound()`
- Auto-connects only when a user session is active

---

## 5. Simulation Engine (`src/stores/simulationStore.ts`)

| Action | Endpoint |
|--------|----------|
| `fetchSimulation(id)` | `GET /api/v1/simulation/:id` |
| `startRound()` | `POST /api/v1/simulation/:id/start` |
| `advanceRound()` | `POST /api/v1/simulation/:id/advance` |
| `endSimulation()` | `POST /api/v1/simulation/:id/end` |

State machine maps backend `status` → internal UI state (`setup`, `active`, `round_review`, `completed`).

---

## 6. Campaign Decision Stores

### SEO (`src/stores/campaignStore.ts`)
- `submitSeoDecisions()` → `POST /api/v1/seo/decision`
- Payload: `{ keywords[], budget, targetPage, strategy }`

### Google Ads (`src/stores/googleAdsStore.ts`)
- `submitDecisions()` → `POST /api/v1/google-ads/decision`
- Payload: `{ campaigns: [{ name, budget, keywords: [{ word, bid }] }] }`

### Meta Ads (`src/stores/metaAdsStore.ts`)
- `submitDecisions()` → `POST /api/v1/meta-ads/decision`
- Payload: `{ campaigns: [{ name, budget, audienceInterest, bidType, bidAmount, placement, creativeQuality }] }`

---

## 7. Instructor Store (`src/stores/instructorStore.ts`)

| Action | Endpoint |
|--------|----------|
| `fetchClasses()` | `GET /api/v1/class` |
| `fetchReports(classId)` | `GET /api/v1/report?classId=…` |

---

## 8. Metrics Store (`src/stores/metricsStore.ts`)

- `fetchMetrics(simulationId)` → `GET /api/v1/metrics/:simulationId`
- Returns `DailyMetric[]` time-series data for charts

---

## 9. Certification Store (`src/stores/certificationStore.ts`)

| Action | Endpoint |
|--------|----------|
| `fetchCertificates()` | `GET /api/v1/certificate` |
| `issueCertificate(name, type)` | `POST /api/v1/certificate/issue` |
| `verifyCertificate(hash)` | `GET /api/v1/certificate/verify/:hash` |
| `downloadCertificate(id, format)` | `GET /api/v1/certificate/:id/download` |

---

## 10. Build Output

```
✓ 3048 modules transformed
dist/index.html            0.45 kB │ gzip:  0.29 kB
dist/assets/index.css    141.71 kB │ gzip: 21.75 kB
dist/assets/index.js   1,633.31 kB │ gzip: 443.23 kB
✓ Built in 3.88s
```

Zero TypeScript errors. Zero ESLint blocking errors.

---

## 11. Removed / Eliminated

- ❌ All `setTimeout(mock…)` auth flows
- ❌ `isDemoMode` / `isDemo` flags
- ❌ Hard-coded mock user objects passed to `login(user, token)`
- ❌ `"mock-jwt-token"` / `"mock-instructor-jwt-token"` strings
- ❌ Two-argument `login(user, token)` signature — now `login({ email, password })`
- ❌ Unused `get` params in `instructorStore` and `reportsStore`

---

## 12. Quick-Start Checklist

Before running the frontend, ensure:

1. **Backend is running** at `http://localhost:3000`
2. **Database is seeded** with at least one instructor and simulation
3. **`.env` is populated:**
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   VITE_SOCKET_URL=http://localhost:3000
   VITE_APP_NAME=DM SimLab
   ```
4. **CORS** on the backend allows `http://localhost:5173` with `credentials: true`
5. Run `npm run dev` in `apps/frontend`
