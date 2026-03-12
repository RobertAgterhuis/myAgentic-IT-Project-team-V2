# Decisions: Microsoft Graph API (CAT-01)

> Stack: microsoft-graph | Status: DEFERRED | Applicable: NO
> Deferred-Reason: No Graph API calls detected in codebase. Activate when
> Microsoft Graph SDK or Graph API endpoints are introduced.
> GitHub Issue: #27

---

## Decided Items

| ID          | Priority | Scope                          | Decision                                                                                                | Notes                                                                                       | Date       |
| ----------- | -------- | ------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------- |
| DEC-CAT-101 | HIGH     | Phase 2 (Auth Scopes)          | All Graph API calls must use least-privilege scopes; no broad `*.ReadWrite.All` without security review | Scope requests audited at PR review; over-scoped requests blocked by security gate          | 2026-03-18 |
| DEC-CAT-102 | HIGH     | Phase 2 (Permission Model)     | Prefer delegated permissions for user-context operations; app-only for background/daemon processes      | Delegated = user consent flow; app-only = admin consent + certificate auth                  | 2026-03-18 |
| DEC-CAT-103 | HIGH     | Phase 2 (Token Handling)       | Use MSAL for all token acquisition; no manual token storage or refresh logic                            | MSAL handles caching, refresh, and retry; manual token management is prohibited             | 2026-03-18 |
| DEC-CAT-104 | MEDIUM   | Phase 2 (Rate Limiting)        | Implement retry-after headers and exponential backoff for all Graph API calls                           | Graph API returns 429 with Retry-After header; client must honor it                         | 2026-03-18 |
| DEC-CAT-105 | MEDIUM   | Phase 2 (Batch Requests)       | Use JSON batching ($batch) for 3+ parallel Graph calls to the same tenant                               | Reduces round-trips; max 20 requests per batch; respect dependency ordering                 | 2026-03-18 |
| DEC-CAT-106 | MEDIUM   | Phase 5 (SDK Version)          | Pin Microsoft Graph SDK to specific version; update quarterly with changelog review                     | Breaking changes tracked in release notes; automated dependency updates via Dependabot      | 2026-03-18 |
| DEC-CAT-107 | LOW      | Phase 2 (Change Notifications) | Use Graph change notifications (webhooks) instead of polling for real-time data                         | Webhook endpoints require HTTPS with certificate validation; subscription renewal automated | 2026-03-18 |

---

_Category created: 2026-03-18 | Implementation Agent | Sprint 5 SP-5-CAT_
