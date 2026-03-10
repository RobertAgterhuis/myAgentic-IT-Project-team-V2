# Blocker Resolution Decisions & Action Plans

**Date:** 2026-03-10 **Decision Authority:** Product Manager / Executive Lead
**Status:** RESOLVED - Ready for implementation

---

## Summary

All 3 blockers have been resolved through executive decision elicitation. The
decisions enable immediate unblocking of UX and Marketing critical paths.

### Decision Snapshot

| Blocker           | Current Status  | Decision                                 | Action Owner    | Implementation Start |
| ----------------- | --------------- | ---------------------------------------- | --------------- | -------------------- |
| **BLK-1-501**     | Locale Strategy | Global (6+ locales) by March 24          | Product Manager | Immediate            |
| **BLK-2-501**     | TMS Procurement | OSS-first evaluation (flexible timeline) | TECH Lead       | Post-design (April)  |
| **BLOCKER-1-502** | Analytics       | No GA4 - alternative metrics             | TECH Analytics  | Flexible (Sprint 2+) |

---

## BLK-1-501: Locale Prioritization Decision

### ✅ RESOLVED

**Decision:** Global localization (6+ locales)  
**Timeline:** Decision finalized immediately; implementation kickoff before
Sprint 1 ends (March 24)  
**Executive Authority:** Product Manager / Executive Lead

### Market Scope

**Primary Locales (Phase 1):**

1. English (US) - launch baseline
2. English (UK) - EMEA market entry
3. German (DE) - Central Europe
4. French (FR) - Romance language coverage
5. Japanese (JA) - APAC initial entry
6. Simplified Chinese (ZH) - APAC scale

**Secondary Locales (Phase 2):**

- Spanish (ES)
- Portuguese (BR)
- Korean (KO)
- Additional APAC languages as demand scales

### Action Plan

**Sprint 1 (by March 24):**

1. Create locale priority matrix (market size, user demand, resource
   availability)
2. Define translation volume estimates per locale
3. Identify in-country subject matter experts (SMEs) for review
4. Create content style guide per locale (tone, cultural nuances, terminology)
5. Plan localization workflow (translation → review → QA → launch)

**Immediate next steps:**

- [ ] Assign content strategy lead for localization program
- [ ] Schedule internal-market priority decision meeting (24 hours)
- [ ] Create locale-specific content roadmap

### Impact on Other Blockers

**Unblocks:**

- ✅ SP-1-501 (Locale prioritization kickoff) - now ready to start
- ✅ SP-2-501 (TMS setup) - can begin design based on global scope

### Enablers for Implementation

- Content Strategist (Agent 32) output available:
  `.github/docs/phase-3/32-content-strategist-analysis.md`
- Localization Specialist (Agent 35) output available:
  `.github/docs/phase-3/35-localization-specialist-analysis.md`

### GitHub Issue Update

**Issue #119 (SP-1-501):** Change status from BLOCKED to READY

- Remove label: `BLOCKED`
- Add label: `PRIORITY_Q1`
- Milestone: Sprint 1 #23
- Assigned to: Content Strategy Lead + Localization Lead

---

## BLK-2-501: TMS Procurement & Integration

### ✅ RESOLVED (Conditional)

**Decision:** Open Source-first approach (evaluate free/OSS TMS solutions)  
**Timeline:** Flexible - post-localization design completion (approx. April 1)  
**Executive Authority:** Product Manager / Executive Lead

### Vendor Evaluation Criteria

**OpenSource First Priority:**

1. **Weblate** - Self-hosted, Python-based, FOSS
   - Pros: Free, self-hosted, integrates with git/CI, WCAG accessible
   - Cons: Requires infrastructure maintenance
   - Cost: $0-$500/month (hosting only)

2. **Lokalize** - FOSS translation collaboration
   - Pros: Lightweight, good WCAG support, integrates with translation workflow
   - Cons: Limited enterprise features
   - Cost: Free

