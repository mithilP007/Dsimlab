# DM SimLab Platform Demo Script

This script provides a step-by-step walkthrough for demonstrating the DM SimLab platform capabilities during a university pilot demo.

---

## Roles & Accounts Used in Demo

- **Super Admin**: `superadmin@simlab.test` / `Test@123456`
- **Instructor**: `instructor@simlab.test` / `Test@123456`
- **Student (College)**: `student1@simlab.test` / `Test@123456`
- **Individual Learner**: `individual@simlab.test` / `Test@123456`

---

## 1. Landing Page Overview (Public)

1. Navigate to `http://localhost:5173/landing`.
2. **Interactive Video Demo**: Scroll to the **SimLab Demo Walkthrough** section and click the glowing play button. Explain that this simulated walkthrough plays through the entire 4-stage optimization lifecycle (SEO keyword crawling, Google Ads bidding, Meta social placement configuration, and scoring snapshot calculation) in 15 seconds.
3. Click "Join with Class Code" or "Sign In".

---

## 2. Super Admin Financial Console

1. Log in as **Super Admin** (`superadmin@simlab.test`).
2. Show the **Admin Dashboard** showing overview metrics (total users, active institutions, system health).
3. Navigate to **Financial Command Center** (`/admin/billing`):
   - Show the **Revenue Analytics** charts (MRR, ARR, plan distribution, active paid subscriptions, churn rate).
   - Navigate to the **Manage Pricing Plans** tab:
     - Show the active plans registry.
     - Provision a new plan: set name to `Basic Sandbox`, code to `sandbox_basic`, price to `₹99`, duration to `7 Days`, and check `Is Active`. Click "Provision Plan".
     - Click **Edit Plan Details & Pricing** on `Basic Sandbox`. Change price to `₹120` and duration to `14 Days`. Click "Update Plan" to demonstrate live database synchronization.
   - Navigate to the **Subscription Reports** tab:
     - Show the filtered subscriber tables (all, active, expiring, trial, cancelled).
     - Filter list by searching a student name.
     - Click **Export CSV** and **Export PDF** to show the reports downloading.
4. Log out.

---

## 3. Instructor Portal

1. Log in as **Instructor** (`instructor@simlab.test`).
2. Show the **Instructor Dashboard** (`/instructor`):
   - Highlight current classroom cohorts, scenario templates, and pending approvals.
3. **Classroom Creation & Invites**:
   - Click "Create New Cohort". Name the cohort `Marketing Midterm 2026`.
   - Select the `Global SaaS Marketing Challenge` scenario template and click save.
   - Show the generated **Join Invite Code** (e.g. `STANFORD2026` or class slug). Explain that students enter this code to link their accounts.
4. **Student Progress & Justifications**:
   - Go to "OBE Reports" or click a student's profile.
   - Show the round-by-round **Strategy Justifications** submitted by the student at mandatory checkpoints.
5. Log out.

---

## 4. Student Workflow (Gated Learning)

1. Log in as **Student** (`student1@simlab.test`).
2. **Join Classroom**:
   - Go to `/join` and input the instructor's invite code to request cohort approval.
3. **Ads & SEO Simulation**:
   - Open **SEO Editor** (`/simulation/seo`):
     - Show manual metadata inputs (Title, Description, Page Body).
     - Highlight the **HTML Document Upload**: select an HTML file and show it auto-extracting metadata and content.
     - Adjust the **Internal Links** range slider and set target anchor text.
   - Open **Google Search Ads** (`/simulation/google-ads`):
     - Tweak campaign budgets, CPC bid ceilings, ad copy headlines, and structured snippet/callout **Ad Extensions**.
     - Verify that a policy warning alerts if a prohibited keyword is typed.
4. **Mandatory Checkpoint Gating**:
   - Lock decisions and advance the round.
   - Explain that once results are calculated, the student lands on the **Strategy Justification & Reflection Checkpoint**.
   - Input a strategy reflection (e.g., "Increasing bids on CRM keywords to outpace competitors and capturing mobile viewport traffic via sitelink extensions").
   - Click "Submit Justification" to unlock the next round and demonstrate that the reflection updates their **Adaptability Score** on their report card.
5. Log out.

---

## 5. Certification Showcase

1. Log in as **Individual Learner** (`individual@simlab.test`).
2. Navigate to the **Certification Portal** (`/certificate`):
   - Explain that the engine evaluates performance based on:
     - Performance Score >= 60
     - Adaptability Score >= 50
     - 0 Hard Violations (such as policy keywords or severe budget overruns)
   - Show the tier mapping: Bronze, Silver, Gold, or Platinum.
   - Click **Generate Certificate** to run the cryptographic assembly.
   - Download the **landscape PDF layout** and click **Copy Verification Link** to show how employers or universities verify the certificate without login.
