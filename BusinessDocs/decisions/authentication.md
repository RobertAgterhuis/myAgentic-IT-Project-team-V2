# Decisions: Authentication & Authorization

> Stack: authentication | Status: ACTIVE | Applicable: YES
>
> Created 2026-03-16. Best-practice decisions for identity management,
> authentication protocols, authorization models, and token/session governance
> for full-stack applications.

---

## Decided Items

| ID      | Priority | Scope                             | Decision                                                                                                                                                                                                                                                                                           | Notes | Date       |
| ------- | -------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------- |
| DEC-331 | HIGH     | Phase 2 (Authentication Protocol) | Use OAuth 2.0 with PKCE (Authorization Code flow) for user-facing applications. Use Client Credentials flow for service-to-service communication. Implicit flow and Resource Owner Password Credentials (ROPC) flow are prohibited.                                                                |       | 2026-03-16 |
| DEC-332 | HIGH     | Phase 2 (Token Strategy)          | Use short-lived JWTs (access tokens: 15–60 minutes) with refresh tokens (8–24 hours, rotated on use). Store access tokens in memory only — never in localStorage. Store refresh tokens in secure HttpOnly cookies with `SameSite=Strict`.                                                          |       | 2026-03-16 |
| DEC-333 | HIGH     | Phase 2 (Authorization Model)     | Use Role-Based Access Control (RBAC) as the baseline. Implement Attribute-Based Access Control (ABAC) or policy-based access for fine-grained scenarios. Enforce authorization at the API layer — never rely solely on client-side checks. All endpoints must declare required permissions.        |       | 2026-03-16 |
| DEC-334 | HIGH     | Phase 2 (Session Management)      | Set absolute session timeout (8–12 hours for standard apps, shorter for sensitive). Implement idle timeout (15–30 minutes inactivity). Invalidate sessions on password change. Support concurrent session limits per user. Provide session revocation API.                                         |       | 2026-03-16 |
| DEC-335 | HIGH     | Phase 2 (Password Policy)         | Minimum 12 characters. No maximum length below 128 characters. Check against breached password databases (e.g., HaveIBeenPwned API). Use bcrypt, scrypt, or Argon2id for hashing — never MD5/SHA-1. No password rotation requirements (per NIST 800-63B). Allow passkey/WebAuthn as primary.       |       | 2026-03-16 |
| DEC-336 | HIGH     | Phase 2 (MFA)                     | MFA is mandatory for admin and privileged accounts. MFA is recommended for all user accounts. Support TOTP and WebAuthn/FIDO2. SMS-based MFA is discouraged (SIM-swap risk). Provide recovery codes as fallback.                                                                                   |       | 2026-03-16 |
| DEC-337 | HIGH     | Phase 2 (Service-to-Service Auth) | Use managed identities (cloud) or mTLS (on-prem) for service-to-service authentication. API keys are acceptable for third-party integrations only, with rotation policy (90 days maximum). Never embed service credentials in source code.                                                         |       | 2026-03-16 |
| DEC-338 | MEDIUM   | Phase 2 (SSO Integration)         | Support SAML 2.0 and OpenID Connect for enterprise SSO integration. SSO must be the default for enterprise/B2B customers. Map SSO groups to application roles automatically. Support Just-in-Time (JIT) user provisioning.                                                                         |       | 2026-03-16 |
| DEC-339 | MEDIUM   | Phase 2 (Token Validation)        | Validate signature, issuer (`iss`), audience (`aud`), expiration (`exp`), and not-before (`nbf`) on every request. Reject tokens with `alg: none`. Use asymmetric keys (RS256/ES256) for token signing — symmetric (HS256) only for single-service scenarios. Fetch JWKS dynamically with caching. |       | 2026-03-16 |
| DEC-340 | MEDIUM   | Phase 2 (API Key Management)      | API keys are for machine-to-machine authentication only — never as a sole mechanism for user auth. Keys must be scoped to specific permissions. Implement key rotation (max 90-day lifetime). Log all key usage. Support immediate revocation. Store keys hashed, not plaintext.                   |       | 2026-03-16 |
