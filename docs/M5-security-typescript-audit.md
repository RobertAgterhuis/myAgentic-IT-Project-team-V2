# M5: Security + TypeScript (AUDIT)

| Field          | Value                                        |
| -------------- | -------------------------------------------- |
| **Milestone**  | M5                                           |
| **Branch**     | `feature/M5-security-typescript-audit`       |
| **Created**    | 2026-03-13                                   |
| **Status**     | IN_PROGRESS                                  |

---

## Audit Findings Summary

### Security Findings

| ID    | Severity | Finding                                               | Status       |
| ----- | -------- | ----------------------------------------------------- | ------------ |
| SEC-1 | MEDIUM   | Docker `HOST=0.0.0.0` exposes server to all interfaces | FIX in S5-1  |
| SEC-2 | LOW      | Docker container runs as root                          | FIX in S5-1  |
| SEC-3 | LOW      | No Docker resource limits (memory/CPU)                 | FIX in S5-1  |
| SEC-4 | MEDIUM   | CSP allows `'unsafe-inline'` for scripts and styles    | FIX in S5-2  |
| SEC-5 | LOW      | No explicit CORS policy (relies on localhost binding)  | FIX in S5-2  |
| SEC-6 | INFO     | `child_process.execSync` used in dashboard.js          | ACCEPTABLE — allowlist-gated, no user input |
| SEC-7 | PASS     | npm audit: 0 vulnerabilities (92 prod, 714 dev deps)  | CLEAN        |
| SEC-8 | PASS     | No `eval()` or `Function()` calls found                | CLEAN        |
| SEC-9 | PASS     | Path traversal protected by `safePath()`               | VERIFIED     |
| SEC-10| PASS     | Input sanitization: markdown, QID, body size, secrets  | VERIFIED     |
| SEC-11| PASS     | Atomic file writes via temp+rename pattern             | VERIFIED     |
| SEC-12| PASS     | Audit trail for all mutations                          | VERIFIED     |
| SEC-13| PASS     | Server binds `127.0.0.1` by default (non-Docker)       | VERIFIED     |
| SEC-14| INFO     | No npm audit CI gate in existing workflows              | FIX in S5-5  |

### TypeScript Findings

| ID   | Finding                                                   | Status       |
| ---- | --------------------------------------------------------- | ------------ |
| TS-1 | Zero `.ts` files in codebase — all plain JS               | FIX in S5-3+ |
| TS-2 | No `tsconfig.json` exists                                  | FIX in S5-3  |
| TS-3 | TypeScript `^5.9.3` already in devDependencies            | READY        |
| TS-4 | `@typescript-eslint` parser + plugin already configured    | READY        |
| TS-5 | Good JSDoc annotations on middleware, store, models        | LEVERAGE     |
| TS-6 | `@types/node` `^20.19.37` already installed               | READY        |
| TS-7 | `@types/jest` installed; vitest has built-in types         | READY        |
| TS-8 | All source is CommonJS (`require`/`module.exports`)        | INCREMENTAL  |

---

## Sprint Plan

### S5-1: Docker Hardening
- Add `USER node` to Dockerfile (non-root container)
- Change docker-compose port to `127.0.0.1:3000:3000`
- Add memory/CPU resource limits to docker-compose
- Add `.dockerignore` for build optimization

### S5-2: CSP + Security Headers Hardening
- Replace `'unsafe-inline'` in CSP with nonce-based approach for dashboard
- Add `Strict-Transport-Security` header (prep for HTTPS)
- Add explicit `X-DNS-Prefetch-Control: off`

### S5-3: TypeScript Foundation
- Create `tsconfig.json` with `allowJs: true`, `checkJs: true`, `noEmit: true`
- Enable incremental type checking on existing JS via JSDoc
- Verify `tsc --noEmit` runs cleanly (or catalog remaining errors)

### S5-4: Core Module Type Stubs
- Create `src/webapp/types/` with `.d.ts` definitions for shared interfaces
- Type the `Store` interface, `ctx` object, route handler signatures
- Ensure IDE intellisense works for all core modules

### S5-5: Security CI Gate
- Add npm audit check to existing CI workflow
- Add TypeScript type-check (`tsc --noEmit`) to CI

### S5-6: Audit Report + Regression Tests
- Security-focused test: verify Docker non-root, CSP headers, safePath
- Commit comprehensive audit report
- Update `data/milestones.json`