3. **POEditor** (freemium) - Cloud SaaS with generous free tier
   - Pros: Easy setup, API-first, good integrations
   - Cons: Limited free tier (single language + 1 translator)
   - Cost: Free tier or $50-200/month commercial

**Evaluation Timeline:**

- **Week 1 (March 10-17):** Localization strategy finalized → determine max
  locale count
- **Week 2-3 (March 17-31):** Conduct pilot testing with 1-2 locales
- **Week 4 (April 1):** Vendor selection + procurement decision

### Action Plan

**Phase 1: Design Integration (Sprint 1, by March 24)**

1. Map localization workflow: source strings → TMS → translator workflow → QA →
   delivery
2. Define API requirements (git integration, CI/CD triggers, translation status
   webhooks)
3. Create test data set (100-200 strings) for pilot
4. Document acceptance criteria for TMS selection

**Phase 2: Vendor Evaluation (Early Sprint 2, March 24 - April 1)**

1. Set up Weblate trial (self-hosted or demo)
2. Set up Lokalize evaluation
3. Test POEditor free tier
4. Run pilot translation cycle (English → French + German)
5. Evaluate on: UX/ease-of-use, integration depth, cost, team productivity

**Phase 3: Decision & Procurement (By April 1)**

1. Final vendor recommendation with scoring matrix
2. Procurement approval (procurement lead)
3. Contract execution (if commercial solution selected)
4. Infrastructure setup (if self-hosted solution)
5. User training for translation team

### Implementation Assumptions

- **Localization Specialist** (Agent 35) will lead evaluation and selection
- **Tech Lead** (from Phase 2) will be primary integration owner
- **Content Strategy** (Agent 32) will handle workflow definition

### GitHub Issue Update

**Issue #117 (SP-2-501):** Change status from BLOCKED to PENDING_DECISION

- Move to "Ready" column once Phase 1 design complete (by March 24)
- Keep label: `BLOCKED` until vendor selected
- Milestone: Sprint 2 #24
- Assigned to: Localization Lead + Tech Integration Lead
- Estimated start: March 31 (after locale strategy confirmed)

---

## BLOCKER-1-502: Analytics Infrastructure Readiness

### ✅ RESOLVED (Alternative Path)

**Decision:** No Google Analytics 4 (GA4) - Use alternative analytics platform  
**Timeline:** Flexible - can defer to Sprint 2+ based on experimentation needs  
**Executive Authority:** Product Manager / Executive Lead

### Alternative Analytics Stack

**Primary Option: Plausible Analytics**

- Pros: Privacy-first, GDPR-compliant, no consent popups needed, simple setup
- Cons: $20/month baseline, fewer advanced features
- Use Case: Core funnel tracking + experiment results measurement
- Setup: 1-2 days

**Secondary Option: Fathom Analytics**

- Pros: Privacy-first, cookie-free alternative to GA, simple integration, GDPR
  compliant
- Cons: $19/month, limited advanced segmentation
- Use Case: User behavior tracking + conversion measurement
- Setup: 1-2 days

**Tertiary Option: Matomo (Open Source)**

- Pros: Self-hosted FOSS alternative, full feature parity with GA, local data
  control
- Cons: Requires hosting/maintenance, more complex setup
- Cost: $0 (self-hosted) + infrastructure
- Setup: 3-5 days

### Why Not GA4?

Based on your input, GA4 is NOT required, which removes the critical
infrastructure blocker from the Phase 5 implementation path. This is a
significant risk reduction.

### Action Plan

**Sprint 2 (March 24 - April 7) - Non-blocking, can run in parallel:**

1. **Week 1 (March 24-31):** Select privacy-first analytics platform
   - Compare: Plausible vs Fathom vs Matomo
   - Decision criteria: cost, privacy compliance, experiment support, setup time
   - Final selection + procurement approval

2. **Week 2 (March 31 - April 7):** Infrastructure setup + event implementation
   - Provision analytics account / self-hosted instance
   - Configure event tracking for:
     - User onboarding funnel
     - Feature adoption
     - Experiment measurements (if CRO starts)
   - Set up dashboards for MARKETING team

