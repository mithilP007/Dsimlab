# SimLab Sandbox Start Endpoint 404 & Chart Container Warnings Audit Report

## 1. Executive Summary

This report documents the resolution of two main frontend/backend integration issues:
1. **Live Sandbox Start Campaign 404 Not Found:** Occurred when launching the Daily Campaign simulation because the frontend client sent requests to `/v1/campaign/start` instead of `/api/v1/...` routing paths.
2. **Recharts Size Container Warnings:** Occurred when rendering ResponsiveContainer components on multiple dashboard pages, displaying `The width(-1) and height(-1) of chart should be greater than 0` in the browser console.

All fixes have been implemented, fully verified via automated tests, smoke test matrices, and systematic Playwright E2E browser automation.

---

## 2. Issues Diagnosed & Resolved

### A. Endpoint 404 Resolution (Routing Realignment)
1. **Frontend Store Refactoring:** Updated the API paths in the frontend stores from legacy `/v1/` prefixes to `/api/v1/`:
   - Updated daily campaign routes inside [dailyCampaignStore.ts](file:///d:/ads%20backend/apps/frontend/src/stores/dailyCampaignStore.ts)
   - Updated Google Ads routes inside [googleAdsStore.ts](file:///d:/ads%20backend/apps/frontend/src/stores/googleAdsStore.ts)
   - Updated Meta Ads routes inside [metaAdsStore.ts](file:///d:/ads%20backend/apps/frontend/src/stores/metaAdsStore.ts)
   - Updated SEO routes inside [campaignStore.ts](file:///d:/ads%20backend/apps/frontend/src/stores/campaignStore.ts)
2. **Backend Compatibility Layer:** Added an `onRequest` rewrite hook in Fastify inside [app.ts](file:///d:/ads%20backend/apps/backend/src/app.ts) that transparently rewrites incoming `/v1/*` routes to `/api/v1/*` to ensure backwards compatibility with legacy client builds:
   ```typescript
   app.addHook('onRequest', (request, reply, done) => {
     if (request.raw.url && request.raw.url.startsWith('/v1/') && !request.raw.url.startsWith('/api/v1/')) {
       request.raw.url = '/api' + request.raw.url;
     }
     done();
   });
   ```

### B. Chart Size Warnings Resolution (Container Realignment)
Recharts warning `The width(-1) and height(-1) of chart should be greater than 0` was caused by `ResponsiveContainer` using percentage height (`height="100%"`) in collapsed parent elements during initial rendering cycles.

We resolved this across **all 23 occurrences** in the frontend codebase by substituting absolute percentage values for fixed numbers (`height={N}`) or dynamic parameters (`height={height}`):
- **StudentReport.tsx** → Changed to `height={250}`
- **SimulationResultsPage.tsx** → Changed to `height={250}`
- **MarketAnalysisPage.tsx** → Changed to `height={220}`
- **ProgressDashboardPage.tsx** → Changed to `height={280}`
- **OBEReports.tsx** → Changed to `height={280}`
- **NBAReports.tsx** → Changed to `height={250}`
- **InstructorReport.tsx** → Changed to `height={300}`
- **InstructorPortal.tsx** → Changed to `height={180}`
- **CampaignDashboard.tsx** → Changed to `height={250}`
- **AdminSystemAnalytics.tsx** → Changed to `height={300}`
- **AdminBillingCenter.tsx** → Changed to `height={300}` and `height={220}`
- **MetricSparkline.tsx** → Changed to `height={height}`
- **RadarChart.tsx** → Changed to `height={300}`

---

## 3. Verification Details

### A. Unit & Integration Tests (`npm test`)
- Run commands completed successfully with **148/148 tests passing**.
- Addressed network timeout issue in `daily-simulation-flow.test.ts` by setting a 30-second vitest timeout limit for live RSS feeds processing.

### B. Production Smoke Test Matrix (`node scripts/smoke-test.js`)
- **48/48 health and configuration audits successfully passed.**
- Super Admin, Instructor, Student, and Individual Learner session integrations verified stable.

### C. Playwright E2E Browser Automation (`npm run test:e2e`)
- Initialized headless chromium to simulate a student enrolling, launching a daily simulation, completing fast-forward rounds, verifying standings, and an individual user applying discount coupons to purchase billing plans.
- All steps executed and screenshots saved to `screenshots/` without warnings or server crashes.
