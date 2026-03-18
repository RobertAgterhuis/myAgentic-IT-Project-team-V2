# Code Quality Remediation

## Current Assessment

The codebase has better structure than the average solo project, but its safety margin is lower than it should be for continued platform growth. The most important issue is not formatting or naming. It is the combination of loose TypeScript settings, mixed JS and TS posture, and concentrated logic in several large modules.

## Validated Findings

- `tsconfig.json` has `strict: false` and `strictNullChecks: false`.
- `tsconfig.json` has `allowJs: true` and `checkJs: true`, confirming a mixed JS and TS posture.
- `vitest.config.mjs` targets root JS tests and excludes the UI package from root coverage.
- `eslint.config.mjs` ignores `src/webapp/ui/` at the root because the UI package maintains its own lint setup.
- Representative large files exist, including `src/webapp/routes/misc.ts` at 461 lines and `src/webapp/services/session-service.ts` at 347 lines.

## My Opinion

The code quality problem is not chaos. It is incomplete convergence. The repository is in the middle of moving toward a more disciplined TS-first platform structure, but it has not crossed the line where refactoring is predictably safe.

## Target State

The repository should move toward:

- strict TypeScript by default
- clear package-level ownership of lint and typecheck
- smaller route and service modules
- less duplication between runtime paths and test support paths

## How I Would Fix It

### Fix 1: Turn on strictness incrementally

Use a staged plan:

1. enable `strictNullChecks` first
2. fix highest-churn modules first
3. enable full `strict`
4. track remaining exceptions explicitly rather than leaving the whole repo loose

This should be done with milestone-based burn-down, not one large risky change.

### Fix 2: Decompose concentrated modules

Break up large files by responsibility.

Examples:

- split `src/webapp/routes/misc.ts` by concern such as health, analytics, audit, and static behavior
- split `src/webapp/services/session-service.ts` into session state, transition logic, and persistence helpers

### Fix 3: Unify quality gates across root and UI

Keep separate package tooling where it makes sense, but make the coverage story explicit:

- root typecheck scope
- UI typecheck scope
- root lint scope
- UI lint scope
- combined CI reporting expectations

### Fix 4: Reduce migration ambiguity

Decide which JS areas are still transitional and which are permanent. If the goal is TS-first, create a burn-down list for remaining JS-heavy paths and test harnesses.

## Milestone Candidate

Milestone: Type Safety and Module Decomposition

## Epic Candidates

### Epic: Strict TypeScript migration

Suggested issues:

- Enable `strictNullChecks` and fix resulting errors
- Enable `strict` and remove remaining blockers
- Add CI guard to prevent regression once strict mode is on

### Epic: Service and route decomposition

Suggested issues:

- Split `misc.ts` into focused route modules
- Split `session-service.ts` into domain-focused service units
- Refactor shared helpers out of oversized modules

### Epic: Quality gate convergence

Suggested issues:

- Document root versus UI lint and typecheck responsibilities
- Ensure CI reports both root and UI quality status coherently
- Reduce avoidable exclusions over time

## Acceptance Criteria

- TypeScript strictness is enabled for core backend and platform code.
- High-risk modules are decomposed into smaller units.
- CI clearly communicates quality status across both root and UI packages.
- Migration residue is tracked explicitly rather than implied by loose settings.
