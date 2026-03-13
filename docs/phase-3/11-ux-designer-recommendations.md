# UX Designer Recommendations — CREATE Mode

> **Agent:** 11-ux-designer  
> **Phase:** 3 — Experience Design  
> **Deliverable:** 2 of 4 (Recommendations)  
> **Created:** 2026-03-10T06:50:00Z  
> **Mode:** CREATE  
> **Project:** MYAGENTIC-IT-PROJECT-TEAM-V2

---

## EXECUTIVE SUMMARY

This document contains **10 prioritized recommendations** addressing design
gaps, risks, and opportunities identified in the UX Designer analysis. Each
recommendation is SMART-compliant and links to specific implementation stories.

**Recommendation Categories:**

- **Critical (3):** Address blockers that prevent Phase 5 implementation
- **High (4):** Improve core UX quality and reduce high-severity risks
- **Medium (3):** Enhance polish and completeness for production readiness

**Total Estimated Impact:** Reduce UX risk score from MEDIUM to LOW; eliminate 2
of 4 design gaps; enable smooth Implementation Agent handoff.

---

## RECOMMENDATION 01 — Implement Component Library Before Screens

**Priority:** CRITICAL  
**Category:** Implementation Strategy  
**Addresses:** GAP-UXD-001 (no visual design tokens), RISK-UXD-002 (UI flicker)

### Problem Statement

The wireframes define layout and interaction patterns but not reusable
components. If Implementation Agent builds screens directly without a component
library, code duplication and inconsistency will result.

### Recommendation

Adopt a **Storybook-first development approach**:

1. UI Designer (Agent 12) defines design tokens →
   `docs/brand/design-tokens.json`
2. Storybook Agent (Agent 31) creates component library →
   `docs/storybook/component-inventory.md`
3. Implementation Agent (Agent 20) builds ONLY components documented in
   Storybook
4. Screens are assembled from components (no ad-hoc UI code)

### Success Criteria (SMART)

- **Specific:** 30+ reusable components documented in Storybook (Button, Input,
  Card, Modal, Toast, Table, etc.)
- **Measurable:** 0 UI elements in production code not documented in Storybook
- **Achievable:** Storybook Agent has template; UI Designer provides design
  tokens
- **Relevant:** Prevents technical debt; enforces brand consistency
- **Time-bound:** Complete before Sprint 1 story SP-1-003 (Dashboard screen)
  begins

### Implementation Notes

- Use React + TypeScript (per DEC-003 in decisions.md)
- Storybook 7+ with accessibility addon (axe-core)
- Document props, variants, accessibility labels for each component
- CI/CD: Storybook builds automatically on PR; deployed to GitHub Pages

### Effort Estimate

- Storybook Agent: 8 hours
- Implementation Agent (component build): 40 hours (Sprint 1)

### Risk if Not Implemented

- Code duplication across all 8 screens
- Inconsistent visual design (different button styles, spacing, colors)
- Accessibility violations (inconsistent ARIA labels)
- Refactoring cost in Sprint 2-3: +100 hours

**Linked Story:** SP-1-001 (Component Library Setup)  
**Owner:** Storybook Agent (31) → Implementation Agent (20)  
**Source:** Analysis sec 9 (recommendations for next agents), Guardrail G-UX-30
(Storybook always leading)

---

## RECOMMENDATION 02 — Add Onboarding Tour for First-Time Users

**Priority:** HIGH  
**Category:** User Onboarding  
**Addresses:** RISK-UXD-001 (complexity overwhelms solo founder)

### Problem Statement

The Command Center has 8 tabs, 3-column layouts, and deep hierarchies. UX
Researcher persona analysis shows solo founders are time-constrained and prefer
"learning by doing" over reading documentation. Without guided onboarding, users
may abandon the platform within 5 minutes.

### Recommendation

Implement an **interactive product tour** using a lightweight library (e.g.,
Driver.js or Shepherd.js):

