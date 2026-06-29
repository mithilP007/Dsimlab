# Client Requirement Completion Audit

This document audits the Digital Marketing Simulation Lab (DM SimLab) codebase against the 10 flows and 30 feature areas requested by the client.

---

## 1. Flow Completion Matrix

| Flow Area | Feature / Check | Status | Backend Files | Frontend Pages | Database Models | Gaps & Action Items |
|---|---|---|---|---|---|---|
| **1. Landing Page** | Pricing, product details, CTAs, demo video | **COMPLETE** | None | `LandingPage.tsx` | None | None |
| **2. Login / Signup** | Signup individual, email login, role route | **COMPLETE** | `auth.routes.ts` | `LoginScreen.tsx` | `User` | None |
| **3. Super Admin** | Manage users, deactivate, colleges, stats | **COMPLETE** | `admin.routes.ts` | `admin/*` | `User`, `Institution` | None |
| **4. Instructor** | Create class, scenarios, NBA/OBE reports | **PARTIAL** | `scenario.routes.ts` | `CreateClassPage.tsx` | `Scenario` | Scenario builder lacks options for allowed campaign types and checkpoint gating rules. |
| **5. Student** | Code join, analysis, decisions, checkpoints | **PARTIAL** | `simulation.routes.ts` | `simulation/*` | `CheckpointValidation` | Gated on checkpoint submission, but instructor-assigned justification scores are not aggregated in student scorecards. |
| **6. Individual Learner** | Billing checkout, sandbox play, path options | **PARTIAL** | `billing.routes.ts`, `campaign.routes.ts` | `billing/*` | `Subscription` | Sandbox paths (Beginner/Intermediate/Advanced) are missing. Razorpay webhook lacks payment capture/fail handlers. Expiry scheduler is missing. |
| **7. Campaign Creation** | Search, Display, Video, Shopping types | **PARTIAL** | `google-ads.routes.ts`, `engine.ts` | `campaign/*` | `Decision` | Engine only models Search and Meta. `google-ads` routes enforce keyword presence, blocking Display, Video, and Shopping. |
| **8. SEO Flow** | Keywords density, HTML check, DA/PA scaling | **COMPLETE** | `engine.ts`, `seo-engine.ts` | `simulation/SeoSimulationPage` | `Decision` | None |
| **9. Certification** | Checklist checks, verification pages | **PARTIAL** | `certificate.routes.ts`, `eligibility.ts` | `CertificatePortal` | `Certificate` | Verification works, but PDF generation serves mock URLs rather than a structured layout download. |
| **10. Simulation Engine** | Clock engine, event injects, scoring weights | **COMPLETE** | `engine.ts`, `dailySimulationEngine.ts` | None | `DailyMetric`, `ScoreBreakdown` | None |

---

## 2. Detailed Incomplete / Missing Features Gap Analysis

### 2.1 Security & Access Control Gaps (Phase 2)
- **Problem**: Instructor routes in `report.routes.ts` verify the user's role is `INSTRUCTOR`, but they fail to verify that the instructor owns the targeted class cohort. Similarly, `GET /api/v1/report/student/:studentId` allows any instructor to read performance metrics for any student.
- **Backend Files**: `report.routes.ts`
- **Database Models**: `Class`, `User`
- **Endpoints Affected**: 
  - `GET /api/v1/report/class/:classId`
  - `GET /api/v1/report/class/:classId/credentials`
  - `GET /api/v1/report/class/:classId/nba`
  - `GET /api/v1/report/class/:classId/obe`
  - `GET /api/v1/report/class/:classId/accreditation`
  - `GET /api/v1/report/class/:classId/performance`
  - `GET /api/v1/report/class/:classId/faculty-evaluation`
  - `GET /api/v1/report/class/:classId/grades/export`
  - `GET /api/v1/report/student/:studentId`
- **Fix**: Update the `preHandler` validation to check that the instructor is the creator of the class. Allow `ADMIN` users to bypass the check. Allow students to access only their own individual student reports.

