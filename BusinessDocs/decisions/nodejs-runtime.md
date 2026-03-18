# Decisions: Node.js / tsx Runtime

> Stack: nodejs-runtime | Status: ACTIVE | Applicable: YES
>
> Created 2026-03-16 during reevaluation. The backend runs on Node.js via tsx
> (TypeScript execution without build step). The module system is mixed: root
> uses CommonJS (`"module": "commonjs"` in tsconfig), UI uses ESM (`"type":
"module"` in package.json).

---

## Decided Items

| ID      | Priority | Scope                               | Decision                                                                                                                                                                                                                      | Notes | Date       |
| ------- | -------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------- |
| DEC-283 | HIGH     | Phase 2 (Node.js Version Pinning)   | Pin to current active LTS (Node.js 22 as of March 2026). Use `.nvmrc` or `engines` field (currently `>=18.0.0` — update to `>=22.0.0`). Enforce version in CI via `setup-node` action.                                        |       | 2026-03-16 |
| DEC-284 | HIGH     | Phase 2 (tsx Runtime Strategy)      | Use tsx for development and production runtime (zero-build TypeScript execution). This avoids a separate build step. Monitor tsx stability; if issues arise, migrate to `tsc` + `node`.                                       |       | 2026-03-16 |
| DEC-285 | HIGH     | Phase 2 (Module System)             | Target ESM as the canonical module system. Root package should migrate from CJS to ESM (`"type": "module"` in package.json, `"module": "ESNext"` in tsconfig). Track CJS→ESM migration as tech debt.                          |       | 2026-03-16 |
| DEC-286 | HIGH     | Phase 2 (Security: Dependencies)    | Run `npm audit` as blocking CI check. Critical/high vulnerabilities block merge. Direct dependencies must be reviewed before adoption. Lockfile (`package-lock.json`) must be committed and enforced in CI (`npm ci`).        |       | 2026-03-16 |
| DEC-287 | MEDIUM   | Phase 2 (Package Manager)           | npm is the mandated package manager (already in use). Use `engine-strict=true` in `.npmrc`. Prevent accidental yarn/pnpm usage via `only-allow` or equivalent preinstall check.                                               |       | 2026-03-16 |
| DEC-288 | MEDIUM   | Phase 2 (Dual Test Runner)          | Target Vitest as the single test runner. Migrate remaining Jest tests to Vitest incrementally. New tests must use Vitest. Remove Jest dependency when migration is complete.                                                  |       | 2026-03-16 |
| DEC-289 | MEDIUM   | Phase 2 (Process Management)        | Use graceful shutdown handling (SIGTERM/SIGINT). Define explicit startup health checks. Configure appropriate timeouts. In containerized deployments, run as PID 1 with signal handling or use dumb-init/tini.                |       | 2026-03-16 |
| DEC-290 | MEDIUM   | Phase 2 (Environment Configuration) | Use environment variables for all environment-specific config. Do not commit `.env` files with secrets. Validate required environment variables at startup with fail-fast. Document all env vars in README or `.env.example`. |       | 2026-03-16 |
| DEC-291 | LOW      | Phase 2 (Node.js Upgrade Cadence)   | Adopt new LTS within 90 days of release. Apply security patches within 7 days. Test against new Node.js version in CI matrix before production adoption.                                                                      |       | 2026-03-16 |