1. Trigger automatically on first visit (detected via localStorage flag)
2. Highlight 6 key areas in sequence:
   - Dashboard phase cards ("This shows progress across 4 design phases")
   - Quick Actions menu ("Start workflows here")
   - Recent Activity feed ("Real-time updates appear here")
   - Questionnaires tab ("Answer required questions to unlock phases")
   - Session State tab ("Advanced: inspect system state")
   - Help tab ("Search for help anytime")
3. Allow skip (X button) or dismiss (Esc key)
4. Re-trigger via Help menu → "Take Tour Again"
5. Track completion in analytics (event: `tour_completed`)

### Success Criteria (SMART)

- **Specific:** 6-step interactive tour covering Dashboard, Quick Actions,
  Activity Feed, Questionnaires, Session State, Help
- **Measurable:** ≥ 70% of first-time users complete tour (tracked in
  analytics-events.json)
- **Achievable:** Driver.js is 12KB gzipped; integration < 4 hours
- **Relevant:** Reduces learning curve (UX Researcher Rec-06 goal)
- **Time-bound:** Implemented in Sprint 1 (SP-1-004)

### Implementation Notes

- Use Driver.js (MIT license, no dependencies, accessibility-friendly)
- Tour content written by Content Strategist (Agent 32)
- Tour steps stored in `public/tour-config.json` (editable without code changes)
- Tour skipped if user arrives via deep link or query param (to avoid
  disruption)

### Effort Estimate

- Content Strategist (tour script): 2 hours
- Implementation Agent (integration): 4 hours
- Test Agent (tour flow validation): 2 hours

### Risk if Not Implemented

