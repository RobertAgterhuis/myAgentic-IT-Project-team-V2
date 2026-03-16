# M21: UI Coherence & Guided Navigation

> **Impact:** MEDIUM | **Breaking changes:** NONE | **Blocks:** nothing |
> **Blocked by:** nothing
>
> **Audit reference:** Weakness #6 and Phase 6 recommendation — "UI breadth may
> exceed UX convergence. The route map is broad, but product clarity and user
> journey sophistication are not proven by route count alone." Phase 6: "The UI
> must become a true operational cockpit: guided onboarding, explicit
> current-state / next-best-action flows, operator confidence indicators."
>
> **Validation:** CONFIRMED. 16 page directories, 10 routes, 24+ UI components,
> 28 hooks. The structural breadth is real. What's missing is explicit user
> journey design: "I just opened the app — what do I do first?" and "I'm
> mid-sprint — what needs my attention right now?"

---

## Rationale

An architecturally sound UI that confuses users is worse than a simple UI that
guides them. The route inventory proves the UI can display anything — but a
platform must also explain itself. This milestone addresses the gap between
capability and usability without changing the architecture.

---

## Issues

### M21-001: Define primary user journeys

**Labels:** `ux`, `product`

Document the top 5 user journeys as step-by-step flows:

1. **First-time onboarding** — "I just installed this, what do I do?"
2. **Create new project** — "I want to start a CREATE cycle"
3. **Monitor active sprint** — "What's happening right now?"
4. **Answer questionnaire/decision** — "The system needs my input"
5. **Review gate/approval** — "Something is blocked and needs me"

For each journey: entry point, steps, expected state changes, exit point.

**Acceptance criteria:**

- [ ] 5 user journey documents in `docs/ux/`
- [ ] Each journey has a clear entry point tied to the UI
- [ ] Journeys validated against actual UI routes and components

---

### M21-002: Implement "What's Next" guidance on Overview page

**Labels:** `ux`, `frontend`

Add a contextual guidance section to the Overview (dashboard) page:

- If no project exists → show "Create your first project" CTA
- If project is in ONBOARDING → show "Complete onboarding" with progress
- If questionnaires are pending → show "X questionnaires need your input"
- If decisions are OPEN + HIGH → show "X critical decisions awaiting your input"
- If approvals are pending → show "X governance approvals needed"
- If sprint is active → show sprint progress + any blocked stories

Use existing hooks (`use-dashboard`, `use-governance`, `use-questionnaires`,
`use-decisions`).

**Acceptance criteria:**

- [ ] Overview page shows contextual next-best-action guidance
- [ ] Guidance updates in real-time (via SSE/polling)
- [ ] Each guidance item links to the relevant page/action
- [ ] Empty state (no project) has a clear CTA

---

### M21-003: Add breadcrumb navigation

**Labels:** `ux`, `frontend`

Implement breadcrumb navigation across all pages:

- Dashboard → Section → Page (e.g., Runtime > Sessions > Session Detail)
- Use the existing navigation section grouping (Runtime, Operations, Data,
  Observability)
- Breadcrumbs should be clickable for navigation

**Acceptance criteria:**

- [ ] Breadcrumbs visible on all non-root pages
- [ ] Breadcrumbs match the navigation hierarchy
- [ ] Clicking a breadcrumb navigates to that level

---

### M21-004: Add keyboard shortcuts for power users

**Labels:** `ux`, `frontend`

Extend the existing `use-keyboard-shortcuts` hook with navigation shortcuts:

- `g d` → go to Dashboard
- `g p` → go to Pipeline
- `g c` → go to Commands
- `g q` → go to Questionnaires
- `g e` → go to Decisions
- `?` → show keyboard shortcut help overlay

**Acceptance criteria:**

- [ ] Keyboard shortcuts work from any page
- [ ] `?` opens a shortcut reference overlay
- [ ] Shortcuts are listed in the help documentation
- [ ] No conflicts with browser or IDE shortcuts

---

### M21-005: Implement page-level loading and error states

**Labels:** `ux`, `frontend`

Audit all 16 page components for consistent loading and error handling:

- Use the existing `Skeleton`, `Spinner`, and `AlertBanner` components
- Every page with data fetching must show skeleton on load, error banner on
  failure
- Retry button on error states
- Empty states with helpful guidance

**Acceptance criteria:**

- [ ] All pages with data fetching have loading skeletons
- [ ] All pages have error banners with retry
- [ ] Empty states show guidance, not blank screens
- [ ] Consistent pattern across all pages

---

### M21-006: Add Storybook stories for all page states

**Labels:** `testing`, `frontend`, `storybook`

For each page component, create Storybook stories covering:

- Loading state
- Empty state
- Populated state (typical data)
- Error state
- Edge cases (long lists, missing data, boundary values)

**Acceptance criteria:**

- [ ] Every page directory has a `.stories.tsx` file
- [ ] Each story covers at least: loading, empty, populated, error
- [ ] Stories use MSW for realistic data mocking
- [ ] Storybook builds successfully with all new stories
