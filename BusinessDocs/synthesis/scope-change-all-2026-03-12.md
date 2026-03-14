# SCOPE CHANGE ALL — March 12, 2026

## Source

Comprehensive Audit Report v1.2:
`word/transformed_doc/myAgentic-IT-Project-team-V2-Audit-Report-v1.2-FINAL.md`

## Summary

Full scope change replacing all GitHub issues and milestones with an integrated
sprint plan derived from the v1.2 audit of the 38-Agent SDLC Platform.

## Actions Taken

### 1. Closed All Existing Issues

36 open issues closed as "not planned" (all were from pre-audit backlog).

### 2. Deleted All Existing Milestones

27 milestones (numbered 1–27) deleted.

### 3. Created New Milestones (M0–M10)

| API # | ID  | Title                         | Due Date   |
| ----- | --- | ----------------------------- | ---------- |
| 28    | M0  | Repo Restructuring (AUDIT)    | 2026-04-15 |
| 29    | M1  | Sprint 2 Completion           | 2026-05-15 |
| 30    | M2  | Pipeline Hardening (AUDIT)    | 2026-06-15 |
| 31    | M3  | Code Orchestrator (FEAT-05)   | 2026-07-15 |
| 32    | M4  | Canonical Schema (FEAT-03)    | 2026-08-15 |
| 33    | M5  | Security + TypeScript (AUDIT) | 2026-09-15 |
| 34    | M6  | v1.0 GA                       | 2026-10-15 |
| 35    | M7  | Tool Abstraction (FEAT-04)    | 2026-11-15 |
| 36    | M8  | Claude + OpenAI (FEAT-06/07)  | 2026-12-15 |
| 37    | M9  | Enterprise UI (FEAT-02)       | 2027-01-15 |
| 38    | M10 | MCP + Context (FEAT-08/09)    | 2027-02-15 |

### 4. Created Sprint Labels

S0, S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, scope-change

### 5. Created 48 Issues (#151–#198)

| Sprint    | Milestone | Issues    | Count  |
| --------- | --------- | --------- | ------ |
| S0        | M0        | #151–#157 | 7      |
| S1        | M1        | #158–#163 | 6      |
| S2        | M2        | #164–#169 | 6      |
| S3        | M3        | #170–#175 | 6      |
| S4        | M4        | #176–#182 | 7      |
| S5        | M5        | #183–#187 | 5      |
| S6        | M6        | #188–#194 | 7      |
| S7        | M7        | #195      | 1      |
| S8        | M8        | #196      | 1      |
| S9        | M9        | #197      | 1      |
| S10       | M10       | #198      | 1      |
| **Total** |           |           | **48** |

### Issue Index

| #   | Title                                                   | Sprint | Priority |
| --- | ------------------------------------------------------- | ------ | -------- |
| 151 | S0-1: Move src/webapp/ to src/webapp/                   | S0     | P0       |
| 152 | S0-2: Move agents/ to agents/                           | S0     | P0       |
| 153 | S0-3: Merge docs/ into root docs/                       | S0     | P0       |
| 154 | S0-4: Unify tests into tests/                           | S0     | P0       |
| 155 | S0-5: Single package.json + ESLint config               | S0     | P0       |
| 156 | S0-6: Gitignore runtime files + fix naming              | S0     | P1       |
| 157 | S0-7: Update CI workflows + MCP paths                   | S0     | P1       |
| 158 | S1-1: CI Job 7 verification on main                     | S1     | P1       |
| 159 | S1-2: CI Job 8 accessibility gate                       | S1     | P1       |
| 160 | S1-3: TMS setup and integration                         | S1     | P1       |
| 161 | S1-4: Landing page + GTM messaging                      | S1     | P1       |
| 162 | S1-5: Matomo + Buttondown + Social publishing           | S1     | P1       |
| 163 | S1-6: Pilot rubric + feedback validation                | S1     | P2       |
| 164 | S2-1: Raise test coverage to 80%                        | S2     | P0       |
| 165 | S2-2: E2E smoke test - full CREATE pipeline             | S2     | P0       |
| 166 | S2-3: Fix Gitleaks hard gate                            | S2     | P1       |
| 167 | S2-4: Add middleware + route tests (85% coverage)       | S2     | P1       |
| 168 | S2-5: Consolidate ESLint to flat config                 | S2     | P1       |
| 169 | S2-6: Pre-commit hook for lint + test                   | S2     | P1       |
| 170 | S3-1: Harden state machine engine (P0)                  | S3     | P0       |
| 171 | S3-2: Harden agent dispatcher (P0)                      | S3     | P0       |
| 172 | S3-3: Gate validation (Critic + Risk) engine            | S3     | P1       |
| 173 | S3-4: Sprint Gate engine (Definition of Ready)          | S3     | P1       |
| 174 | S3-5: Orchestrator CLI and API                          | S3     | P2       |
| 175 | S3-6: Webapp pipeline visualization                     | S3     | P2       |
| 176 | S4-1: Canonical agent schema (platform-neutral)         | S4     | P1       |
| 177 | S4-2: Canonical flow schema (phases, gates, handoffs)   | S4     | P1       |
| 178 | S4-3: Canonical tool contract schema                    | S4     | P1       |
| 179 | S4-4: Copilot instruction generator (transpiler 1)      | S4     | P1       |
| 180 | S4-5: Claude instruction generator (transpiler 2)       | S4     | P1       |
| 181 | S4-6: OpenAI Codex instruction generator (transpiler 3) | S4     | P1       |
| 182 | S4-7: Transpiler CI pipeline (sync validation)          | S4     | P2       |
| 183 | S5-1: Rate limiting (100 req/min)                       | S5     | P0       |
| 184 | S5-2: Content Security Policy headers                   | S5     | P0       |
| 185 | S5-3: Session auth for web UI                           | S5     | P0       |
| 186 | S5-4: Docker deployment readiness                       | S5     | P1       |
| 187 | S5-5: Migrate core modules to TypeScript                | S5     | P1       |
| 188 | S6-1: Tag v1.0.0 + GitHub Release                       | S6     | P0       |
| 189 | S6-2: Domain glossary document                          | S6     | P1       |
| 190 | S6-3: Lesson-to-decision promotion mechanism            | S6     | P1       |
| 191 | S6-4: GitHub Pages documentation site                   | S6     | P1       |
| 192 | S6-5: Contributor onboarding guide                      | S6     | P1       |
| 193 | S6-6: Label CAT-\* issues as on-detection (dormant)     | S6     | P2       |
| 194 | S6-7: Demo video or GIF (CREATE walkthrough)            | S6     | P2       |
| 195 | S7: Tool Abstraction Layer (FEAT-04) - Epic             | S7     | P1       |
| 196 | S8: Claude + OpenAI Integration (FEAT-06/07) - Epic     | S8     | P1       |
| 197 | S9: Enterprise UI Redesign (FEAT-02) - Epic             | S9     | P2       |
| 198 | S10: MCP + Context Portability (FEAT-08/09) - Epic      | S10    | P2       |

## Mandatory Code Requirements

All 48 issues include the following footer:

> All code changes for this story MUST follow:
>
> - **DRY** — No duplicated logic; extract shared functionality
> - **No GOD code** — No monolithic files/functions; keep single responsibility
> - **Modular** — Separate concerns into focused, testable modules
> - **Best-practice folder structure** — Follow established project conventions

## Scripts

- `scripts/create-scope-change-issues-v2.ps1` — Script used to create all issues
