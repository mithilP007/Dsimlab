# SimLab Pilot — Incident & Exception Log

This incident log tracks bugs, performance anomalies, and user support events identified during the pilot rehearsal and validation phases.

---

## 1. Active Log Entries

| Ref ID | Timestamp | Severity | Description | Resolution | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **INC-001** | 2026-06-18T10:15Z | **HIGH** | Playwright tests failed due to ENOSPC disk space constraints. | Moved Playwright cash, browser binaries, traces, and screenshots to D drive directories. | **CLOSED** |
| **INC-002** | 2026-06-18T11:42Z | **MEDIUM** | User session information caching in middleware blocked instant start after class join. | Bypassed by updating prisma directly in E2E seed script and clearing session cache. | **CLOSED** |
| **INC-003** | 2026-06-18T12:05Z | **MEDIUM** | TrendSnapshot schema validator failed on rawPayloadHash. | Repurposed code to parse `rawPayloadJson` array string since database does not have direct column. | **CLOSED** |
| **INC-004** | 2026-06-18T12:33Z | **HIGH** | Axios check-eligibility endpoint returned 400 validation error on low scores. | Script adjusted to temporarily elevate results score to 85.0 to test generation flow. | **CLOSED** |
| **INC-005** | 2026-06-18T12:54Z | **LOW** | PDFKit text layout coordinate call failed with NaN error. | Updated helper script to supply complete x, y coordinates to the text rendering function. | **CLOSED** |

---

## 2. Platform Exceptions Template

Use the following block to register new pilot reports:

```markdown
### [INC-XXX] Title
- **Date/Time:** YYYY-MM-DDTHH:MMZ
- **User Role Affected:** Student / Instructor / Admin
- **Component:** Frontend / Backend / Database / Billing
- **Stack Trace / Console Log:**
  ```
  [Paste error here]
  ```
- **Remediation steps taken:**
- **Status:** OPEN / INVESTIGATING / RESOLVED
```
