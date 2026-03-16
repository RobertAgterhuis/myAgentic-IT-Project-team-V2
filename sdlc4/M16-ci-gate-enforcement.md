# M16: CI Gate Enforcement

> **Impact:** LOW | **Breaking changes:** NONE | **Blocks:** nothing |
> **Blocked by:** nothing
>
> **Audit reference:** Weakness #3 — "Some major quality gates are not actually
> enforced in CI. Disabled integration, smoke, and accessibility jobs reduce the
> practical value of the stated quality posture." Score: CI/CD enforcement 6.5/10.
>
> **Validation:** CONFIRMED. Codecov patch-coverage check is explicitly commented
> out in `ci-pipeline.yml`. Integration tests (`test:integration`) and smoke
> tests (`test:smoke`) are not wired into the main CI workflow. The accessibility
> gate (`test:a11y`) is disabled pending runtime configuration.

---

## Rationale

The test inventory (101+ files, 1,370+ passing tests) is a major asset, but its
value is only realized when CI enforces it. Every disabled gate is a regression
risk that test writing effort cannot compensate for.

---

## Issues

### M16-001: Enable integration tests in CI

**Labels:** `ci`, `testing`, `quality`

Add `npm run test:integration` as a required job in `ci-pipeline.yml`. The 15
integration test files in `tests/integration/` must execute on every PR.

- Ensure the job has appropriate timeouts (integration tests may be slower)
- If tests require a running server, add a `services` or `setup` step
- If any integration tests are flaky, quarantine them (`it.skip` with
  `// TODO: flaky`) rather than disabling the entire job

**Acceptance criteria:**

- [ ] `test:integration` runs as a required CI job on every PR
- [ ] All non-quarantined integration tests pass in CI
- [ ] Job timeout is set (suggested: 5 minutes)

---

### M16-002: Enable smoke tests in CI

**Labels:** `ci`, `testing`, `quality`

Add `npm run test:smoke` as a required job. The 2 smoke test files in
`tests/smoke/` should run after unit tests pass.

- Smoke tests validate that the server starts and responds to health checks
- If they require `npm start`, add a background server step with health-check
  wait

**Acceptance criteria:**

- [ ] `test:smoke` runs as a required CI job on every PR
- [ ] Both smoke test files pass
- [ ] Smoke job depends on unit test job (fail-fast)

---

### M16-003: Enable accessibility gate in CI

**Labels:** `ci`, `a11y`, `quality`

Re-enable `test:a11y` in CI. If it requires a running Storybook or browser:

- Add a Storybook build step (or use the existing `storybook.yml` artifact)
- Use `axe-core` or `pa11y` against rendered components
- If full a11y testing is too heavy for every PR, run on `main` branch merges
  and weekly schedule

**Acceptance criteria:**

- [ ] Accessibility tests execute in CI (PR or main-branch trigger)
- [ ] A11y violations are reported in CI output (not silently ignored)
- [ ] Blocking severity (critical/serious) fails the build; moderate/minor are
      warnings

---

### M16-004: Re-enable coverage enforcement

**Labels:** `ci`, `testing`, `quality`

Uncomment or re-add the Codecov patch-coverage check in `ci-pipeline.yml`:

- Set a realistic patch-coverage threshold (suggested: 60% for patches, no
  regression on overall)
- If Codecov is not desired, use Vitest's built-in coverage thresholds in
  `vitest.config.mjs` with `--coverage.thresholds.lines=X`
- Ensure `coverage-final.json` is uploaded as a CI artifact

**Acceptance criteria:**

- [ ] Coverage is measured and reported on every PR
- [ ] PRs that drop coverage below threshold are flagged (warning or fail)
- [ ] Coverage report artifact is downloadable from CI

---

### M16-005: Add CI status badges to README

**Labels:** `ci`, `docs`

Add workflow status badges to the top of `README.md` for:

- `ci.yml` (build + test)
- `ci-pipeline.yml` (extended pipeline)
- Coverage percentage
- `storybook.yml` (Storybook build)

**Acceptance criteria:**

- [ ] README shows live CI status badges
- [ ] Badges link to the respective workflow runs

---

### M16-006: Create CI health dashboard issue template

**Labels:** `ci`, `process`

Create a recurring process to review CI health monthly:

- Pipeline success rate
- Average pipeline duration
- Flaky test inventory
- Disabled gates inventory

**Acceptance criteria:**

- [ ] Monthly CI health review checklist documented in `docs/` or
      `CONTRIBUTING.md`
- [ ] Initial baseline captured (current success rate, duration, disabled gates)
