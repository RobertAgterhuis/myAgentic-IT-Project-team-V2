# UX Designer Guardrails — CREATE Mode

> **Agent:** 11-ux-designer  
> **Phase:** 3 — Experience Design  
> **Deliverable:** 4 of 4 (Guardrails)  
> **Created:** 2026-03-10T07:00:00Z  
> **Mode:** CREATE  
> **Project:** MYAGENTIC-IT-PROJECT-TEAM-V2

---

## EXECUTIVE SUMMARY

This document defines **7 mandatory guardrails** for Implementation Agent (20)
and all downstream agents to prevent UX degradation during Phase 5. Each
guardrail includes violation detection criteria and corrective actions.

**Guardrail Categories:**

- **Component Integrity (2):** Prevent ad-hoc UI code, enforce Storybook
  contract
- **Performance (1):** Maintain Lighthouse scores above thresholds
- **Accessibility (2):** Enforce WCAG AA minimum, keyboard navigation
- **Real-Time Reliability (1):** Ensure SSE reconnection works
- **User Safety (1):** Prevent secret exposure in user-facing fields

**Enforcement:** All guardrails checked in PR/Review Agent (22) before merge.
Violations block PR approval.

---

## GUARDRAIL G-UXD-01 — Storybook Component Contract

**Scope:** All UI code in Phase 5 (Implementation Agent)  
**Severity:** CRITICAL (blocks PR if violated)  
**Addresses:** RISK-UXD-001 (complexity), Recommendation 01

### Rule

Implementation Agent MUST NOT create or use UI components that are not
documented in `.github/docs/storybook/component-inventory.md`. All UI elements
MUST be assembled from Storybook components.

### Rationale

Ad-hoc UI code leads to:

- Inconsistent visual design (different button styles, spacing, colors across
  screens)
- Accessibility violations (missing ARIA labels, keyboard nav)
- Code duplication (same component implemented 5 times in different ways)
- Brand inconsistency (colors, typography not aligned with design tokens)

Storybook is the **single source of truth** for UI components.

### Detection Criteria

**Manual Check (PR/Review Agent):**

1. Search codebase for JSX files not in `src/components/` or `src/pages/`
2. Search for inline styled JSX (e.g., `<div style={{...}}>`) — PROHIBITED
3. Search for hardcoded colors, fonts, spacing (e.g., `color: '#3B82F6'`,
   `font-size: 16px`) — MUST use design tokens
4. Verify all component imports trace back to Storybook-documented components

**Automated Check (ESLint Rule):**

```javascript
// .eslintrc.js
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'JSXAttribute[name.name="style"]',
      message: 'Inline styles prohibited. Use Tailwind classes or styled-components referencing design tokens.',
    },
  ],
}
```

### Violation Example

```tsx
// ❌ VIOLATION: Ad-hoc button not in Storybook
<button style={{ backgroundColor: '#3B82F6', padding: '8px 16px' }}>
  Click Me
</button>;

// ✅ CORRECT: Use Button component from Storybook
import { Button } from '@/components/Button';
<Button variant="primary">Click Me</Button>;
```

### Corrective Action

**If Violation Detected:**

1. PR/Review Agent comments on PR: "Violation of G-UXD-01: Component
   `<ComponentName>` not found in Storybook component-inventory.md. Add to
   Storybook or use existing component."
2. PR blocked until fixed
3. Implementation Agent must either:
   - **Option A:** Replace ad-hoc code with existing Storybook component
   - **Option B:** Create new component in Storybook FIRST (Storybook Agent
     story), THEN use in implementation

**Escalation:** If Implementation Agent repeatedly violates (3+ times in one
sprint) → escalate to Orchestrator → mark as `LESSON_CANDIDATE` in
retrospective.

### Verification

**Pre-Merge Checklist (PR/Review Agent):**

- [ ] All UI components imported from `@/components/` (Storybook output
      directory)
- [ ] No inline `style` attributes in JSX (ESLint passes)
- [ ] No hardcoded color/font/spacing values (ESLint custom rule passes)
- [ ] All components referenced exist in `component-inventory.md`

**Post-Sprint Audit (Retrospective Agent):**

