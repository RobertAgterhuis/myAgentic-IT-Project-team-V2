# Decisions: Microsoft Entra ID (CAT-02)

> Stack: entra-id | Status: DEFERRED | Applicable: NO
> Deferred-Reason: No MSAL, identity, or Entra references detected. App uses
> localhost-only deployment profile (ga-definition.md). Activate when identity
> provider integration is introduced.
> GitHub Issue: #28

---

## Decided Items

| ID      | Priority | Scope                                | Decision                                                                                                    | Notes                                                                                                              | Date       |
| ------- | -------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------- |
| DEC-CAT-201 | HIGH | Phase 2 (Identity Provider)          | Use Microsoft Entra ID as sole identity provider; no custom auth or local user stores                        | Aligns with Microsoft 365 ecosystem; SSO via MSAL                                                                  | 2026-03-18 |
| DEC-CAT-202 | HIGH | Phase 2 (MSAL Configuration)         | Use @azure/msal-browser for SPA flows; @azure/msal-node for backend; no raw OAuth2 implementation           | MSAL handles PKCE, token refresh, and cache; custom OAuth2 flows prohibited                                        | 2026-03-18 |
| DEC-CAT-203 | HIGH | Phase 2 (Token Handling)             | No access tokens stored in localStorage; use MSAL cache or httpOnly secure cookies                           | XSS vector mitigation; MSAL's in-memory cache preferred for SPA                                                   | 2026-03-18 |
| DEC-CAT-204 | HIGH | Phase 2 (Conditional Access)         | Application must handle conditional access claims challenges gracefully                                      | Return proper error codes; guide user through MFA/compliance steps                                                 | 2026-03-18 |
| DEC-CAT-205 | MEDIUM | Phase 2 (App Registration)          | One app registration per environment (dev/staging/prod); no shared registrations                              | Separate client IDs, separate redirect URIs, separate secrets/certificates                                         | 2026-03-18 |
| DEC-CAT-206 | MEDIUM | Phase 2 (Secret Management)         | Use certificates over client secrets for production app registrations; rotate annually                        | Client secrets expire; certificates provide stronger authentication                                                | 2026-03-18 |
| DEC-CAT-207 | MEDIUM | Phase 5 (Group-Based Access)        | Use Entra ID security groups for RBAC; no per-user permission assignments                                    | Groups map to application roles; simplifies access management at scale                                             | 2026-03-18 |

---

_Category created: 2026-03-18 | Implementation Agent | Sprint 5 SP-5-CAT_
