# SP-2-LND Landing Page Scope (Day 2 Start)

**Story:** SP-2-LND (#128)  
**Sprint:** Sprint 2 (March 25 – April 7, 2026)  
**Track:** Marketing  
**Owner:** CRO Specialist  
**Status:** � IN PROGRESS (Day 4 — 95%)  
**Predecessor:** SP-12-702 (GTM Messaging Framework) ✅  
**Estimated Days:** 2-4 (March 26-28)  
**Target Completion:** March 28, 2026

---

## 1. Scope

Build the marketing landing page using GTM messaging (SP-12-702), brand assets
(SP-12-701), and design tokens. The landing page will be the primary conversion
point for social content (SP-2-SOC) and email campaigns (SP-2-BTN).

**Dependency:** SP-2-MAT (#125) — Matomo analytics tracking will be added once
Matomo is deployed. Landing page can be built without it; analytics tag added
later.

---

## 2. Page Structure (from SP-12-702 Messaging Matrix)

### Hero Section

| Element       | Content                                                                                                          | Source                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Headline      | "Design it right. Build it fast."                                                                                | SP-12-702 §3 (tagline, stakeholder-approved March 17) |
| Subheading    | "The first end-to-end platform that combines multi-discipline strategic analysis with iterative implementation." | SP-12-702 §1 (primary value proposition)              |
| Primary CTA   | "Explore the Documentation →"                                                                                    | Docs site                                             |
| Secondary CTA | "View on GitHub →"                                                                                               | Repository link                                       |

### Value Proposition Section (4 Pillars)

| Pillar              | Heading                                  | Key Point                            | Source                |
| ------------------- | ---------------------------------------- | ------------------------------------ | --------------------- |
| End-to-End Rigor    | "Zero gaps from strategy to sprint"      | 4-phase analysis + Critic validation | SP-12-702 §2 Pillar 1 |
| Multi-Discipline    | "Every discipline, one system"           | 30+ agents across 4 disciplines      | SP-12-702 §2 Pillar 2 |
| Built-In Governance | "Compliance automated, not afterthought" | GDPR, WCAG AA, secret scanning       | SP-12-702 §2 Pillar 3 |
| Execution Speed     | "Plan rigorously, ship iteratively"      | Sprint execution with CI/CD pipeline | SP-12-702 §2 Pillar 4 |

### How It Works Section

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Sprint Execution (visual flow)

### Social Proof Section

Sprint 1 metrics from sprint-1-completion-report.md:

- 15 sprint items across 4 disciplines
- 122 automated tests, 0 failures
- 8-job CI/CD pipeline
- 91% WCAG AA accessibility score

### Email Signup Section

Integration with Buttondown subscribe endpoint (SP-2-BTN §3):

- Email input + segment selector
- Server-side POST to `/api/subscribe`
- Privacy-first: no tracking pixels, GDPR-compliant double opt-in

---

## 3. Technical Requirements

| Requirement   | Specification                                              |
| ------------- | ---------------------------------------------------------- |
| Design tokens | From `.github/docs/brand/design-tokens.json` v2.0.0        |
| Responsive    | 4 breakpoints (320, 768, 1024, 1440px)                     |
| Accessibility | WCAG 2.1 AA (contrast ≥4.5:1, keyboard nav, screen reader) |
| Performance   | Lighthouse Performance ≥ 90                                |
| Analytics     | Matomo tracking tag (added post SP-2-MAT deployment)       |
| Email signup  | Buttondown API integration (SP-2-BTN)                      |

---

## 4. Acceptance Criteria

- [x] Hero section with approved tagline and CTAs
- [x] 4 value proposition pillars displayed
- [x] How It Works phase flow visualization
- [x] Social proof metrics from Sprint 1
- [x] Email signup form with Buttondown integration
- [x] Responsive across 4 breakpoints
- [x] WCAG 2.1 AA compliant
- [x] Lighthouse Performance ≥ 90

---

## Day 1 Progress

- ✅ Page structure defined from GTM messaging (§2)
- ✅ Technical requirements documented (§3)
- ✅ Acceptance criteria defined (§4)
- ⬜ Implementation begins Day 2 (March 26)