- Run: `grep -r "style={{" src/` → should return 0 results
- Verify: All components in `src/pages/` import from `@/components/`

---

## GUARDRAIL G-UXD-02 — Component Inventory Freshness

**Scope:** Storybook Agent (31), Implementation Agent (20)  
**Severity:** HIGH  
**Addresses:** Recommendation 01 (Storybook-first approach)

### Rule

`.github/docs/storybook/component-inventory.md` MUST be updated BEFORE
implementation of any story that introduces new UI elements. No new components
may be created in implementation without prior Storybook documentation.

### Rationale

Creating components during implementation bypasses design review and
accessibility validation. Storybook-first ensures:

- UI Designer (12) approves visual design before code is written
- Accessibility Specialist (13) validates ARIA labels before implementation
- All team members see component design (no surprises in PR review)

### Detection Criteria

**Sprint Gate Check (Orchestrator):**

- Before sprint starts, verify: `component-inventory.md` last modified
  timestamp > last implementation commit timestamp
- If component added in implementation code before updating inventory →
  violation

**PR Review Check (PR/Review Agent):**

- If PR adds new component in `src/components/` → check if
  `component-inventory.md` was updated in same commit or earlier
- If not → block PR

### Violation Example

```bash
# Commit history:
2026-03-10 14:00 | Implementation Agent | Add new Toast component (src/components/Toast.tsx)
2026-03-09 10:00 | Storybook Agent      | Update component-inventory.md (no Toast mentioned)

# ❌ VIOLATION: Toast component created before inventory update
```

### Corrective Action

**If Violation Detected:**

1. PR/Review Agent comments: "Violation of G-UXD-02: Component `<ComponentName>`
   added without updating component-inventory.md. Storybook-first approach
   required."
2. Implementation Agent must:
   - Revert component code (or keep in draft)
   - Create Storybook story for component (request Storybook Agent)
   - Update `component-inventory.md`
   - Re-submit PR with inventory update BEFORE implementation

**Escalation:** If blocked by Storybook Agent availability → Orchestrator may
grant 24h grace period for urgent hotfixes, but inventory MUST be updated within
24h post-merge.

### Verification

**Pre-Sprint Check (Sprint Gate):**

- [ ] `component-inventory.md` lists all components needed for sprint stories
- [ ] No new components planned in implementation stories without corresponding
      inventory entry

**Post-Sprint Audit (Retrospective Agent):**

- [ ] All components in `src/components/` exist in `component-inventory.md`
- [ ] No orphaned components (in code but not in inventory)

---

## GUARDRAIL G-UXD-03 — Lighthouse Performance Threshold

**Scope:** All UI stories (Implementation Agent)  
**Severity:** HIGH  
**Addresses:** RISK-UXD-002 (UI flicker), Recommendation 05

### Rule

All UI screens MUST achieve Lighthouse Performance score:

- **Desktop:** ≥ 95
- **Mobile:** ≥ 85

Scores measured on:

- Dashboard (`/dashboard`)
- Questionnaires (`/questionnaires`)
- Decisions (`/decisions`)
- Synthesis (`/synthesis`)
- Analytics (`/analytics`)
- Official Documents (`/documents`)
- Session State (`/session`)
- Help (`/help`)

### Rationale

Poor performance causes:

- UI jank (visual flicker on SSE updates)
- High CPU usage → battery drain on laptops
- Users perceive platform as "unpolished"
- Negative impact on user experience, especially on low-end devices

### Detection Criteria

**Automated Check (Lighthouse CI in GitHub Actions):**

```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse CI
  run: lhci autorun
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

# lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.95 }],  // Desktop
        "categories:performance@mobile": ["error", { "minScore": 0.85 }]  // Mobile
      }
    }
  }
}
```

**Manual Check (PR/Review Agent):**

- Run Lighthouse audit in Chrome DevTools on branch deployment
- Verify Performance score ≥ 95 (desktop), ≥ 85 (mobile)

### Violation Example

```
Lighthouse Report for /dashboard:
- Performance (Desktop): 88 ❌ (threshold: 95)
  - First Contentful Paint: 1.2s (slow)
  - Largest Contentful Paint: 2.5s (slow)
  - Total Blocking Time: 450ms (high)

# VIOLATION: Performance score below threshold
```

