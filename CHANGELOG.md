# Changelog

All notable changes to the Agentic SDLC Platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- GA definition document (`.github/docs/ga-definition.md`) — defines v1 GA as
  localhost/single-operator with supervised autonomy posture
- Security design document (`.github/docs/security-design.md`) — STRIDE threat
  model, 3 deployment profiles, hardening checklist
- Data inventory (`.github/docs/data-inventory.md`) — all data categories,
  retention policy, DSAR procedure, ROPA skeleton
- Privacy policy (`docs/privacy-policy.md`) — user-facing localhost privacy policy
- Truth-source policy (`.github/docs/truth-source-policy.md`) — evidence accuracy
  rules and enforcement
- CHANGELOG.md (this file)
- Release checklist document (`.github/docs/release-checklist.md`)
- Light/dark theme color tokens in design-tokens.json

### Changed
- README.md: reworded "autonomous" claims to "supervised (human-in-the-loop)"
- README.md: updated test badge from 576 to 1172
- README.md: fixed Technology Stack — added Jest 29 (root) alongside Vitest 4,
  corrected ESLint versions (8 + 10)
- README.md: corrected coverage badge from "95%+" to "70%+ enforced"
- Landing page: updated test count from 122 to 1172
- PR template: added evidence accuracy checklist, split test commands by suite
- CONTRIBUTING.md: updated ESLint section (8 + 10), dual test suite instructions

### Fixed
- design-tokens.json: text-muted color (#627D98 → #546A7B) to pass WCAG AA 4.5:1
  contrast ratio on light backgrounds
- contrast.test.js: all 29 tests now pass (previously failing due to missing
  `color.light`/`color.dark` structure)

---

## [0.3.0] — 2026-03-11 (Sprint 3)

### Added
- Matomo cookieless analytics integration (GDPR-compliant, no consent banner)
- A/B experiment framework on landing page (hero headline split test)
- Docker Compose stack (command-center + Matomo + MariaDB)
- Newsletter subscription endpoint with double opt-in
- Sprint 9 completion report and test plan
- 780 → 809 Vitest tests (contrast tests added)

### Changed
- Landing page social proof section updated

### Closed
- PR #136 — Sprint 3 squash-merge to main (commit `e11141b`)

---

## [0.2.0] — 2026-03-05 (Sprint 2)

### Added
- Command Center web UI v2 (pipeline view, questionnaire management, decisions)
- MCP server with 13 tools and 3 resources
- Mutation audit trail (append-only JSONL)
- File cache with mtime invalidation
- Schema validation for all JSON payloads
- Secret detection utility
- Error catalog with structured responses
- SSE (Server-Sent Events) for real-time updates
- 363 Jest tests (root) + initial Vitest suite
- ESLint configuration (root ESLint 8 + .github/ ESLint 9→10)

---

## [0.1.0] — 2026-02-20 (Sprint 1)

### Added
- Initial project structure with 38 agent skill files
- Phase 1–4 analysis pipeline (Business → Tech → UX → Marketing)
- Orchestrator with checkpoint-and-yield design
- Session state management (`session-state.json`)
- Basic Command Center web UI
- Questionnaire and decision management
- GitHub integration agent (project creation, issue publishing)
- CONTRIBUTING.md, LICENSE (MIT), SECURITY.md

---

[Unreleased]: https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/releases/tag/v0.1.0
