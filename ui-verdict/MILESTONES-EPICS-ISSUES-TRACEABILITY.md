# UI Milestones / Epics / Issues Traceability Backlog

Purpose: Convert all identified UI weaknesses into GitHub-ready user stories with explicit priority (P1-P4), blocking status, and dependency order.

Sources:

- [ui-verdict/A-ui-architecture-frontend-engineering.md](ui-verdict/A-ui-architecture-frontend-engineering.md)
- [ui-verdict/B-user-experience-interaction-design.md](ui-verdict/B-user-experience-interaction-design.md)
- [ui-verdict/C-visual-design-polish.md](ui-verdict/C-visual-design-polish.md)
- [ui-verdict/D-frontend-quality-maintainability.md](ui-verdict/D-frontend-quality-maintainability.md)

## Priority Model

- P1: Immediate risk reduction and platform readiness blockers.
- P2: Structural scale-up and quality acceleration.
- P3: Operational hardening and experience depth.
- P4: Nice-to-have optimization and long-tail improvements.

## Execution Rule

1. Complete all items with Blocking=YES first.
2. Then complete remaining P1 by dependency order.
3. Then complete P2, P3, and P4.

---

## Milestone P1 - Reliability, Accessibility Baseline, and Release Safety

Milestone goal: Remove major release risks for consistency, accessibility, reliability visibility, and performance governance.

### Epic P1-E1 - Architecture Decomposition and State Ownership

| Issue ID | Priority | Blocking | Depends On | Title                                         | User Story                                                                                                                                                                                     | Weakness Coverage   |
| -------- | -------- | -------- | ---------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| P1-E1-I1 | P1       | YES      | -          | Decompose monolithic operational pages        | As a frontend engineer, I want commands, pipeline, and session detail pages split into container, sections, and controller hooks so that complexity stays maintainable as feature count grows. | A1-W1, A1-W2, D2-W1 |
| P1-E1-I2 | P1       | YES      | P1-E1-I1   | Remove duplicated domain UI behavior          | As a maintainer, I want status mapping and badge logic centralized in shared helpers/components so that behavior is consistent across pages and easier to test.                                | A1-W3               |
| P1-E1-I3 | P1       | NO       | P1-E1-I1   | Publish state ownership architecture contract | As a contributor, I want a documented Query vs Zustand vs local-state contract so that new features place state correctly and avoid regressions.                                               | A2-W3, D2-W2, D2-W3 |

### Epic P1-E2 - Accessibility and Design Guardrails

| Issue ID | Priority | Blocking | Depends On | Title                                                   | User Story                                                                                                                                                | Weakness Coverage   |
| -------- | -------- | -------- | ---------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| P1-E2-I1 | P1       | YES      | -          | Re-enable Storybook contrast rule and govern exceptions | As an accessibility lead, I want contrast checks active in Storybook with explicit exceptions so that component-level a11y regressions are blocked early. | A4-W2, C1-W2, C3-W1 |
| P1-E2-I2 | P1       | YES      | -          | Add skip link and keyboard path verification            | As a keyboard-only user, I want a skip-to-content link and tested focus flow so that I can navigate primary operations quickly.                           | C3-W2               |
| P1-E2-I3 | P1       | NO       | P1-E2-I1   | Enforce token and typography consistency checks         | As a design system engineer, I want lint checks for hardcoded colors, typography drift, and spacing misuse so that visual consistency scales.             | A4-W3, C1-W1, C1-W3 |
| P1-E2-I4 | P1       | NO       | P1-E2-I3   | Refactor repeated form styling to shared primitives     | As a UI engineer, I want all form controls to use shared field primitives so that validation, spacing, and accessibility remain uniform.                  | A4-W1, B4-W3        |

### Epic P1-E3 - Performance and Reliability Visibility

