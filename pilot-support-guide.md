# SimLab Pilot Onboarding & Support Guide

This onboarding guide assists pilot participants (Students, Instructors, Admins) in launching and running simulations during the controlled pilot run.

---

## 1. Student Onboarding Workflow

### Step 1: Account Login
1. Open your browser and navigate to the portal login link: `http://localhost:5173/login`.
2. Input your temporary email and password as assigned in your onboarding package:
   * **Username:** `student[1-10]@simlab.run`
   * **Password:** `Test@123456`
3. Click **Sign In**.

### Step 2: Joining the Classroom Cohort
1. On the main dashboard, locate the **Join Classroom Cohort** card.
2. Enter your assigned invite code:
   * Students 1-4: `SEO101` (Intro to SEO)
   * Students 5-8: `GADS102` (Google Ads Mastery)
   * Students 9-10: `SOC103` (Social Performance Media)
3. Click **Submit Join Request**.
4. Your request status will show as **Pending Approval**. Wait for your instructor to activate your access.

### Step 3: Launching the Daily Campaign
1. Once approved, refresh your dashboard.
2. Under the simulation panel, select **Launch Daily Live Simulation**.
3. You will be directed to the campaign dashboard. Day 1 is now open!

### Step 4: Submitting Decisions & Reviewing Results
1. Navigate to **Day 1 Decisions**.
2. Configure SEO keywords, content quality levels, and budget. Configure Google and Meta Ads settings.
3. Click **Submit Daily Decisions**.
4. Results are processed daily at midnight. Once processed, your dashboard will display yesterday's CTR, Clicks, conversions, ROAS, and competitive leaderboard rankings.

---

## 2. Instructor Classroom Administration

### Step 1: Login & Classroom Overview
1. Log in via `http://localhost:5173/login` using your instructor credentials:
   * **Email:** `instructor.alpha@simlab.run` or `instructor.beta@simlab.run`
   * **Password:** `Test@123456`
2. You will be redirected to the **Instructor Dashboard**.

### Step 2: Approving Pending Students
1. Locate the **Pending Class Registrations** panel.
2. You will see requests from student emails (e.g. `student1@simlab.run`).
3. Click **Approve Access**. Students will receive an in-app notification and can now launch their simulations.

### Step 3: Performance Reports & Standings
1. Select a classroom cohort to view its performance dashboard.
2. Monitor class averages, review daily decision logs, and inspect leaderboard standings.
3. Once the 15-day scenario is completed, review student average scores.

### Step 4: Certificate Approvals
1. Students with score averages >= 70% and strategic consistency >= 65% will request certificate qualification.
2. On the certificate dashboard, review eligible student profiles.
3. Click **Approve Certificate**. Students can now download their signed compliance PDFs.

---

## 3. Super Admin System Monitoring

### Step 1: Accessing the Admin Console
1. Log in via `http://localhost:5173/login` using:
   * **Email:** `superadmin@simlab.run`
   * **Password:** `Test@123456`
2. You will be redirected to the **Admin Dashboard** at `/admin`.

### Step 2: System Health Audits
1. Review **Audit Logs** to monitor login activities, API requests, and class creations.
2. Inspect the **Campaign Processing Jobs** table to ensure scheduled cron sweeps process students daily.
3. Review **Trend Provider Logs** to check the status of live trend providers and verify if fallbacks are triggered.