3. **Sprint 2 End (April 7):** Ready for experimentation measurement

### Experiment Timeline (MARKETING CRO)

**Sprint 1 (March 10-24):** Setup + baseline metrics (using default analytics)  
**Sprint 2 (March 24 - April 7):** Migrate to privacy-first platform  
**Post Sprint 2:** Start CRO experimentation with validated measurement
infrastructure

### GitHub Issue Update

**Issue #114 (SP-1-201) "GA4 funnel event implementation":** REPURPOSE

- **New Title:** "Privacy-first analytics setup and funnel measurement"
- **New Description:** Implement selected privacy-first platform + event
  tracking infrastructure
- Change label: `BLOCKED` → `READY` (but with deferred implementation)
- Milestone: Move to Sprint 2 #24 (no longer critical for Sprint 1)
- Assigned to: TECH Analytics Lead
- Target Start: March 24 (post-locale finalization)

**Impact on SP-2-201 (Landing experiment deployment):**

- **Original dependency:** GA4 readiness (BLOCKED)
- **New dependency:** Privacy-first analytics readiness (available by April 7)
- **Status Change:** BLOCKED → READY (with April 7 analyt ics start as
  dependency)

---

## Blocker Summary Table

### Before Resolution

| Blocker       | Status | Blocking                    | Impact                       |
| ------------- | ------ | --------------------------- | ---------------------------- |
| BLK-1-501     | OPEN   | SP-1-501, UX critical path  | Locale strategy undefined    |
| BLK-2-501     | OPEN   | SP-2-501, Localization work | TMS vendor undefined         |
| BLOCKER-1-502 | OPEN   | SP-1-201, CRO measurement   | GA4 infrastructure undefined |

### After Resolution ✅

| Blocker       | Status                    | Updated Sprint Plan            | Unblocked Path                           |
| ------------- | ------------------------- | ------------------------------ | ---------------------------------------- |
| BLK-1-501     | ✅ RESOLVED               | SP-1-501 → Sprint 1 READY      | Locale strategy = Global 6+ by March 24  |
| BLK-2-501     | ✅ RESOLVED (conditional) | SP-2-501 → Sprint 2 READY      | OSS-first TMS eval, flexible timeline    |
| BLOCKER-1-502 | ✅ RESOLVED (alternative) | SP-1-201 → Sprint 2 (deferred) | Privacy-first analytics, no GA4 required |

---

## Immediate Action Items (Next 24 Hours)

- [ ] Announce locale strategy decision (Global 6+ locales) to engineering +
      marketing teams
- [ ] Schedule locale content style guide workshop (March 11)
- [ ] Brief Content Strategy + Localization leads on Phase 1 design requirements
- [ ] Confirm TMS evaluation lead and evaluation criteria
- [ ] Select preferred privacy-first analytics platform
- [ ] Update GitHub issues (#119, #117, #114) with new status and timelines
- [ ] Notify MARKETING team of analytics platform change (no GA4)

---

## Next Steps: Phase 5 Implementation Kickoff

**All blockers are now RESOLVED.** Sprint 1 can proceed with full momentum:

✅ **11/14 Sprint 1 items remain READY** (unchanged)  
✅ **3 BLOCKED items now have clear resolution paths:**

- SP-1-501: Move to READY immediately (start FRI/SA)
- SP-2-501: Move to Sprint 2 READY (start post-March 24)
- SP-1-201/SP-2-201: Move to Sprint 2 with April 7 analytics dependency

**New Sprint 1 Capacity Released:** If desired, can pull SP-1-501 (Locale
prioritization kickoff) into Sprint 1 to start immediately, further accelerating
the critical path.

---

**Decisions Documented By:** Blocker Resolution Agent  
**Authority:** Product Manager / Executive Lead  
**Date:** 2026-03-10T19:45:00Z  
**Status:** READY FOR IMPLEMENTATION
