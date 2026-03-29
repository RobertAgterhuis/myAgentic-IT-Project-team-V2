# Complete Program Sequencing: Framework Decoupling + UI Audit

**Current Date**: 2026-03-28  
**Status**: Framework-Decoupling: M-FD-01 through M-FD-05 milestones created (5 of 5). UI-Audit: M-001–M-003 milestones created (3 of 3). 39 framework-decoupling issues + 15 UI-audit issues in GitHub.

---

## Master Dependency Chain

This chart shows the **strict execution order** required to avoid rework and unblock downstream work.

```
Phase
─────┬──────────────────────────────────────────────────────────────
  1  │  M-001 (UI Foundations)      M-FD-01 (Kernel Contracts)
     │      ↓                            ↓
  2  │  M-002-PhaseA (Layout)        M-FD-02 (Runtime Decoupling)
     │      ↓                            ↓
  3  │  M-002-PhaseB (PageShell)     M-FD-03 (SDLC Pack)
     │      ↓                            ↓
  4  │                               M-FD-04 (API/UI Metadata)
     │                                   ↓
  5  │  ┌─ I-007, I-008 (Tabs) ─→ M-FD-06 (Monaco Core) ←─ M-FD-04
     │  │                             ↓
  6  │  M-002-PhaseC (Monaco UI)    M-003 (CI Governance + Monaco Gates)
     │                                   ↓
  7  │                               M-FD-05 (Second Pack Proof)
```

---

## Phase-by-Phase Breakdown

### Phase 1: Parallel Foundation (Start Now)

**What**: Two independent foundation streams

| Milestone                                | Issues                    | Purpose                                             | Duration | Can run in parallel? |
| ---------------------------------------- | ------------------------- | --------------------------------------------------- | -------- | -------------------- |
| **M-001** (UI Foundation Accessibility)  | I-001 through I-008       | Token enforcement, tabs/tables a11y, foundations    | ~4 weeks | ✅ **YES**           |
| **M-FD-01** (Kernel Contract Foundation) | I-FD-001 through I-FD-009 | Define generic contracts, build compatibility layer | ~3 weeks | ✅ **YES**           |

**Critical for Phase 1**:

- M-001 **I-007** and **I-008** must complete before Phase 5 (M-FD-06 Monaco)
- M-FD-01 must complete before M-FD-02

**Unblock M-002-PhaseA**: None (can start immediately)  
**Unblock M-FD-02**: M-FD-01 complete

---

### Phase 2: Framework Decoupling Ramp + UI Layout (Weeks 4–7)

**What**: Parallel streams; M-002-PhaseA is independent from framework work

| Milestone                                 | Issues                    | Depends On       | Purpose                                                        | Notes                                            |
| ----------------------------------------- | ------------------------- | ---------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| **M-002-PhaseA** (Layout & Nav Stability) | I-009, I-012, I-013       | None             | Sidebar semantics, widescreen utilities, surface normalization | ✅ Independent; can run in parallel with M-FD-02 |
| **M-FD-02** (Runtime Decoupling)          | I-FD-010 through I-FD-022 | M-FD-01 complete | Remove SDLC hardcoding from engine, dispatcher, gates          | Framework-core team                              |

**Unblock M-002-PhaseB**: M-001 complete  
**Unblock M-FD-03**: M-FD-02 complete

---

### Phase 3: SDLC Extraction + Form Primitives (Weeks 7–10)

**What**: SDLC pack formalized; UI forms standardized

| Milestone                                | Issues                    | Depends On       | Purpose                                                  | Notes                                                                                                              |
| ---------------------------------------- | ------------------------- | ---------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **M-FD-03** (SDLC Pack-v1 Formalization) | I-FD-023 through I-FD-032 | M-FD-02 complete | Move all SDLC semantics to pack assets                   | SDLC still behaves identically                                                                                     |
| **M-002-PhaseB** (PageShell + Forms)     | I-010, I-011              | M-001 complete   | PageShell on commands/pipeline; approval form primitives | ⚠️ **Coordinate with M-FD-04**: Commands page content will become metadata-driven in M-FD-04; avoid double-rewrite |

**Unblock M-FD-04**: M-FD-03 complete  
**Unblock M-002-PhaseC**: M-FD-06 complete (and I-007/I-008 complete)

---

### Phase 4: API & UI Pack-Driven Metadata (Weeks 10–13)

**What**: Commands, phases, gates, help become metadata-driven from pack

