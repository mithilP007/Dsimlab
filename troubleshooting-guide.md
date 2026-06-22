# SimLab Pilot — Troubleshooting Guide

This troubleshooting guide provides instructions for resolving common technical issues encountered during the pilot program.

---

## 1. Login Authentication Failures

*   **Symptom:** Entering correct credentials returns a `500 Server Error` or a repeating `401 Unauthorized` redirect.
*   **Cause:** Session payload mismatch or browser cookie corruption from previous staging sessions.
*   **Resolution:**
    1.  Clear browser cache and site cookies for the `localhost:5173` domain.
    2.  Open an Incognito/Private window and try logging in.
    3.  If the error persists, contact the Super Admin to verify the user account status in the admin console.

## 2. Invalid Join Code Error

*   **Symptom:** Entering the invite code (e.g. `SEO101`) returns `No class found matching the provided invite code`.
*   **Cause:** Typo in invite code, or class is deleted by instructor.
*   **Resolution:**
    1.  Double-check the exact spelling. Invite codes are case-sensitive.
    2.  Confirm with the instructor that the class cohort is still active and has not been recreated.

## 3. Classroom Join Request Stuck in "Pending Approval"

*   **Symptom:** Student has submitted join code but cannot start daily campaign.
*   **Cause:** Instructor has not approved the request in their approval dashboard.
*   **Resolution:**
    1.  Instructors must log in, view the classroom cohort, and click **Approve Access** for the student.
    2.  Students must refresh the browser dashboard once approved to fetch the updated session state.

## 4. Daily Campaign Fails to Start

*   **Symptom:** Clicking **Launch Daily Live Simulation** displays a loading wheel or fails to redirect.
*   **Cause:** The user's account plan limits have been exceeded, or class is missing a scenario.
*   **Resolution:**
    1.  Ensure that the instructor has published a scenario to the class cohort.
    2.  Admins can override simulation limits in the admin panel.

## 5. Daily Result Metrics Not Visible Next Day

*   **Symptom:** The daily dashboard still shows "Waiting for Daily processing" after midnight.
*   **Cause:** The backend cron job failed to execute or database lock blocked processing.
*   **Resolution:**
    1.  Admins can trigger a developer fast-forward bypass from the server console using `POST /api/v1/campaign/fast-forward`.
    2.  Check the `CampaignProcessingJob` table in the database to verify if a job failed.

## 6. Competitive Leaderboard Not Updating

*   **Symptom:** Student leaderboard standings do not change after days are processed.
*   **Cause:** Redis/Memory cache failed to invalidate after simulation processing.
*   **Resolution:**
    1.  Instructors can manually clear classroom cache in the dashboard settings.
    2.  Restart the backend server if cache locks fail to release.

## 7. Billing Sandbox Checkout Fails

*   **Symptom:** Attempting to subscribe in sandbox pricing console returns checkout errors.
*   **Cause:** Sandbox payments verify signature locally. If mock key is not configured, payment fails.
*   **Resolution:**
    1.  Verify the environment is running in staging or development mode.
    2.  Use the mock card credentials: Card `4111 2222 3333 4444`, Expiry `12/30`, CVV `123`.

## 8. Certificate Not Generating

*   **Symptom:** Clicking "Claim Certificate" returns `Not eligible for certificate`.
*   **Cause:** Student fails to meet the cumulative score (70%) or strategic consistency (65%) criteria, or instructor approval is missing.
*   **Resolution:**
    1.  Review scores on the student's progress dashboard to ensure criteria are satisfied.
    2.  For college students, confirm the instructor has approved the simulation state.

## 9. Report Export Failures

*   **Symptom:** Exporting classroom reports or PDFs hangs or fails.
*   **Cause:** Disk full in D drive, or file system permission errors blocking PDF compilation.
*   **Resolution:**
    1.  Verify the D drive folder structure exists: `D:\simlab-test-artifacts\`.
    2.  Check backend server directory permissions.

## 10. WebSocket Disconnected Notification

*   **Symptom:** A warning banner "Real-time updates disconnected" appears.
*   **Cause:** Local network firewall blocks WebSockets, or backend server crashed.
*   **Resolution:**
    1.  Refresh the browser to reinitialize the Socket.io handshake.
    2.  Ensure local firewall allows traffic on port `5000`.