| Issue ID | Priority | Blocking | Depends On | Title                                      | User Story                                                                                                                                    | Weakness Coverage |
| -------- | -------- | -------- | ---------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| P1-E3-I1 | P1       | YES      | -          | Add bundle budget CI gate                  | As a release owner, I want bundle/chunk budgets enforced in CI so that payload regressions are blocked before merge.                          | A5-W1, D1-W1      |
| P1-E3-I2 | P1       | YES      | -          | Introduce production build profile control | As a frontend platform engineer, I want separate prod/dev sourcemap and diagnostics strategy so that release builds are optimized and secure. | A5-W2             |
| P1-E3-I3 | P1       | YES      | -          | Implement RUM and web-vitals telemetry     | As an operations team, I want client performance telemetry and alerts so that user-facing degradations are detected quickly.                  | D1-W2, D5-W1      |
| P1-E3-I4 | P1       | NO       | P1-E3-I3   | Reduce mixed polling where SSE exists      | As a system operator, I want SSE-first updates with minimal fallback polling so that long sessions avoid avoidable load spikes.               | A2-W1, D1-W3      |

### Epic P1-E4 - Operator Decision and Recovery Clarity

| Issue ID | Priority | Blocking | Depends On | Title                                          | User Story                                                                                                                      | Weakness Coverage |
| -------- | -------- | -------- | ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| P1-E4-I1 | P1       | YES      | -          | Add approval SLA timers and overdue indicators | As an approver, I want SLA countdown and overdue markers in approval queues so that urgent decisions are handled first.         | B2-W3             |
| P1-E4-I2 | P1       | NO       | P1-E4-I1   | Add unified intervention console               | As an operator, I want pause/resume/reroute/cancel actions in one control surface so that intervention is fast and predictable. | B2-W1             |
| P1-E4-I3 | P1       | NO       | P1-E4-I2   | Standardize session expiry and re-auth UX      | As a signed-in user, I want consistent token-expiry messaging and re-auth flow so that recovery is clear across all pages.      | D5-W3             |

---

## Milestone P2 - UX Flow Coherence and Navigation Scalability

Milestone goal: Improve wayfinding, user guidance, and output ergonomics for complex multi-agent workflows.

### Epic P2-E1 - Agent Runtime UX and Guided Actions

| Issue ID | Priority | Blocking | Depends On | Title                                                         | User Story                                                                                                                                        | Weakness Coverage |
| -------- | -------- | -------- | ---------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| P2-E1-I1 | P2       | NO       | P1-E1-I1   | Add uniform live-progress affordances across runtime surfaces | As an operator, I want consistent real-time progress states for all long-running agent tasks so that I always understand current execution state. | B1-W1             |
| P2-E1-I2 | P2       | NO       | P2-E1-I1   | Add blocker-and-next-action guidance cards                    | As a first-time user, I want explicit current blocker and next action guidance so that I can recover quickly from stalled workflows.              | B1-W2, B1-W3      |
| P2-E1-I3 | P2       | NO       | P1-E4-I2   | Show feedback propagation markers                             | As a reviewer, I want to see how my intervention changed downstream execution so that correction loops are transparent.                           | B2-W2             |

### Epic P2-E2 - Navigation and Information Architecture Simplification

| Issue ID | Priority | Blocking | Depends On | Title                                       | User Story                                                                                                                     | Weakness Coverage   |
| -------- | -------- | -------- | ---------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| P2-E2-I1 | P2       | NO       | -          | Add persona-mode navigation presets         | As an operator/admin/reviewer, I want role-relevant landing and navigation emphasis so that I see only high-value areas first. | B3-W1, B3-W3        |
| P2-E2-I2 | P2       | NO       | P2-E2-I1   | Reduce redirect and label entropy           | As a user, I want simplified route aliases and naming conventions so that IA mental models are stable and predictable.         | A3-W1, A3-W3, B3-W2 |
| P2-E2-I3 | P2       | NO       | P2-E2-I1   | Persist filter state in URL for major pages | As a team member, I want filter/sort state encoded in URLs so that I can share and return to exact investigation contexts.     | A3-W2               |

### Epic P2-E3 - Forms, Validation, and Edit Safety

| Issue ID | Priority | Blocking | Depends On | Title                                                 | User Story                                                                                                                  | Weakness Coverage |
| -------- | -------- | -------- | ---------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| P2-E3-I1 | P2       | NO       | P1-E2-I4   | Add standardized multi-field validation summary       | As a user completing complex forms, I want centralized error summaries so that I can resolve all validation issues quickly. | B4-W1             |
| P2-E3-I2 | P2       | NO       | P2-E3-I1   | Add draft history and restore for key editable flows  | As an analyst, I want versioned draft restore for questionnaires and decisions so that accidental edits are reversible.     | B4-W2             |
| P2-E3-I3 | P2       | NO       | P2-E3-I1   | Add explicit frontend runtime env contract validation | As a deployer, I want documented and validated frontend runtime config so that environments fail fast when misconfigured.   | A5-W3             |

