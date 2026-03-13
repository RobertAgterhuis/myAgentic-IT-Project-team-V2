# Decisions: Microsoft Teams (CAT-05)

> Stack: teams | Status: DEFERRED | Applicable: NO
> Deferred-Reason: No Teams Bot Framework, adaptive cards, tabs, messaging
> extensions, or Teams Graph endpoints detected. Activate when Teams integration
> is introduced.
> GitHub Issue: #31

---

## Decided Items

| ID          | Priority | Scope                         | Decision                                                                                             | Notes                                                                                    | Date       |
| ----------- | -------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------- |
| DEC-CAT-501 | HIGH     | Phase 2 (Bot Framework)       | Use Bot Framework SDK v4 for all Teams bot interactions; no direct REST API calls to Bot Connector   | SDK handles authentication, activity routing, and state management                       | 2026-03-18 |
| DEC-CAT-502 | HIGH     | Phase 2 (Adaptive Cards)      | Use Adaptive Cards for all rich content in Teams; no custom HTML in messages                         | Adaptive Cards render natively across Teams clients; version pin to latest stable schema | 2026-03-18 |
| DEC-CAT-503 | HIGH     | Phase 2 (App Manifest)        | One Teams app manifest per environment; validate against Teams app validation tool before submission | Environment-specific bot endpoints and tab URLs                                          | 2026-03-18 |
| DEC-CAT-504 | MEDIUM   | Phase 2 (Permissions)         | Request minimum RSC (resource-specific consent) permissions; avoid tenant-wide admin consent         | RSC enables granular permissions per team/chat without admin approval                    | 2026-03-18 |
| DEC-CAT-505 | MEDIUM   | Phase 5 (Proactive Messaging) | Use proactive messaging only for user-initiated subscriptions; no unsolicited bot messages           | Respect user consent; provide unsubscribe mechanism                                      | 2026-03-18 |
| DEC-CAT-506 | LOW      | Phase 2 (Tab SSO)             | Use Teams SSO for tab authentication; no separate login flow                                         | Teams provides silent token acquisition for tabs; falls back to consent popup            | 2026-03-18 |

---

_Category created: 2026-03-18 | Implementation Agent | Sprint 5 SP-5-CAT_
