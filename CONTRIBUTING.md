# Contributing to myAgentic-IT-Project-team

Thank you for your interest in contributing!

---

## Quick Setup

```bash
git clone https://github.com/RobertAgterhuis/myAgentic-IT-Project-team.git
cd myAgentic-IT-Project-team
npm install
npm test          # Vitest — all tests must pass
npm run lint      # ESLint — 0 errors required
```

---

## Full Guide

For the complete contributing guide — coding standards, architecture overview,
PR process, security requirements, and development cookbook — see
**[docs/contributing.md](docs/contributing.md)**.

---

## Commit Convention

```
<type>: <short summary>
```

Types: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`

---

## Questions?

Open a [GitHub Issue](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/issues).

### PR Review Checklist

- [ ] All tests pass (`npm test`)
- [ ] ESLint reports 0 errors (`npm run lint`)
- [ ] Coverage thresholds met (`npm run test:coverage`)
- [ ] No secrets or credentials in committed code
- [ ] Security headers maintained on new endpoints
- [ ] New user-facing strings added to `strings.ts`
- [ ] New errors added to `utils/errors.ts` catalog

---

## CI Health Review

A monthly CI health review process is documented in
[`docs/operations/ci-health-review.md`](docs/operations/ci-health-review.md). It tracks pipeline
success rate, duration trends, flaky tests, disabled gates, and coverage.

---

## Questions?

Open a
[GitHub Issue](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team/issues)
for questions, bug reports, or feature requests.