### Epic P2-E4 - Artifact and Evidence Presentation

| Issue ID | Priority | Blocking | Depends On | Title                                                     | User Story                                                                                                                                    | Weakness Coverage |
| -------- | -------- | -------- | ---------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| P2-E4-I1 | P2       | NO       | -          | Add integrated code artifact viewer with diff mode        | As a reviewer, I want syntax-highlighted file trees and diffs inside artifact flows so that I can evaluate outputs without context-switching. | B5-W1             |
| P2-E4-I2 | P2       | NO       | P2-E4-I1   | Add semantic folding/chunking for long artifacts          | As a user reading large outputs, I want collapsible sections and semantic chunk navigation so that evidence review is efficient.              | B5-W2             |
| P2-E4-I3 | P2       | NO       | P2-E4-I1   | Standardize export/share actions across artifact surfaces | As a compliance stakeholder, I want consistent copy/download/share actions across evidence pages so that traceability workflows are faster.   | B5-W3             |

---

## Milestone P3 - Mobile Readiness, Test Maturity, and Operational Hardening

Milestone goal: Harden the product for wider device support, deeper quality confidence, and security-resilience validation.

### Epic P3-E1 - Responsive and Mobile Assurance

| Issue ID | Priority | Blocking | Depends On | Title                                                   | User Story                                                                                                                              | Weakness Coverage |
| -------- | -------- | -------- | ---------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| P3-E1-I1 | P3       | NO       | -          | Add mobile and tablet Playwright projects               | As a QA engineer, I want explicit mobile/tablet projects in e2e so that core workflows are verified beyond desktop.                     | C2-W1, D3-W2      |
| P3-E1-I2 | P3       | NO       | P3-E1-I1   | Introduce compact mode for dense operational pages      | As a mobile operator, I want compact variants for pipeline/session/approvals so that critical controls remain usable on narrow screens. | C2-W2             |
| P3-E1-I3 | P3       | NO       | P3-E1-I1   | Publish supported viewport policy and acceptance matrix | As a product owner, I want explicit viewport support policy so that quality targets are measurable and enforceable.                     | C2-W3             |

### Epic P3-E2 - Test Depth and Resilience

| Issue ID | Priority | Blocking | Depends On | Title                                               | User Story                                                                                                                                         | Weakness Coverage |
| -------- | -------- | -------- | ---------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| P3-E2-I1 | P3       | NO       | -          | Publish frontend package coverage artifacts in CI   | As an engineering lead, I want package-level frontend coverage artifacts so that test confidence is visible in every release.                      | D3-W1             |
| P3-E2-I2 | P3       | NO       | P3-E2-I1   | Add SSE reconnect/duplication fault-injection tests | As a reliability engineer, I want reconnection burst and duplicate-event tests so that real-time behavior is stable under adverse conditions.      | A2-W2, D3-W3      |
| P3-E2-I3 | P3       | NO       | P1-E2-I2   | Expand accessibility edge-state e2e matrix          | As an accessibility specialist, I want e2e coverage for modals, drawers, and long-table keyboard flows so that edge interactions remain compliant. | C3-W3             |

### Epic P3-E3 - Interaction Pattern Standardization

| Issue ID | Priority | Blocking | Depends On | Title                                          | User Story                                                                                                                          | Weakness Coverage |
| -------- | -------- | -------- | ---------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| P3-E3-I1 | P3       | NO       | P2-E1-I1   | Create async UX pattern kit for mutation flows | As a user, I want consistent pending/success/error/retry behavior across all actions so that system behavior is predictable.        | C4-W1             |
| P3-E3-I2 | P3       | NO       | P3-E3-I1   | Add optimistic update framework where safe     | As an operator, I want immediate local feedback for eligible actions so that the interface feels responsive during network latency. | C4-W2             |
| P3-E3-I3 | P3       | NO       | P3-E3-I1   | Add reconnect/backoff status component         | As a runtime user, I want visible connection recovery status so that I understand when delays are network-related.                  | C4-W3             |