- High bounce rate on first visit (users don't understand where to start)
- Increased support burden (repetitive "how do I...?" questions)
- Solo founders abandon platform before seeing value

**Linked Story:** SP-1-004 (Onboarding Tour)  
**Owner:** Implementation Agent (20) + Content Strategist (32)  
**Source:** UX Researcher RISK-UX-002 (learning curve), Analysis sec 10
RISK-UXD-001

---

## RECOMMENDATION 03 — Implement Real-Time SSE with Reconnection Logic

**Priority:** CRITICAL  
**Category:** Technical Foundation  
**Addresses:** RISK-UXD-002 (UI flicker), GAP-UXD-004 (error recovery)

### Problem Statement

All 8 screens depend on real-time updates via Server-Sent Events (SSE). Without
robust reconnection logic, users will see stale data after network
interruptions. Senior Developer analysis (phase-2/06) specifies SSE but does not
detail client-side error handling.

### Recommendation

Implement a **resilient SSE client** with:

1. **Reconnection Strategy:**
   - Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
   - Max 10 retry attempts → then show "Connection lost. Refresh page." modal
2. **Connection State UI:**
   - Toast on disconnect: "Connection lost. Reconnecting..." (yellow, no
     auto-dismiss)
   - Toast on reconnect: "Connection restored." (green, auto-dismiss 3s)
3. \*\*

Partial Update Handling:\*\*

- On reconnect, fetch full state via GET /api/session (to avoid missing events
  during disconnect)

4. **Heartbeat:**
   - Server sends heartbeat every 30s: `{ type: 'heartbeat', timestamp: '...' }`
   - Client detects missing heartbeat (45s timeout) → trigger reconnection
5. **Event Deduplication:**
   - Each SSE event has unique `event_id`
   - Client tracks last 100 event IDs → ignore duplicates on reconnect

### Success Criteria (SMART)

- **Specific:** SSE client with exponential backoff, heartbeat detection,
  full-state resync, deduplication
- **Measurable:** Reconnection succeeds within 30s of network restore in 95% of
  disconnects (tested via Cypress with network throttling)
- **Achievable:** Similar patterns used in production systems (e.g., Supabase
  Realtime, Firebase)
- **Relevant:** Prevents stale data, reduces user frustration
- **Time-bound:** Implemented in Sprint 1 (SP-1-002)

### Implementation Notes

- Abstract SSE client into hook: `useSSE(url, handlers)`
- Reconnection state managed globally (React Context)
- Connection status indicator in header (green dot = connected, yellow =
  reconnecting, red = failed)
- Log all SSE events to analytics-events.json (for debugging)

### Effort Estimate

- Senior Developer (SSE server heartbeat): 2 hours
- Implementation Agent (SSE client hook): 8 hours
- Test Agent (reconnection scenarios): 6 hours

### Risk if Not Implemented

- Users see stale phase status, questionnaire completion, sprint progress
- After network hiccup, users must manually refresh page (poor UX)
- No visibility into connection state (users don't know if system is working)

**Linked Story:** SP-1-002 (SSE Real-Time Infrastructure)  
**Owner:** Senior Developer (06) + Implementation Agent (20)  
**Source:** Senior Developer analysis (phase-2/06 sec 4.2), Analysis sec 10
RISK-UXD-002, GAP-UXD-004

---

## RECOMMENDATION 04 — Create Comprehensive Error Recovery Modals

**Priority:** HIGH  
**Category:** Error Handling  
**Addresses:** GAP-UXD-004 (error recovery workflows incomplete)

### Problem Statement

Analysis sec 8 identifies missing error recovery flows: "What happens when SSE
connection fails permanently? When file writes fail due to permissions?" Users
currently have no guidance on recovery.

### Recommendation

Design and implement **4 error modal templates** with clear recovery paths:

**Modal 1: Connection Permanently Lost**

- Trigger: SSE reconnection fails after 10 attempts
- Title: "Connection Lost"
- Message: "Unable to connect to server after 10 attempts. This may indicate a
  server issue or network problem."
- Actions:
  - [Retry Now] → immediate reconnection attempt
  - [Refresh Page] → hard reload
  - [Report Issue] → opens feedback form (pre-filled with error context)

**Modal 2: File Write Permission Error**

- Trigger: POST /api/questionnaires/answer returns 500 with error code `EACCES`
- Title: "Save Failed — Permission Denied"
- Message: "Unable to save answer due to file permission error. This may require
  administrator action."
- Actions:
  - [Copy Answer] → copy textarea content to clipboard (so user doesn't lose
    work)
  - [Report Issue] → opens feedback form
  - [Close] → dismiss modal

**Modal 3: Git Commit Failed**

- Trigger: Session state update fails due to git lock or conflict
- Title: "System Update Failed"
- Message: "Unable to save system state. Another process may be updating the
  same file."
- Actions:
  - [Retry in 5s...] → auto-retry countdown
  - [Force Update] → override (requires confirmation)
  - [Cancel] → dismiss (changes not saved)

**Modal 4: Agent Timeout**

- Trigger: current_agent shows IN_PROGRESS for > 10 minutes with no file output
- Title: "Agent May Be Stuck"
- Message: "The [Agent Name] has been running for 10+ minutes without output.
  This may indicate an error."
- Actions:
  - [View Session State] → navigate to Session State tab
  - [Check Terminal Output] → open Help article "Troubleshooting: Agent stuck"
  - [HALT Workflow] → stop and escalate (requires typing "HALT")

### Success Criteria (SMART)

- **Specific:** 4 error modal templates implemented with context-specific
  messages and recovery actions
- **Measurable:** All 4 scenarios manually tested in QA (simulate network loss,
  permission errors, git conflicts, agent timeout)
- **Achievable:** Modal component already in Storybook; only content and trigger
  logic needed
- **Relevant:** Prevents user being "stuck" without recourse
- **Time-bound:** Implemented in Sprint 2 (SP-2-005)

### Implementation Notes

- Error modal content written by Content Strategist (Agent 32)
- Error codes mapped to modal type in `error-modal-config.json`
- Log all modal triggers to analytics-events.json (track error frequency)

### Effort Estimate

- Content Strategist (error messages + recovery steps): 3 hours
- Implementation Agent (modal triggers + actions): 6 hours
- Test Agent (error scenarios): 4 hours

### Risk if Not Implemented

- Users lose work (no "Copy Answer" option on save failure)
- Users don't know how to recover from errors (forced to restart)
- Support burden increases (manual intervention required)

**Linked Story:** SP-2-005 (Error Recovery Modals)  
**Owner:** Implementation Agent (20) + Content Strategist (32)  
**Source:** Analysis sec 8 GAP-UXD-004, Guardrail G-GLOB-60 (escalation
protocol)

---

## RECOMMENDATION 05 — Optimize React Rendering for SSE Updates

**Priority:** HIGH  
**Category:** Performance  
**Addresses:** RISK-UXD-002 (real-time updates cause UI flicker)

### Problem Statement

SSE events trigger React re-renders. If not optimized, high-frequency events
(e.g., agent progress updates every 5s) cause visual jank, especially on low-end
devices.

### Recommendation

Implement **React performance optimizations**:

1. **Memoization:**
   - Wrap expensive components in `React.memo` (e.g., PhaseCard,
     QuestionnaireList, DecisionTimeline)
   - Use `useMemo` for derived state (e.g., filtered lists, sorted tables)
   - Use `useCallback` for event handlers passed as props
2. **Batch SSE Updates:**
   - Client batches SSE events received within 500ms window
   - Single re-render per batch (not per event)
3. **Virtual Scrolling:**
   - For long lists (Activity Feed > 100 items, Decision Timeline > 50 items),
     use `react-window` or `react-virtualized`
   - Only render visible items + 10 buffer (above/below viewport)
4. **Lazy Loading:**
   - Tabs not visible are not rendered (React.lazy + Suspense)
   - Code-split per tab (reduces initial bundle size)
5. **Lighthouse Performance Target:**
   - Desktop: Performance score ≥ 95
   - Mobile: Performance score ≥ 85

### Success Criteria (SMART)

- **Specific:** React.memo on 10+ components, SSE batching (500ms), virtual
  scrolling for lists > 50 items, lazy loading for all tabs
- **Measurable:** Lighthouse Performance score ≥ 95 (desktop), ≥ 85 (mobile);
  measured in CI/CD
- **Achievable:** Standard React optimization techniques
- **Relevant:** Prevents UI jank; improves perceived performance
- **Time-bound:** Implemented in Sprint 2 (SP-2-006)

### Implementation Notes

- Use React DevTools Profiler to identify slow components
- Measure before/after with Lighthouse CI (fail PR if score drops below
  threshold)
- Document memoization strategy in technical-manual.md

### Effort Estimate

- Implementation Agent (optimizations): 12 hours
- Test Agent (performance testing): 4 hours

### Risk if Not Implemented

- UI feels sluggish on low-end devices (e.g., older MacBook Air, low-end Windows
  laptops)
- High CPU usage → battery drain on laptops
- Users perceive platform as "unpolished"

**Linked Story:** SP-2-006 (React Performance Optimization)  
**Owner:** Implementation Agent (20)  
**Source:** Analysis sec 10 RISK-UXD-002, Senior Developer performance req
(phase-2/06 sec 6)

---

## RECOMMENDATION 06 — Define Animation Tokens and Motion Design System

**Priority:** MEDIUM  
**Category:** Visual Polish  
**Addresses:** GAP-UXD-002 (no animation specifications)

### Problem Statement

Wireframes define layout but not transitions. Without animation tokens,
Implementation Agent will use inconsistent timings (e.g., modal fades in 200ms
vs 500ms on different screens), resulting in jarring UX.

### Recommendation

UI Designer (Agent 12) defines **motion design tokens** in
`docs/brand/animation-tokens.json`:

```json
{
  "durations": {
    "instant": "100ms",
    "fast": "200ms",
    "normal": "300ms",
    "slow": "500ms"
  },
  "easings": {
    "easeIn": "cubic-bezier(0.4, 0, 1, 1)",
    "easeOut": "cubic-bezier(0, 0, 0.2, 1)",
    "easeInOut": "cubic-bezier(0.4, 0, 0.2, 1)",
    "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)"
  },
  "transitions": {
    "modalOpen": { "duration": "normal", "easing": "easeOut" },
    "modalClose": { "duration": "fast", "easing": "easeIn" },
    "tabSwitch": { "duration": "fast", "easing": "easeInOut" },
    "toastSlideIn": { "duration": "normal", "easing": "spring" },
    "accordionExpand": { "duration": "normal", "easing": "easeOut" }
  }
}
```

Apply to all transitions in CSS or Framer Motion.

### Success Criteria (SMART)

- **Specific:** Animation tokens JSON with durations, easings, transition
  mappings; applied to 10+ UI transitions
- **Measurable:** 0 hardcoded animation values in component code (enforced via
  ESLint rule)
- **Achievable:** UI Designer already defines design tokens; animations are
  extension
- **Relevant:** Creates consistent, polished feel
- **Time-bound:** UI Designer deliverable before Sprint 1; applied in Sprint 2

### Implementation Notes

- Use CSS custom properties for simple transitions (opacity, transform)
- Use Framer Motion for complex animations (modal spring, stagger lists)
- Document in Storybook: show each transition type with code example

### Effort Estimate

- UI Designer (token definition): 2 hours
- Implementation Agent (apply to components): 6 hours

### Risk if Not Implemented

- Inconsistent animation timing feels amateurish
- Users notice jarring transitions (e.g., instant modal pop vs smooth fade)
- Minor but impacts perceived quality

**Linked Story:** SP-2-007 (Animation System)  
**Owner:** UI Designer (12) → Implementation Agent (20)  
**Source:** Analysis sec 8 GAP-UXD-002

---

## RECOMMENDATION 07 — Add Browser Compatibility Documentation

**Priority:** MEDIUM  
**Category:** Documentation  
**Addresses:** RISK-UXD-003 (browser compatibility issues)

### Problem Statement

Analysis assumes modern browsers, but no explicit browser support matrix is
documented. Users on outdated browsers may encounter errors without clear
messaging.

### Recommendation

1. **Define Supported Browsers:**
   - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ (all released ≤ 2 years ago)
   - Explicitly NOT supported: IE11, older Safari (< 14)
2. **Add Browser Detection:**
   - On app load, detect browser version via user-agent
   - If unsupported → show modal: "Unsupported Browser. Please upgrade to Chrome
     90+, Firefox 88+, or Safari 14+."
   - Link to browser download pages
3. **Document in README:**
   - Add "Browser Requirements" section
   - List supported browsers with version numbers
   - Note: "SSE (Server-Sent Events) required; IE11 not supported."
4. **Feature Detection (Not Browser Sniffing):**
   - Check for `EventSource` API availability
   - Check for CSS Grid, Flexbox (required for layout)
   - If missing → show fallback message

### Success Criteria (SMART)

- **Specific:** Browser detection + unsupported modal + README section
- **Measurable:** Modal shown to users on IE11, Safari 13 (verified in
  BrowserStack)
- **Achievable:** User-agent detection is standard; modal already in Storybook
- **Relevant:** Prevents confusing errors for users on old browsers
- **Time-bound:** Implemented in Sprint 2 (SP-2-008)

### Implementation Notes

- Use Browserslist in package.json for transpilation targeting
- Test in BrowserStack (free for open-source projects)
- Log unsupported browser events to analytics (to track % of users affected)

### Effort Estimate

- Implementation Agent (detection + modal): 3 hours
- Documentation Agent (README update): 1 hour
- Test Agent (BrowserStack validation): 2 hours

### Risk if Not Implemented

- Users on old browsers see cryptic errors ("EventSource is not defined")
- Support requests from IE11 users (wasted time)
- Minor issue (target audience is technical, likely uses modern browsers)

**Linked Story:** SP-2-008 (Browser Compatibility Check)  
**Owner:** Implementation Agent (20) + Documentation Agent (26)  
**Source:** Analysis sec 10 RISK-UXD-003

---

## RECOMMENDATION 08 — Implement Mobile Gesture Library

**Priority:** MEDIUM  
**Category:** Mobile UX  
**Addresses:** GAP-UXD-003 (mobile gesture library undefined)

### Problem Statement

Wireframes mention "swipe to dismiss toasts" and "swipe for actions" but do not
specify gesture thresholds or feedback. Without clear specs, mobile UX will feel
incomplete.

### Recommendation

UI Designer (Agent 12) + Implementation Agent (Agent 20) define and implement
**mobile gestures**:

1. **Swipe-to-Dismiss (Toasts):**
   - Swipe right or left ≥ 50px → dismiss toast
   - Visual feedback: toast follows finger during swipe
   - Snap back if swipe < 50px
2. **Swipe-for-Actions (Decision Cards):**
   - Swipe left on decision card → reveal [Edit] [Archive] buttons
   - Swipe right → hide action buttons
   - Threshold: 30px
3. **Pull-to-Refresh (Activity Feed):**
   - Pull down ≥ 80px → trigger refresh
   - Show spinner during refresh
   - Snap back after refresh complete
4. **Library Choice:**
   - Use Hammer.js (MIT, 7KB gzipped) OR native touch events
   - Prefer native if gesture set is simple (only 3 gestures)

### Success Criteria (SMART)

- **Specific:** 3 gestures implemented (swipe-to-dismiss, swipe-for-actions,
  pull-to-refresh) with specified thresholds
- **Measurable:** Gestures work on iOS Safari, Android Chrome (tested on real
  devices)
- **Achievable:** Standard mobile patterns; libraries available
- **Relevant:** Expected behavior on mobile; increases polish
- **Time-bound:** Implemented in Sprint 3 (SP-3-005)

### Implementation Notes

- Document gesture design in `docs/brand/gesture-design.md`
- Test on iOS 14+, Android 10+
- Add accessibility note: gestures have keyboard equivalents (for switch control
  users)

### Effort Estimate

- UI Designer (gesture spec): 2 hours
- Implementation Agent (gesture impl): 8 hours
- Test Agent (device testing): 4 hours

### Risk if Not Implemented

- Mobile UX feels "web-like" (not native-like)
- Users expect swipe gestures (common on mobile); absence is noticeable
- Low severity (desktop is primary; mobile is secondary per ASSUMPTION-UXD-002)

**Linked Story:** SP-3-005 (Mobile Gesture Library)  
**Owner:** UI Designer (12) + Implementation Agent (20)  
**Source:** Analysis sec 8 GAP-UXD-003, Analysis sec 6 (responsive behavior)

---

## RECOMMENDATION 09 — Create Help Article Seed Content

**Priority:** HIGH  
**Category:** User Support  
**Addresses:** UX Researcher Rec-06 (help + search), RISK-UXD-001 (complexity)

### Problem Statement

Help tab is specified in wireframes (sec 2.8) with 10 seed articles listed, but
content does not exist yet. Without help content, users will struggle with
complex workflows (e.g., resolving BLOCKING items, executing SCOPE CHANGE).

### Recommendation

Content Strategist (Agent 32) writes **10 help articles** (500-800 words each)
in `.github/help/`:

1. `what-is-create-vs-audit-mode.md`
2. `how-to-answer-questionnaire.md`
3. `understanding-insufficient-data.md`
4. `how-to-resolve-blocking-item.md`
5. `critic-risk-validation-explained.md`
6. `what-is-scope-change.md`
7. `how-to-execute-hotfix.md`
8. `sprint-gate-definition-of-ready.md`
9. `interpret-cross-team-blocker-matrix.md`
10. `troubleshoot-agent-stuck.md`

Each article includes:

- **Problem statement** (what user is trying to do)
- **Step-by-step instructions** (numbered, with screenshots placeholders)
- **Common errors** (what to avoid)
- **Related articles** (internal links)
- **Last updated date** (for freshness)

### Success Criteria (SMART)

- **Specific:** 10 help articles written in Markdown, stored in `.github/help/`,
  indexed in Help tab
- **Measurable:** All 10 articles ≥ 500 words, with step-by-step instructions
- **Achievable:** Content Strategist skill file includes help writing
- **Relevant:** Reduces cognitive load; provides self-service support
- **Time-bound:** Content written before Sprint 1; integrated in Sprint 1
  (SP-1-009)

### Implementation Notes

- Use consistent template (Problem / Steps / Common Errors / Related)
- Placeholder for screenshots: `<!-- TODO: Add screenshot of [Screen] -->`
- Screenshots added in Sprint 2 after screens are implemented

### Effort Estimate

- Content Strategist (10 articles): 12 hours
- Implementation Agent (Help tab integration): 4 hours

### Risk if Not Implemented

- Users can't self-serve; must contact support or read source code
- High support burden (repetitive questions)
- Contributes to RISK-UXD-001 (complexity overwhelms users)

**Linked Story:** SP-1-009 (Help Content Seed)  
**Owner:** Content Strategist (32) + Implementation Agent (20)  
**Source:** Analysis sec 2.8 (Help wireframe), UX Researcher Rec-06

---

## RECOMMENDATION 10 — Add Deep Linking for All Tabs

**Priority:** MEDIUM  
**Category:** Navigation  
**Addresses:** UX Researcher Rec-09 (findability), Analysis sec 4.3 (deep
linking)

### Problem Statement

Wireframes specify deep linking URL patterns (sec 4.3) but don't document
implementation approach. Without deep linking, users can't bookmark specific
views or share links to teammates (e.g., "Look at this decision:
/decisions?id=DEC-003").

### Recommendation

Implement **client-side routing with query params**:

1. **URL Patterns (from Analysis sec 4.3):**
   - `/dashboard`
   - `/questionnaires?phase=1&status=incomplete`
   - `/decisions?status=DECIDED&id=DEC-003`
   - `/synthesis?report=master#section-2`
   - `/analytics`
   - `/documents?doc=product-vision.md`
   - `/session`
   - `/help?article=troubleshoot-agent-stuck`
2. **Implementation:**
   - Use React Router v6 (or similar)
   - Parse query params on mount → apply filters/navigate to entity
   - Update URL on navigation (without page reload)
3. **Copy URL Button:**
   - Add button in header: [Copy Link 🔗]
   - Copies current URL to clipboard
   - Show toast: "Link copied! Share with your team."
4. **Preserve State:**
   - Filter states, sort orders, expanded accordions encoded in URL
   - Example: `/questionnaires?phase=1&status=incomplete&expanded=Q-PH1-BA-001`

### Success Criteria (SMART)

- **Specific:** All 8 tabs support deep linking; URL updates on navigation; Copy
  Link button in header
- **Measurable:** Open URL `/decisions?id=DEC-003` → navigates to Decisions
  tab + scrolls to DEC-003 card
- **Achievable:** React Router standard feature
- **Relevant:** Enables collaboration (share links), bookmarkability
- **Time-bound:** Implemented in Sprint 2 (SP-2-009)

### Implementation Notes

- Use `react-router-dom` v6
- Encode filters in query params (not hash, for SEO if public deployment)
- Test: open deep link in incognito → should render correct state

### Effort Estimate

- Implementation Agent (routing + query params): 8 hours
- Test Agent (deep link validation): 3 hours

### Risk if Not Implemented

- Users can't share specific views (must describe: "Go to Decisions tab, find
  DEC-003")
- No bookmarking → users lose context on page refresh
- Minor UX deficit but notable for collaboration

**Linked Story:** SP-2-009 (Deep Linking + URL State)  
**Owner:** Implementation Agent (20)  
**Source:** Analysis sec 4.3 (deep linking), UX Researcher Rec-09 (findability)

---

## SUMMARY TABLE

| #         | Recommendation                                   | Priority | Category                | Linked Story   | Owner                        | Effort   |
| --------- | ------------------------------------------------ | -------- | ----------------------- | -------------- | ---------------------------- | -------- |
| 01        | Implement Component Library Before Screens       | CRITICAL | Implementation Strategy | SP-1-001       | Storybook (31) + Impl (20)   | 48h      |
| 02        | Add Onboarding Tour for First-Time Users         | HIGH     | User Onboarding         | SP-1-004       | Impl (20) + Content (32)     | 8h       |
| 03        | Implement Real-Time SSE with Reconnection Logic  | CRITICAL | Technical Foundation    | SP-1-002       | Sr Dev (06) + Impl (20)      | 16h      |
| 04        | Create Comprehensive Error Recovery Modals       | HIGH     | Error Handling          | SP-2-005       | Impl (20) + Content (32)     | 13h      |
| 05        | Optimize React Rendering for SSE Updates         | HIGH     | Performance             | SP-2-006       | Impl (20)                    | 16h      |
| 06        | Define Animation Tokens and Motion Design System | MEDIUM   | Visual Polish           | SP-2-007       | UI Designer (12) + Impl (20) | 8h       |
| 07        | Add Browser Compatibility Documentation          | MEDIUM   | Documentation           | SP-2-008       | Impl (20) + Docs (26)        | 6h       |
| 08        | Implement Mobile Gesture Library                 | MEDIUM   | Mobile UX               | SP-3-005       | UI Designer (12) + Impl (20) | 14h      |
| 09        | Create Help Article Seed Content                 | HIGH     | User Support            | SP-1-009       | Content (32) + Impl (20)     | 16h      |
| 10        | Add Deep Linking for All Tabs                    | MEDIUM   | Navigation              | SP-2-009       | Impl (20)                    | 11h      |
| **TOTAL** |                                                  |          |                         | **10 stories** | **6 agents**                 | **156h** |

---

## HANDOFF CHECKLIST

- [x] All 10 recommendations are SMART-compliant (Specific, Measurable,
      Achievable, Relevant, Time-bound)
- [x] Each recommendation addresses specific gap/risk from Analysis deliverable
- [x] Linked stories reference sprint plan (to be created in deliverable 3)
- [x] Effort estimates provided for owner agents
- [x] Risks-if-not-implemented documented for each recommendation
- [x] Summary table aggregates all recommendations for quick reference
- [x] No contradictory recommendations
- [x] All recommendations sourced (Analysis sec references)
- [x] Output complies with recommendations-output-contract.md
- [x] Deliverable written to file
      `docs/phase-3/11-ux-designer-recommendations.md`

**Status:** READY  
**Next Deliverable:** 11-ux-designer-sprintplan.md (deliverable 3 of 4)

---

**SOURCE CITATIONS:**

- UX Designer Analysis: `docs/phase-3/11-ux-designer-analysis.md` (gaps,
  risks, uncertainties)
- UX Researcher: `docs/phase-3/10-ux-researcher-analysis.md`
  (recommendations)
- Phase 2: `docs/phase-2/06-senior-developer-analysis.md` (SSE,
  performance)
- Contracts: `docs/contracts/recommendations-output-contract.md`
- Guardrails: `docs/guardrails/04-ux-guardrails.md`
