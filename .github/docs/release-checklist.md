# Release Checklist

| Field             | Value                                      |
| ----------------- | ------------------------------------------ |
| **Document**      | Release Checklist                          |
| **Version**       | 1.0                                        |
| **Created**       | 2026-03-12                                 |
| **Audit Finding** | F-05 (HIGH) — No release discipline exists |
| **Issue**         | #141                                       |

---

## Pre-Release

- [ ] All tests pass: root (`npm test` — 363 Jest) + .github/ (`npm test` — 809
      Vitest)
- [ ] ESLint clean: both root (ESLint 8) and .github/ (ESLint 10) report 0
      errors
- [ ] Coverage thresholds met (`npm run test:coverage` — 70% minimum)
- [ ] `npm audit` shows no critical/high vulnerabilities
- [ ] Secret scan passes (`detectSecrets()` on all staged files)
- [ ] CHANGELOG.md updated with all changes since last release
- [ ] Version bumped in `package.json` (root) and `.github/package.json`
- [ ] All `UNCERTAIN:` and `INSUFFICIENT_DATA:` items resolved or documented
- [ ] GA go/no-go criteria checked (see `.github/docs/ga-definition.md`
      Section 3)

## Release

- [ ] PR merged to `main` via squash merge
- [ ] Git tag created: `git tag -a vX.Y.Z -m "vX.Y.Z: <summary>"`
- [ ] Tag pushed: `git push origin vX.Y.Z`
- [ ] GitHub Release created from tag with release notes
- [ ] Release notes include: summary, breaking changes, migration steps (if any)

## Post-Release Validation

- [ ] Fresh clone: `git clone ... && cd ... && npm install && npm start` works
- [ ] Health check: `http://127.0.0.1:3000` responds with 200
- [ ] Docker: `docker compose up --build` starts without errors
- [ ] Both test suites pass from fresh clone
- [ ] CHANGELOG.md `[Unreleased]` section is empty (all items moved to version)

## Version Convention

- **Major (X)**: Breaking changes to agent contracts, session state format, or
  command syntax
- **Minor (Y)**: New features, new agents, new commands
- **Patch (Z)**: Bug fixes, documentation updates, security patches

## Release Cadence

- Sprint completion = potential release point
- GA release = v1.0.0 (when all go/no-go criteria pass)
- Pre-GA releases use v0.Y.Z versioning
- Release candidates use `-rc.N` suffix (e.g., v1.0.0-rc.1)