### Epic P3-E4 - Security Validation in UI Layer

| Issue ID | Priority | Blocking | Depends On | Title                                                            | User Story                                                                                                                                    | Weakness Coverage |
| -------- | -------- | -------- | ---------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| P3-E4-I1 | P3       | NO       | -          | Add UI security smoke suite for protected-route and expiry cases | As a security engineer, I want e2e security smoke checks for protected routes and session expiry so that auth regressions are caught quickly. | D5-W2, D5-W3      |

---

## Milestone P4 - Developer Experience and Long-Term Governance

Milestone goal: Improve contributor throughput and documentation maturity for long-term scale.

### Epic P4-E1 - Frontend Contributor Enablement

| Issue ID | Priority | Blocking | Depends On | Title                                                                          | User Story                                                                                                                               | Weakness Coverage |
| -------- | -------- | -------- | ---------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| P4-E1-I1 | P4       | NO       | P1-E1-I3   | Publish frontend maintainer guide (architecture, event model, testing pyramid) | As a new contributor, I want a single maintainer guide so that I can deliver changes without reverse-engineering architecture decisions. | D4-W1             |
| P4-E1-I2 | P4       | NO       | P4-E1-I1   | Create shared scenario fixture library for UI states                           | As a test author, I want reusable fixtures for loading/error/empty/realtime states so that test authoring is faster and consistent.      | D4-W2             |
| P4-E1-I3 | P4       | NO       | P4-E1-I1   | Document token-generation workflow and dependencies                            | As a UI contributor, I want clear token build workflow documentation so that design-system changes are safe and repeatable.              | D4-W3             |
| P4-E1-I4 | P4       | NO       | P4-E1-I1   | Add one-command local quality gate for UI                                      | As a developer, I want one local command that runs lint, unit, a11y smoke, and visual smoke so that pre-PR checks are simple.            | D4-W1, D4-W2      |

---

## Global Start Order (Blocking First)

1. P1-E1-I1
2. P1-E1-I2
3. P1-E2-I1
4. P1-E2-I2
5. P1-E3-I1
6. P1-E3-I2
7. P1-E3-I3
8. P1-E4-I1

After these eight, continue remaining P1 issues in dependency order, then P2, then P3, then P4.

---

## Weakness-to-Issue Coverage Matrix

Legend: Each weakness from the UI verdict is mapped to one or more issue IDs.

### Part A Coverage

| Weakness ID | Weakness Summary                                     | Covered By |
| ----------- | ---------------------------------------------------- | ---------- |
| A1-W1       | Monolithic commands/pipeline/session pages           | P1-E1-I1   |
| A1-W2       | Large route modules with orchestration concentration | P1-E1-I1   |
| A1-W3       | Duplicated domain behavior logic                     | P1-E1-I2   |
| A2-W1       | Mixed polling+SSE causing refresh pressure           | P1-E3-I4   |
| A2-W2       | Event dedupe risk under reconnect bursts             | P3-E2-I2   |
| A2-W3       | No single state architecture map                     | P1-E1-I3   |
| A3-W1       | Redirect alias maintenance burden                    | P2-E2-I2   |
| A3-W2       | Limited URL-state persistence for filter-heavy pages | P2-E2-I3   |
| A3-W3       | Route/domain naming overlap                          | P2-E2-I2   |
| A4-W1       | Repeated raw form utility classes                    | P1-E2-I4   |
| A4-W2       | Storybook contrast rule disabled                     | P1-E2-I1   |
| A4-W3       | Conventions over enforced token rules                | P1-E2-I3   |
| A5-W1       | No bundle budget enforcement                         | P1-E3-I1   |
| A5-W2       | Sourcemap/release profile separation missing         | P1-E3-I2   |
| A5-W3       | Weak frontend env contract docs                      | P2-E3-I3   |

### Part B Coverage