### Corrective Action

**If Violation Detected:**

1. Lighthouse CI fails → PR blocked
2. Implementation Agent investigates using Lighthouse report:
   - Check: Are components memoized? (use React.memo for expensive components)
   - Check: Are SSE events batched? (should batch within 500ms)
   - Check: Are lists virtualized? (use react-window for lists > 50 items)
   - Check: Are tabs lazy-loaded? (use React.lazy for code-splitting)
3. Apply optimizations from Recommendation 05 (SP-2-006)
4. Re-run Lighthouse → must pass before merge

**If Persistent (score cannot reach threshold):**

- Document exception in `docs/technical-manual.md` with justification
- Escalate to Orchestrator for approval
- Maximum allowed exceptions: 1 screen per sprint (not cumulative)

### Verification

**Pre-Merge (PR/Review Agent):**

- [ ] Lighthouse CI passes in GitHub Actions
- [ ] Performance score ≥ 95 (desktop), ≥ 85 (mobile) for all modified screens

**Post-Sprint Audit (Retrospective Agent):**

- [ ] Run Lighthouse on production deployment
- [ ] All 8 screens meet performance thresholds
- [ ] Document any exceptions granted during sprint

---

## GUARDRAIL G-UXD-04 — Accessibility WCAG AA Minimum

**Scope:** All UI components and screens  
**Severity:** CRITICAL (blocks PR if violated)  
**Addresses:** UX Researcher RISK-UX-005 (accessibility not validated)

### Rule

All UI components and screens MUST comply with WCAG 2.1 Level AA standards. Zero
accessibility violations allowed in axe-core automated audits.

**Mandatory Requirements:**

1. **Semantic HTML:** Use `<button>`, `<nav>`, `<main>`, `<aside>`, `<article>`,
   `<section>` (not `<div onclick>`)
2. **ARIA Labels:** All interactive elements have `aria-label` or
   `aria-labelledby`
3. **Keyboard Navigation:** All features accessible via keyboard (Tab, Enter,
   Esc, Arrow keys)
4. **Focus Visible:** Focus indicators clearly visible (:focus outline ≥ 2px,
   contrast ratio ≥ 3:1)
5. **Color Contrast:** Text contrast ratio ≥ 4.5:1 (normal text), ≥ 3:1 (large
   text 18pt+)
6. **Alt Text:** All images have `alt` attributes (empty alt="" for decorative
   images)
7. **Form Labels:** All form inputs have associated `<label>` with `for`
   attribute

### Detection Criteria

**Automated Check (Storybook Accessibility Addon):**

- axe-core runs on all components in Storybook
- Purple "Accessibility" tab in Storybook shows violations
- CI/CD: Storybook build fails if violations detected

**Automated Check (Lighthouse CI):**

- Accessibility score must be 100 on all screens
- PR blocked if score < 100

**Manual Check (PR/Review Agent):**

- Review code for semantic HTML (no `<div onclick>`, no `<span>` as buttons)
- Verify all interactive elements have ARIA labels
- Test keyboard navigation (Tab through all elements, Enter activates, Esc
  closes modals)

### Violation Example

```tsx
// ❌ VIOLATION 1: Non-semantic button
<div onClick={handleClick} className="button">
  Click Me
</div>
// Problem: Not keyboard accessible, no role, confusing to screen readers

// ❌ VIOLATION 2: Missing ARIA label
<button onClick={handleClose}>
  <XIcon />
</button>
// Problem: Screen reader announces "button" with no context

// ❌ VIOLATION 3: Missing form label
<input type="text" name="email" placeholder="Enter email" />
// Problem: Screen reader cannot associate label with input

// ✅ CORRECT:
<button onClick={handleClick}>
  Click Me
</button>

<button onClick={handleClose} aria-label="Close modal">
  <XIcon />
</button>

<label htmlFor="email-input">Email Address</label>
<input type="text" id="email-input" name="email" />
```

### Corrective Action

**If Violation Detected:**

1. axe-core or Lighthouse CI fails → PR blocked
2. Implementation Agent reviews violation report:
   - axe-core provides specific rule violated (e.g., `button-name`,
     `color-contrast`)
   - Documentation link provided for each rule