### 2.2 Billing & Subscription Webhook & Scheduler (Phase 3)
- **Problem**: 
  1. The Razorpay webhook `/api/v1/billing/webhook` only logs events in `BillingEvent` but does not activate/failed-state user subscriptions.
  2. Missing subscription expiry task. Expired users still retain active access.
- **Backend Files**: `billing.routes.ts`, `round-scheduler.ts`
- **Database Models**: `Subscription`, `Invoice`, `Payment`, `User`
- **Fix**: 
  1. On `payment.captured`, retrieve the pending subscription using the Razorpay `order_id`, set status to `active`, create an `Invoice` (status: `paid`), create a `Payment`, and update the user's `planType`.
  2. On `payment.failed`, mark the subscription as `cancelled`.
  3. Create `checkExpiredSubscriptions()` inside `round-scheduler.ts` and invoke it on backend start and every hour. It scans for active/trial subscriptions with `endDate` less than the current date, marks them `expired`, and updates the user's `planType` back to `free`.

### 2.3 Multiple Campaign Type Coverage (Phase 4)
- **Problem**: In `google-ads.routes.ts`, campaign creation forces a non-empty `keywords` array, which fails validation for Display, Video, and Shopping campaigns. The simulation engine only runs bidding calculations against keywords.
- **Backend Files**: `google-ads.routes.ts`, `engine.ts`, `dailySimulationEngine.ts`
- **Fix**: 
  1. Make `keywords` optional in the Google Ads body schema.
  2. Implement display campaign traffic modeling (CPM pacing, audience CTR modifiers).
  3. Implement video campaign engagement modeling (CPV pacing, engagement rate CTR).
  4. Implement shopping campaign feed modeling (product relevance, transactional conversion rates).
  5. Store output metrics per campaign type.

### 2.4 Student Checkpoint Justification Gating & GAD Scoring (Phase 5)
- **Problem**: Checkpoints gate simulation progression, but the reflection score/feedback written by instructors isn't integrated into the student scorecard.
- **Backend Files**: `dimensions.ts`, `engine.ts`, `simulation.routes.ts`
- **Fix**: 
  - Update `calculateDimensionScores` to average previous rounds' checkpoint validation scores (`reflectionQualityScore`) into the final adaptability metric.
  - Require the user to submit checkpoint justifications. Unlock the next round once the checkpoint is submitted or if auto-unlock is configured.

### 2.5 Scenario Builder Gating Config (Phase 6)
- **Problem**: The scenario builder lacks parameters to configure allowed campaign types, certificate scoring rules, and checkpoint rules.
- **Backend Files**: `scenario.routes.ts`
- **Database Migrations**: Add `allowedCampaignTypes` and `checkpointRule` to `Scenario`.
- **Fix**: Support creating and editing scenario templates with allowed campaign type selections and checkpoint rules.

### 2.6 Briefing & Initial Market Analysis (Phase 7)
- **Problem**: No student briefing page exists to let students inspect target metrics, competitor baselines, and keyword CPC demand indexes before starting Round 1.
- **Backend Files**: `simulation.routes.ts`
- **Endpoints Affected**: `GET /api/v1/simulation/briefing`
- **Fix**: Expose scenario constraints, keywords search volume pools, CPC pressure indexes, and seasonality values on a briefing route.

### 2.7 Final Scorecard & Faculty Evaluation (Phase 8)
- **Problem**: Scorecard components show standard simulation parameters but do not reflect justification scores or teacher remarks.
- **Backend Files**: `report.routes.ts`
- **Fix**: Expose checkpoint reviews, feedback remarks, and final score breakdowns on student performance cards.

### 2.8 Certificate PDF Layout Download (Phase 9)
- **Problem**: Certificate portal returns a static mockup URL for the certificate download.
- **Backend Files**: `certificate.routes.ts`, `generator.ts`
- **Fix**: Expose a layout generation endpoint that serves the certificate structure cleanly so students can download a validated achievement credential.
