# Truth-Source Policy

| Field             | Value                                                         |
| ----------------- | ------------------------------------------------------------- |
| **Document**      | Evidence and Claims Accuracy Policy                           |
| **Version**       | 1.0                                                           |
| **Status**        | ACTIVE                                                        |
| **Created**       | 2026-03-12                                                    |
| **Audit Finding** | F-04 (HIGH) — Autonomy claims exceed current implementation   |
|                   | F-07 (HIGH) — Test counts and tooling versions are inaccurate |
| **Issues**        | #140, #142                                                    |

---

## 1. Purpose

This policy defines how metrics, counts, versions, and capability claims in
public-facing documents (README.md, landing page, badges, docs/) are kept
accurate.

---

## 2. Rules

### 2.1 Metrics Must Be Measured

Every numeric claim (test counts, coverage percentages, agent counts, etc.) must
come from an automated or verifiable source:

| Claim                     | Source of Truth                        | How to Verify                          |
| ------------------------- | -------------------------------------- | -------------------------------------- |
| Test count (root)         | `npm test` output                      | Run `npm test` from project root       |
| Test count (.github/)     | `npm test` output                      | Run `cd .github && npm test`           |
| Total test count          | Sum of root + .github/                 | Badges updated from CI or manual count |
| Coverage threshold        | vitest.config.mjs / jest.config        | Read coverage thresholds from config   |
| ESLint version (root)     | `npx eslint --version`                 | Check root package.json                |
| ESLint version (.github/) | `npx eslint --version`                 | Check .github/package.json             |
| Agent count               | Count skill files in `.github/skills/` | `ls .github/skills/*.md \| wc -l`      |
| Build status              | CI pipeline badge                      | Linked to GitHub Actions               |

### 2.2 Capability Claims Must Match Implementation Status

Every feature or capability claim must be classified:

| Status          | Badge           | Meaning                                              |
| --------------- | --------------- | ---------------------------------------------------- |
| **Implemented** | No badge needed | Feature works as described                           |
| **Designed**    | `[Designed]`    | Architecture/design complete, implementation pending |
| **Planned**     | `[Planned]`     | On the roadmap, not yet designed                     |

Claims that blur these boundaries violate this policy.

### 2.3 Autonomy Claims

The system operates in **supervised mode** by default:

- The Orchestrator yields after each agent and waits for the operator to type
  **CONTINUE**
- No agent makes irreversible changes without operator approval
- Phase boundaries require a fresh conversation (operator action)

Public-facing text must reflect this supervised posture. Terms like
"autonomous," "fully automated," or "hands-free" must not be used without
qualification.

Acceptable phrasings:

- "supervised sprint execution (human-in-the-loop)"
- "AI-assisted implementation with operator approval gates"
- "automated analysis with human checkpoint-and-yield"

### 2.4 Update Cadence

- **Per sprint**: Test counts and coverage badges must be verified at Sprint
  Gate before merge to main
- **Per release**: All public-facing metrics must be verified against the actual
  codebase
- **Immediately**: If a document is updated that references metrics, those
  metrics must be re-verified

---

## 3. Violations Found by GA Audit

| Finding | Description                                              | Corrective Action                                                                                |
| ------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| F-04    | README said "autonomous sprint-by-sprint implementation" | Changed to "supervised sprint-by-sprint implementation (human-in-the-loop, CONTINUE-to-proceed)" |
| F-07    | Test badge showed "576 passing" (actual: 1172)           | Updated badge to 1172; split by Jest (363) + Vitest (809)                                        |
| F-07    | Technology Stack listed only Vitest                      | Added Jest 29 (root) alongside Vitest 4 (.github/)                                               |
| F-07    | Technology Stack listed ESLint 9                         | Corrected to ESLint 8 (root) + ESLint 10 (.github/)                                              |
| F-07    | Coverage badge showed 95%+                               | Corrected to "70%+ enforced" (actual threshold)                                                  |
| F-07    | Landing page showed "122 tests"                          | Updated to 1172                                                                                  |

---

## 4. Enforcement

- Sprint Gate Step 0 includes a "metrics verification" check
- The PR template includes a "evidence accuracy" checklist item
- Critic Agent validates claims against measurable sources

---

_All public-facing claims must be verifiable. When in doubt, mark the claim with
its status or remove it._