3. Fix violations:
   - Use semantic HTML
   - Add missing ARIA labels
   - Adjust colors for contrast
   - Add form labels
4. Re-run axe audit → must show 0 violations

**If Accessibility Specialist Review Needed:**

- For complex violations (e.g., focus management in multi-step wizard) → request
  Accessibility Specialist (13) review
- Specialist provides specific guidance
- Implementation Agent applies guidance

### Verification

**Pre-Merge (PR/Review Agent):**

- [ ] axe-core audit in Storybook shows 0 violations
- [ ] Lighthouse Accessibility score = 100 on all modified screens
- [ ] Manual keyboard navigation test passes (all features accessible)
- [ ] Focus indicators visible on Tab navigation

**Post-Sprint Audit (Accessibility Specialist):**

- [ ] Full manual audit using screen reader (NVDA or VoiceOver)
- [ ] Keyboard-only navigation test (no mouse/trackpad)
- [ ] Color contrast verified with tool (e.g., Contrast Checker)

---

## GUARDRAIL G-UXD-05 — Keyboard Navigation Completeness

**Scope:** All UI screens and components  
**Severity:** HIGH  
**Addresses:** UX Researcher RISK-UX-005, WCAG 2.1.1 (Keyboard accessible)

### Rule

All functionality MUST be accessible via keyboard without requiring mouse or
touch input. Standard keyboard shortcuts MUST be supported.

**Required Keyboard Interactions:**

1. **Tab:** Navigate to next interactive element
2. **Shift+Tab:** Navigate to previous interactive element
3. **Enter:** Activate button, link, or submit form
4. **Space:** Activate button or toggle checkbox
5. **Esc:** Close modal, dismiss toast, cancel action
6. **Arrow Keys:** Navigate within lists, tabs, menus (where applicable)
7. **Home/End:** Jump to first/last item in list (where applicable)
8. **Cmd/Ctrl + 1-8:** Navigate to tab N (custom shortcut for 8 tabs)

**Focus Management:**

- Modal opens → focus moves to first interactive element inside modal
- Modal closes → focus returns to element that triggered modal
- Toast appears → screen reader announces (aria-live="polite"), but focus does
  NOT move
- Page loads → focus on main content (skip link available)

### Detection Criteria

**Manual Test (PR/Review Agent):**

1. Disconnect mouse and trackpad
2. Navigate entire UI using only keyboard
3. Verify all features accessible:
   - Can open/close modals
   - Can submit forms
   - Can navigate tabs
   - Can filter/sort tables
   - Can expand/collapse accordions
4. Verify focus visible at all times (outline present)
5. Verify focus order logical (top-to-bottom, left-to-right)

**Automated Test (Playwright or Cypress):**

```javascript
// Example: Test modal keyboard navigation
test('Modal can be opened and closed via keyboard', async ({ page }) => {
  await page.goto('/decisions');
  await page.keyboard.press('Tab'); // Focus "Create Decision" button
  await page.keyboard.press('Enter'); // Open modal
  expect(await page.locator('[role="dialog"]').isVisible()).toBe(true);
  await page.keyboard.press('Escape'); // Close modal
  expect(await page.locator('[role="dialog"]').isVisible()).toBe(false);
});
```

### Violation Example

```tsx
// ❌ VIOLATION: Modal closes but focus not restored
const Modal = ({ isOpen, onClose }) => {
  return isOpen ? (
    <div role="dialog">
      <button onClick={onClose}>Close</button>
    </div>
  ) : null;
};
// Problem: When modal closes, focus goes to <body> instead of triggering button

// ✅ CORRECT: Focus restoration
const Modal = ({ isOpen, onClose, triggerRef }) => {
  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      triggerRef.current.focus(); // Restore focus
    }
  }, [isOpen]);

  return isOpen ? (
    <div role="dialog">
      <button onClick={onClose}>Close</button>
    </div>
  ) : null;
};
```

### Corrective Action

**If Violation Detected:**

