# SimLab Pilot — Monitoring Dashboard

This document details the operational monitoring metrics and alert parameters to check during the controlled pilot run.

---

## 1. System Health Indicators

| Metric Name | Staging Target | Warning Threshold | Critical Alert |
| :--- | :--- | :--- | :--- |
| **API Response Latency** | < 120ms | > 350ms | > 800ms |
| **Database Connection Pool**| 5 active connections | > 15 connections | > 25 connections |
| **WebSocket Connection Rate** | 100% connected | < 90% | < 75% |
| **Trend Fallback Provider Rate**| 0% (Live Google API active) | > 20% fallback | > 50% fallback |
| **Campaign Job Success Rate** | 100% | < 98% | < 95% |
| **CPU / Memory Usage** | < 30% | > 75% | > 90% |

---

## 2. Live Pilot Connections (Rehearsal Metrics)

*   **Active WebSockets:** 12 connections (1 Instructor, 10 Students, 1 Admin).
*   **Average API latency:** 34ms.
*   **Active Subscriptions:** 2 (Instructor Alpha, Instructor Beta).
*   **Classrooms Active:** 3.
*   **Active Campaigns:** 2 (1 student 15-day, 1 student 30-day).

---

## 3. Log Inspection Commands

For technical support personnel checking server logs:
- **Tail Live Backend logs:**
  ```bash
  tail -f apps/backend/test_output.log
  ```
- **Inspect DB migration status:**
  ```bash
  npm run prisma:status -w apps/backend
  ```
- **Check active queue status:**
  ```bash
  # Check Redis keys
  redis-cli keys "bull:*"
  ```