| Milestone                                    | Issues                    | Depends On       | Purpose                                                       | Notes                                                                                                 |
| -------------------------------------------- | ------------------------- | ---------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **M-FD-04** (API & UI Pack-aware Experience) | I-FD-033 through I-FD-055 | M-FD-03 complete | Commands/phase/gate lists from pack; UI renders from metadata | **Aligns I-010 content layer** from M-002-PhaseB (do M-002-PhaseB first, refine rendering in M-FD-04) |

**Unblock M-FD-06**: M-FD-04 complete (+ I-007/I-008 complete from M-001)

---

### Phase 5: Monaco Editor Subsystem in Core Shell (Weeks 13–17)

**What**: Framework-core editor, URI-driven models, provider registry

| Milestone                                  | Issues                    | Depends On                                                       | Notes                                                                         |
| ------------------------------------------ | ------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **M-FD-06** (Monaco Core Editor Subsystem) | I-FD-080 through I-FD-093 | M-FD-04 complete **AND** I-007, I-008 complete (tabs from M-001) | **HARD BLOCKER**: Tabs primitive must exist — Monaco panels mount inside them |

**Key outputs**:

- EditorShell, MonacoModelRegistry, UriMapper, ViewStateStore, ProviderRegistry, DecorationManager
- Three surfaces: read-only viewer, file editor, diff review pane
- Model lifecycle (create → attach → dispose) fully managed
- Pack extensibility (providers, governance overlays, URI-aware schema binding)

**Unblock M-002-PhaseC**: M-FD-06 complete  
**Unblock M-003**: M-FD-06 complete

---

### Phase 6: Monaco UI Integration + CI Governance (Weeks 17–20)

**What**: Wire Monaco into cockpit/observability + build enforcement gates

| Milestone                                | Issues                     | Depends On       | Purpose                                                                                                                   | Notes                                                                              |
| ---------------------------------------- | -------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **M-002-PhaseC** (Monaco UI Integration) | I-016, I-017               | M-FD-06 complete | Wire viewer/diff into tabs; apply widescreen container rules to Monaco surfaces                                           | Uses infrastructure from I-012 (widescreen) and I-007/I-008 (tabs)                 |
| **M-003** (CI Governance + Monaco Gates) | I-014, I-015, I-018, I-019 | M-FD-06 complete | Token/typography gates (I-014/I-015 can draft earlier); **Monaco gates** (I-018/I-019) require Monaco to be in production | I-014/I-015: non-blocking if drafted early; I-018/I-019: **must wait for M-FD-06** |

**Unblock M-FD-05**: M-003 CI gates implemented and passing

---

### Phase 7: Second Pack Proof and Hardening (Weeks 20–24)

**What**: Full decoupling validated with a non-SDLC pack; all E2E tests green

| Milestone                       | Issues                    | Depends On                                                       | Purpose                                                                       | Notes                        |
| ------------------------------- | ------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------- |
| **M-FD-05** (Second Pack Proof) | I-FD-056 through I-FD-078 | M-003 CI gates in place; M-FD-04, M-FD-06, M-002-PhaseC complete | Second pack executes without kernel edits; cross-pack regression suite passes | ✅ Framework fully decoupled |

---

## Critical Interlocks

### 1. **I-007 + I-008 (Tabs Primitive) → M-FD-06 (Monaco)**

- **Rule**: I-007 and I-008 **must be complete before M-FD-06 starts**.
- **Why**: Monaco editor panels (`DiffReviewPane`, `ArtifactViewerPane`, read-only viewer) are mounted inside cockpit/observability tab containers built by I-008.
- **Impact**: If tabs are not stable, Monaco integration fails or requires rework in the tab/panel boundary.
- **Comment added to**: #1281 (I-008)

### 2. **I-010 (PageShell) ↔ M-FD-04 (Metadata-Driven Commands)**

- **Rule**: I-010 can be structured immediately (loading/error/empty shell); _content rendering aligns with M-FD-04_.
- **Why**: Commands page and pipeline page command lists are currently hardcoded SDLC. In M-FD-04, they become metadata-driven from the active pack. Avoid aligning the command-list rendering layer too tightly to SDLC structures in I-010 to prevent a second rewrite.
- **Action**: Plan I-010 structurally now; coordinate actual command-list rendering with M-FD-04 timeline.
- **Comment added to**: #1283 (I-010)

### 3. **I-011 (Approval Form) ← I-FD-082 (Monaco Diff in Approvals)**

- **Rule**: I-011 and I-FD-082 target the same page but **do not conflict**.
- **Why**: Approval rejection-reason textarea (I-011) and Monaco diff review pane (I-FD-082) are separate regions.
- **Action**: Complete I-011 form-primitive migration first; I-FD-082 adds a new surface alongside it, not a replacement.
- **Comment added to**: #1284 (I-011)