| Weakness ID | Weakness Summary                                   | Covered By |
| ----------- | -------------------------------------------------- | ---------- |
| B1-W1       | Inconsistent live-progress affordances             | P2-E1-I1   |
| B1-W2       | Dependency graph cognitively heavy                 | P2-E1-I2   |
| B1-W3       | Error/retry lacks next-action cues                 | P2-E1-I2   |
| B2-W1       | Intervention controls fragmented                   | P1-E4-I2   |
| B2-W2       | Limited feedback propagation visibility            | P2-E1-I3   |
| B2-W3       | Approval urgency/SLA not obvious                   | P1-E4-I1   |
| B3-W1       | High cognitive load from many domains              | P2-E2-I1   |
| B3-W2       | Aliases blur mental model                          | P2-E2-I2   |
| B3-W3       | Lack role-based default simplification             | P2-E2-I1   |
| B4-W1       | Validation not consistently centralized            | P2-E3-I1   |
| B4-W2       | Limited draft undo/version history                 | P2-E3-I2   |
| B4-W3       | Inputs not fully standardized on shared primitives | P1-E2-I4   |
| B5-W1       | No rich integrated code diff/file-tree viewer      | P2-E4-I1   |
| B5-W2       | Limited long-output folding/chunking ergonomics    | P2-E4-I2   |
| B5-W3       | Export/download actions inconsistent               | P2-E4-I3   |

### Part C Coverage

| Weakness ID | Weakness Summary                               | Covered By |
| ----------- | ---------------------------------------------- | ---------- |
| C1-W1       | Page-local styling bypasses primitives         | P1-E2-I3   |
| C1-W2       | Storybook contrast checks disabled             | P1-E2-I1   |
| C1-W3       | Local typography hierarchy drift               | P1-E2-I3   |
| C2-W1       | Desktop-focused viewport test coverage         | P3-E1-I1   |
| C2-W2       | Dense pages may degrade on narrow screens      | P3-E1-I2   |
| C2-W3       | No explicit minimum viewport support policy    | P3-E1-I3   |
| C3-W1       | Contrast checks disabled in component dev loop | P1-E2-I1   |
| C3-W2       | Skip-link not evident                          | P1-E2-I2   |
| C3-W3       | Limited edge-state accessibility e2e coverage  | P3-E2-I3   |
| C4-W1       | Micro-feedback pattern inconsistency           | P3-E3-I1   |
| C4-W2       | Limited optimistic updates                     | P3-E3-I2   |
| C4-W3       | Reconnect/backoff status not visible to users  | P3-E3-I3   |

### Part D Coverage

| Weakness ID | Weakness Summary                                             | Covered By         |
| ----------- | ------------------------------------------------------------ | ------------------ |
| D1-W1       | Large primary JS artifact opportunity                        | P1-E3-I1           |
| D1-W2       | No visible web-vitals/RUM instrumentation                    | P1-E3-I3           |
| D1-W3       | Residual polling on selected surfaces                        | P1-E3-I4           |
| D2-W1       | High complexity in dense pages                               | P1-E1-I1           |
| D2-W2       | State ownership not formally documented                      | P1-E1-I3           |
| D2-W3       | Few UI-specific ADRs                                         | P1-E1-I3           |
| D3-W1       | Missing frontend-only coverage artifact visibility           | P3-E2-I1           |
| D3-W2       | Mobile viewport matrix not explicit                          | P3-E1-I1           |
| D3-W3       | Limited mutation/resilience tests for real-time events       | P3-E2-I2           |
| D4-W1       | Contributor onboarding documentation limited                 | P4-E1-I1, P4-E1-I4 |
| D4-W2       | Shared UI state fixtures not centralized                     | P4-E1-I2, P4-E1-I4 |
| D4-W3       | Token generation dependency path unclear                     | P4-E1-I3           |
| D5-W1       | Runtime telemetry for auth/API failures weak                 | P1-E3-I3           |
| D5-W2       | UI-layer security header/CSP validation not visible in tests | P3-E4-I1           |
| D5-W3       | Session-expiry messaging uneven across pages                 | P1-E4-I3, P3-E4-I1 |

---

## GitHub Label Recommendations

- Priority: P1, P2, P3, P4
- Blocker flag: blocking
- Type: epic, story, tech-debt, ux, accessibility, performance, security, reliability, docs
- Area: ui-architecture, state-management, routing, design-system, forms, artifacts, testing, observability, devex
