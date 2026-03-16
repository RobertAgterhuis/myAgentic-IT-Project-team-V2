# M15: Test Runner Unification

> **Impact:** LOW | **Breaking changes:** NONE | **Blocks:** nothing |
> **Blocked by:** nothing
>
> **Audit reference:** Weakness #2 — "Tooling consistency is uneven. The root
> package mixes Jest and Vitest."
>
> **Validation:** CONFIRMED. Root `package.json` contains both `jest@^29.7.0` +
> `ts-jest` and `vitest@^4.0.18`. Jest `testMatch` targets 14 specific files.
> The UI workspace already uses Vitest exclusively. Running `npm test` uses Jest;
> `npm run test:vitest` uses Vitest. `npm run test:all` chains both.

---

## Rationale

Two test runners increase cognitive overhead (different assertion styles, config
files, mocking strategies), slow CI (two separate test processes), and make
coverage aggregation harder. The UI already standardized on Vitest. Vitest is
faster, natively supports ESM/TypeScript, and shares the Vite transform pipeline.

---

## Issues

### M15-001: Audit Jest test files for Vitest compatibility

**Labels:** `testing`, `cleanup`

Inventory all 14 Jest-specific test files. For each file, document:

- Which Jest-specific APIs are used (`jest.fn()`, `jest.mock()`,
  `jest.spyOn()`, `jest.useFakeTimers()`, `describe.each`, etc.)
- Whether the file uses `ts-jest` transforms
- Any Jest-specific config (moduleNameMapper, testEnvironment)
- Migration effort estimate (trivial / minor / significant)

**Acceptance criteria:**

- [ ] Spreadsheet/table of all 14 files with API usage and effort estimate
- [ ] No file is missed

---

### M15-002: Migrate Jest test files to Vitest

**Labels:** `testing`, `refactor`

For each file identified in M15-001:

- Replace `jest.fn()` → `vi.fn()`, `jest.mock()` → `vi.mock()`,
  `jest.spyOn()` → `vi.spyOn()`, etc.
- Replace `jest.useFakeTimers()` → `vi.useFakeTimers()`
- Update imports: add `import { describe, it, expect, vi } from 'vitest'` if
  not using globals
- Verify each file passes with `vitest run`

**Acceptance criteria:**

- [ ] All 14 former Jest files pass under Vitest
- [ ] No Jest-specific APIs remain in any test file
- [ ] `vitest run` executes all tests (root + UI) in a single run

---

### M15-003: Remove Jest dependencies and configuration

**Labels:** `testing`, `cleanup`

- Remove from `package.json`: `jest`, `ts-jest`, `@types/jest`
- Remove `jest.config.*` or Jest config section from `package.json`
- Remove `setup-require-hook.js` if Jest-specific
- Update `.eslintrc` / `eslint.config.mjs` if it references Jest globals

**Acceptance criteria:**

- [ ] `jest` not in `package.json` (dependencies or devDependencies)
- [ ] No Jest config files remain
- [ ] `npm ls jest` returns empty

---

### M15-004: Unify test scripts in package.json

**Labels:** `testing`, `dx`

Simplify the script surface:

- `"test"` → `vitest run`
- `"test:watch"` → `vitest`
- `"test:coverage"` → `vitest run --coverage`
- Remove `"test:all"` (no longer needed — single runner)
- Keep specialized scripts: `test:integration`, `test:smoke`, `test:e2e`,
  `test:translations`, `test:a11y`

**Acceptance criteria:**

- [ ] `npm test` runs all unit tests via Vitest
- [ ] `npm run test:coverage` produces a combined coverage report
- [ ] No dual-runner scripts remain
- [ ] README/CONTRIBUTING updated to reflect single runner

---

### M15-005: Verify CI pipeline uses unified test runner

**Labels:** `testing`, `ci`

Update `.github/workflows/ci.yml` and `ci-pipeline.yml`:

- Replace any `jest` invocations with `vitest run`
- Ensure coverage upload (if enabled) uses Vitest's `coverage-final.json`
- Verify Codecov or coverage tool compatibility

**Acceptance criteria:**

- [ ] CI passes with Vitest-only test execution
- [ ] Coverage artifact is produced from Vitest
- [ ] No Jest references remain in workflow files