### 4. **I-014, I-015 (Design Governance) vs I-018, I-019 (Monaco CI)**

- **Rule**: I-014 and I-015 can be drafted anytime; **I-018 and I-019 must wait for M-FD-06 complete**.
- **Why**: I-018 (worker safety + model lifecycle gates) and I-019 (contrast checks for Monaco surfaces) have no value until Monaco code exists.
- **Action**: Draft general governance structure in I-014/I-015 early; incorporate Monaco-specific tests in I-018/I-019 only after M-FD-06 ships.

---

## Start Rules by Role

### If You Own Framework Decoupling

1. **Start immediately**: M-FD-01 (kernel contracts)
2. **After M-FD-01 closes**: Start M-FD-02 (runtime decoupling)
3. **After M-FD-02 closes**: Start M-FD-03 (SDLC pack)
4. **After M-FD-03 closes**: Start M-FD-04 (API/UI metadata)
5. **After M-FD-04 + I-007/I-008 (UI tabs) close**: Start M-FD-06 (Monaco)
6. **After M-FD-06 + M-003 CI gates close**: Start M-FD-05 (second pack)

### If You Own UI Audit

1. **Start immediately**: M-001 (entire milestone — no dependencies)
2. **In parallel with M-001**: M-002-PhaseA (sidebar, layout, surfaces — no dependencies)
3. **After M-001 closes**: Start M-002-PhaseB (PageShell, forms)
4. **After M-FD-06 closes**: Start M-002-PhaseC (Monaco UI integration) + M-003 (CI gates, especially I-018/I-019)

### If You're Coordinating

1. **Ensure M-FD-04 and M-002-PhaseB overlap slightly** so I-010 (PageShell content) can align with metadata-driven commands before M-FD-04 ships.
2. **Block M-FD-06 start on I-007/I-008 completion** — add explicit dependency markers in GitHub.
3. **Track M-003-I-018/I-019 as hard dependencies for M-FD-05** — don't start M-FD-05 until CI gates are green.

---

## Milestone Status and GitHub References

| Milestone     | GitHub # | Status | Issues                     | Epic               | Notes                                                  |
| ------------- | -------- | ------ | -------------------------- | ------------------ | ------------------------------------------------------ |
| M-001         | #134     | Open   | I-001–I-008 (8)            | E-001, E-002       | Phase 1 start                                          |
| M-002 Phase A | #135     | Open   | I-009, I-012, I-013        | E-003, E-005       | Phase 2 start                                          |
| M-002 Phase B | #135     | Open   | I-010, I-011               | E-003, E-004       | After M-001                                            |
| M-002 Phase C | #135     | Open   | I-016, I-017 (new)         | E-003              | After M-FD-06                                          |
| M-003         | #136     | Open   | I-014, I-015, I-018, I-019 | E-006              | After M-FD-06 (gates); I-018/I-019 after M-FD-06 ships |
| M-FD-01       | #137     | Open   | I-FD-001–I-FD-009 (9)      | E-FD-001           | Phase 1 start                                          |
| M-FD-02       | #138     | Open   | I-FD-010–I-FD-022 (13)     | E-FD-002, E-FD-003 | After M-FD-01                                          |
| M-FD-03       | #139     | Open   | I-FD-023–I-FD-032 (10)     | E-FD-004           | After M-FD-02                                          |
| M-FD-04       | #140     | Open   | I-FD-033–I-FD-055 (23)     | E-FD-005, E-FD-006 | After M-FD-03                                          |
| M-FD-06       | #142     | Open   | I-FD-080–I-FD-093 (14)     | E-FD-009, E-FD-010 | After M-FD-04 + I-007/I-008 done                       |
| M-FD-05       | #141     | Open   | I-FD-056–I-FD-078 (23)     | E-FD-007, E-FD-008 | After M-FD-06 + M-003 gates                            |

---

## Summary

**Parallel streams (start now)**:

- Phase 1: M-001 + M-FD-01

**Sequential dependency chain**:
M-FD-01 → M-FD-02 → M-FD-03 → M-FD-04 → (M-FD-06 + I-007/I-008 from M-001) → M-002-PhaseC + M-003 → M-FD-05

**Key bottleneck**: I-007 and I-008 from M-001 block M-FD-06 start.

---

## How to Use This Document

1. **Reference this file in all milestone descriptions** on GitHub so stakeholders always know dependencies.
2. **Update this table in real-time** as milestones close/reorder.
3. **Link this document in M-FD-06 description** to emphasize the I-007/I-008 blocker.
4. **Use Phase numbers in planning** — "Phase 5 Monaco work" is immediately clear what's blocking it.
