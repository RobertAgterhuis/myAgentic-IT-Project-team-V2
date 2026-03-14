# Decisions: Microsoft Exchange (CAT-03)

> Stack: exchange | Status: DEFERRED | Applicable: PENDING
> Auto-activated by Orchestrator (RULE ORC-45) when this technology is detected.

---

## Decided Items

| ID          | Priority | Scope                          | Decision                                                                                          | Notes                                                                   | Date       |
| ----------- | -------- | ------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------- |
| DEC-CAT-301 | HIGH     | Phase 2 (API Strategy)         | Use Microsoft Graph mail/calendar endpoints; no direct EWS unless Graph lacks required capability | Graph is the strategic API; EWS is legacy                               | 2026-03-18 |
| DEC-CAT-302 | HIGH     | Phase 2 (Mail Permissions)     | Use delegated permissions for user mailbox access; app-only only for service accounts             | Prevents over-privileged mailbox access                                 | 2026-03-18 |
| DEC-CAT-303 | MEDIUM   | Phase 2 (Retention)            | Respect Exchange retention policies; do not delete or modify items outside application scope      | Applications must not bypass compliance holds or retention policies     | 2026-03-18 |
| DEC-CAT-304 | MEDIUM   | Phase 5 (Rate Limits)          | Implement per-mailbox throttling compliance per Graph API mailbox limits                          | Graph API enforces per-mailbox rate limits; respect 429 responses       | 2026-03-18 |
| DEC-CAT-305 | LOW      | Phase 2 (Change Notifications) | Use Graph change notifications for new mail instead of polling                                    | Reduces API calls; webhook endpoint must handle notification validation | 2026-03-18 |

---

_Category created: 2026-03-18 | Implementation Agent | Sprint 5 SP-5-CAT_
