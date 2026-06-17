# SimLab Launch Readiness Checklist & Production Report

This document outlines the final checklists and validation parameters to verify the platform before public deployment.

---

## 1. Infrastructure Checklist
- [ ] Postgres Database size and volume capacities configured to scale.
- [ ] Redis memory limits set to volatile-lru to clean cache keys under pressure.
- [ ] Nginx client max body size set to 10MB to accommodate file upload limits.
- [ ] Host machine CPU allocation set to a minimum of 2 vCPUs and 4GB RAM.

---

## 2. Security Checklist
- [ ] Helmet headers registered and verified.
- [ ] Strict Content Security Policy (CSP) active and blocking arbitrary inline script injections.
- [ ] Session cookies set to `Secure`, `HttpOnly`, and `SameSite=Lax`.
- [ ] Input validation (Zod schemas) configured on all route parameter groups.
- [ ] Login brute force lockouts active.
- [ ] CORS allowed origins restricted to production domains.
- [ ] Database credentials, API secrets, and JWT secrets moved from env templates to secure environment configuration engines.

---

## 3. Performance & Optimization Checklist
- [ ] Vite code splitting active.
- [ ] Static images compressed.
- [ ] Critical database indices implemented and verified.
- [ ] Redis caches enabled for leaderboards, analytics aggregates, and classroom rosters.
- [ ] PDF generation tasks offloaded from REST request handlers to background workers.

---

## 4. Telemetry & Monitoring Checklist
- [ ] Health checks routing (`GET /health`) verified.
- [ ] System health monitoring endpoints (`GET /api/v1/admin/system-health`) feeding the admin dashboard.
- [ ] CPU / memory footprint metrics tracking active.
- [ ] Database latency monitoring registered in the database client wrapper.
- [ ] Unhandled exception logging hook (`process.on('uncaughtException')`) tracking crashes.
- [ ] Frontend crashes correctly reported to `/api/v1/error-reports`.

---

## 5. Disaster Recovery Checklist
- [ ] Hourly pg_dump backup script configured and cron schedule active.
- [ ] Verification restoration playbooks documented and dry-run executed.
- [ ] Volume mounts and static directories backed up.
- [ ] Contact registry for infrastructure operators configured.