1. PR/Review Agent performs keyboard-only test
2. Documents which feature is not accessible (e.g., "Cannot close modal with
   Esc")
3. Implementation Agent fixes:
   - Add missing keyboard event listeners
   - Implement focus management (return focus on modal close)
   - Ensure tab order is logical
4. Re-test keyboard navigation → must pass

**Escalation:** If complex focus management needed (e.g., multi-step wizard,
nested modals) → request Accessibility Specialist (13) guidance.

### Verification

**Pre-Merge (PR/Review Agent):**

- [ ] All interactive elements reachable via Tab
- [ ] Enter activates buttons/links
- [ ] Esc closes modals/toasts
- [ ] Arrow keys navigate lists/tabs (where applicable)
- [ ] Focus visible at all times
- [ ] Focus order is logical

**Post-Sprint Audit (Accessibility Specialist):**

- [ ] Full keyboard-only test on all 8 screens
- [ ] Screen reader test (NVDA/VoiceOver) confirms focus announcements correct

---

## GUARDRAIL G-UXD-06 — SSE Reconnection Reliability

**Scope:** All screens with real-time updates  
**Severity:** CRITICAL  
**Addresses:** RISK-UXD-002 (UI flicker), Recommendation 03

### Rule

SSE (Server-Sent Events) client MUST successfully reconnect within 30 seconds of
network restoration in ≥ 95% of disconnect scenarios. Full-state resync MUST
occur on reconnect to prevent stale data.

**Required Behavior:**

1. **Exponential Backoff:** 1s, 2s, 4s, 8s, 16s, max 30s between retry attempts
2. **Max Retries:** 10 attempts → if all fail, show "Connection Lost" modal
3. **Heartbeat Detection:** Server sends heartbeat every 30s; client detects
   missing heartbeat (45s timeout) → trigger reconnection
4. **Full-State Resync:** On reconnect, client fetches full state via GET
   /api/session (prevents missing events during disconnect)
5. **Event Deduplication:** Track last 100 `event_id`s → ignore duplicates
6. **User Feedback:**
   - Disconnect: Toast "Connection lost. Reconnecting..." (yellow, no
     auto-dismiss)
   - Reconnect: Toast "Connection restored." (green, auto-dismiss 3s)
   - Permanent failure: Modal "Connection Lost" with [Retry Now] [Refresh Page]
     [Report Issue]

### Detection Criteria

**Automated Test (Playwright with Network Throttling):**

```javascript
test('SSE reconnects within 30s of network restore', async ({ page }) => {
  await page.goto('/dashboard');

  // Verify initial connection
  await page.waitForSelector(
    '[data-testid="connection-status"][data-status="connected"]'
  );

  // Simulate network loss
  await page.route('**/api/events', (route) => route.abort());

  // Wait for disconnect detection (heartbeat timeout: 45s)
  await page.waitForSelector('[data-testid="toast"][data-type="warning"]', {
    timeout: 50000,
  });
  expect(await page.textContent('[data-testid="toast"]')).toContain(
    'Connection lost'
  );

  // Restore network
  await page.unroute('**/api/events');

  // Verify reconnection within 30s
  await page.waitForSelector(
    '[data-testid="connection-status"][data-status="connected"]',
    { timeout: 30000 }
  );
  await page.waitForSelector('[data-testid="toast"][data-type="success"]');
  expect(await page.textContent('[data-testid="toast"]')).toContain(
    'Connection restored'
  );
});
```

**Manual Test (PR/Review Agent):**

1. Open Dashboard in browser DevTools
2. Go to Network tab → right-click → "Block request URL" → enter `**/api/events`
3. Wait 45s → verify yellow toast appears: "Connection lost. Reconnecting..."
4. Unblock `**/api/events`
5. Verify within 30s: green toast "Connection restored."
6. Verify Dashboard data is up-to-date (check phase status, activity feed)

### Violation Example

```javascript
// ❌ VIOLATION: Fixed 5s retry interval (no exponential backoff)
let retryDelay = 5000;
function reconnect() {
  setTimeout(() => connectSSE(), retryDelay);
}

// ✅ CORRECT: Exponential backoff
let retryCount = 0;
function reconnect() {
  const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
  retryCount++;
  if (retryCount > 10) {
    showConnectionLostModal();
    return;
  }
  setTimeout(() => connectSSE(), delay);
}
```

### Corrective Action

**If Violation Detected:**

1. Automated test fails → PR blocked
2. Implementation Agent reviews SSE client code:
   - Verify exponential backoff logic
   - Verify heartbeat detection (45s timeout)
   - Verify full-state resync on reconnect (GET /api/session called)
   - Verify event deduplication (check `event_id` tracking)
3. Fix violations
4. Re-run automated test → must pass

**If Reconnection Success Rate < 95%:**

- Investigate root cause (server-side SSE issues? Client-side bugs?)
- Document findings in `docs/technical-manual.md`
- Escalate to Senior Developer (06) if server-side issue

### Verification

**Pre-Merge (PR/Review Agent):**

- [ ] Automated test passes (reconnection within 30s)
- [ ] Manual test passes (disconnect → reconnect → data up-to-date)
- [ ] Exponential backoff verified in code review
- [ ] Full-state resync verified (GET /api/session called on reconnect)

**Post-Sprint Audit (KPI Agent):**

- [ ] Check analytics-events.json: calculate reconnection success rate
- [ ] Success rate ≥ 95% (success = reconnected within 30s of network restore)
- [ ] If < 95% → escalate to retrospective

---

## GUARDRAIL G-UXD-07 — Secret Exposure Prevention

**Scope:** All user input fields (Questionnaires, Decisions, modals)  
**Severity:** CRITICAL (security vulnerability)  
**Addresses:** Questionnaire Guardrail G-QUEST-20, Security Architect
requirements

### Rule

User-facing input fields MUST validate in real-time for sensitive data patterns.
If secrets detected, MUST show warning and prevent save until removed.

**Secret Patterns (Regex):**

1. `password` (case-insensitive)
2. `api_key`, `apikey`, `api-key`
3. `secret`, `token`, `auth`
4. AWS Access Key: `AKIA[0-9A-Z]{16}`
5. GitHub Token: `gh[ps]_[a-zA-Z0-9]{36}`
6. OpenAI API Key: `sk-[a-zA-Z0-9]{48}`
7. Credit card numbers: `\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b`
8. Email + password patterns: `password:\s*\S+`

**Validation Behavior:**

- **Debounced:** 500ms after typing stops
- **Inline Warning:** Red text below input: "⚠ Secret detected. Remove sensitive
  data (API keys, passwords, tokens)."
- **Save Blocked:** Save button disabled while warning present
- **Analytics:** Log `secret_detected` event to analytics-events.json (for
  awareness, not capture)

### Detection Criteria

**Automated Test (Unit Test):**

```javascript
test('Secret detection triggers warning', () => {
  render(<QuestionnaireInput />);
  const textarea = screen.getByRole('textbox');

  // Type answer with password
  fireEvent.change(textarea, { target: { value: 'My password is abc123' } });

  // Wait for debounce (500ms)
  await waitFor(() => {
    expect(screen.getByText(/Secret detected/i)).toBeInTheDocument();
  }, { timeout: 600 });

  // Verify save button disabled
  expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
});
```

**Manual Test (PR/Review Agent):**

1. Open Questionnaires tab
2. Type answer: "My AWS key is AKIAIOSFODNN7EXAMPLE"
3. Wait 500ms
4. Verify warning appears: "⚠ Secret detected..."
5. Verify save button disabled
6. Remove secret → warning disappears, save button enabled

### Violation Example

```tsx
// ❌ VIOLATION: No secret detection
<textarea onChange={handleChange} />
<button onClick={handleSave}>Save</button>

// ✅ CORRECT: Secret detection with validation
const [answer, setAnswer] = useState('');
const [secretDetected, setSecretDetected] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => {
    const hasSecret = /password|api_key|AKIA[0-9A-Z]{16}/i.test(answer);
    setSecretDetected(hasSecret);
    if (hasSecret) {
      logAnalyticsEvent({ type: 'secret_detected', field: 'questionnaire_answer' });
    }
  }, 500);
  return () => clearTimeout(timer);
}, [answer]);

<textarea value={answer} onChange={(e) => setAnswer(e.target.value)} />
{secretDetected && <p className="text-red-600">⚠ Secret detected...</p>}
<button onClick={handleSave} disabled={secretDetected}>Save</button>
```

### Corrective Action

**If Violation Detected:**

1. Code review identifies missing validation → PR blocked
2. Implementation Agent adds secret detection logic:
   - Import `detectSecrets` util from `middleware.js` (already exists in
     server.js)
   - Apply to all user input fields (questionnaire answers, decision fields, any
     textarea/input)
   - Add warning UI + save button disable logic
3. Add unit test for secret detection
4. Re-submit PR

**If Secret Accidentally Saved:**

- Immediate remediation: Delete answer from file, rewrite git history (BFG
  Repo-Cleaner)
- Escalate to Security Architect (08)
- Document incident in `.github/docs/security/incidents.md`
- Mark as `LESSON_CANDIDATE` in retrospective

### Verification

**Pre-Merge (PR/Review Agent):**

- [ ] All user input fields have secret detection (questionnaire answers,
      decision fields, modals)
- [ ] Unit tests pass for secret detection
- [ ] Manual test: type secret → warning appears, save blocked

**Post-Sprint Audit (Security Architect):**

- [ ] Scan all committed questionnaire answers for secret patterns (should be 0
      matches)
- [ ] Review analytics-events.json for `secret_detected` events (indicates
      prevention working)

---

## ENFORCEMENT SUMMARY

| Guardrail                                  | Severity | Enforced By                   | Violation Action |
| ------------------------------------------ | -------- | ----------------------------- | ---------------- |
| G-UXD-01: Storybook Component Contract     | CRITICAL | PR/Review Agent + ESLint      | Block PR         |
| G-UXD-02: Component Inventory Freshness    | HIGH     | PR/Review Agent + Sprint Gate | Block PR         |
| G-UXD-03: Lighthouse Performance Threshold | HIGH     | Lighthouse CI                 | Block PR         |
| G-UXD-04: Accessibility WCAG AA Minimum    | CRITICAL | axe-core + Lighthouse CI      | Block PR         |
| G-UXD-05: Keyboard Navigation Completeness | HIGH     | Manual Test + Playwright      | Block PR         |
| G-UXD-06: SSE Reconnection Reliability     | CRITICAL | Playwright Network Throttling | Block PR         |
| G-UXD-07: Secret Exposure Prevention       | CRITICAL | Unit Test + Manual Test       | Block PR         |

**Zero-Tolerance Violations (Auto-block):**

- G-UXD-01 (ad-hoc UI code)
- G-UXD-04 (accessibility violations)
- G-UXD-06 (SSE reconnection failure)
- G-UXD-07 (secret detection missing)

**Approval-Required Violations (Escalation):**

- G-UXD-03 (performance below threshold): Must document exception + approval
  from Orchestrator
- G-UXD-05 (keyboard navigation incomplete): May defer to Accessibility
  Specialist for complex cases

---

## HANDOFF CHECKLIST

- [x] All 7 guardrails defined with clear rules
- [x] Detection criteria specified (automated + manual)
- [x] Violation examples provided
- [x] Corrective actions documented
- [x] Verification checklists per guardrail
- [x] Enforcement summary table created
- [x] All guardrails address high/critical risks from Analysis
- [x] All guardrails traceable to recommendations or UX Researcher risks
- [x] Output complies with guardrails-output-contract.md
- [x] Deliverable written to file
      `.github/docs/phase-3/11-ux-designer-guardrails.md`

**Status:** READY  
**Next Agent:** 12-ui-designer (Agent 12 — UI Designer)

---

**SOURCE CITATIONS:**

- UX Designer Analysis: `.github/docs/phase-3/11-ux-designer-analysis.md` (gaps,
  risks, assumptions)
- UX Designer Recommendations:
  `.github/docs/phase-3/11-ux-designer-recommendations.md`
- UX Researcher: `.github/docs/phase-3/10-ux-researcher-analysis.md`
  (RISK-UX-005 accessibility)
- Phase 2: `.github/docs/phase-2/08-security-architect-analysis.md` (secret
  detection requirements)
- Contracts: `.github/docs/contracts/guardrails-output-contract.md`
- Guardrails: `.github/docs/guardrails/04-ux-guardrails.md`,
  `.github/docs/guardrails/00-global-guardrails.md`,
  `.github/docs/guardrails/09-questionnaire-guardrails.md` (G-QUEST-20)
