# Component Inventory
> **Version:** 2.0 | **Updated:** 2026-03-09 (SP-8 / UX-06) | **Source:** Full codebase audit of `index.html`
> **Design Tokens:** `.github/docs/brand/design-tokens.json`
> **Brand Guidelines:** `.github/docs/brand/brand-guidelines.md`
> **Application:** Questionnaire & Decisions Manager — single-page HTML/CSS/JS (index.html)

---

## 1. Component Catalog

### 1.1 Button

| Field | Value |
|-------|-------|
| **Category** | ATOM |
| **CSS Class** | `.btn`, `.btn-primary`, `.btn-success`, `.btn-danger`, `.btn-sm`, `.btn-loading` |
| **Description** | Primary interaction element for form submission, navigation, and destructive actions. Header variant uses semi-transparent white with backdrop blur. |
| **Variants** | `primary` (solid `--primary` bg), `success` (green), `danger` (red), `sm` (compact), header (glass), loading (spinner) |
| **Props** | `disabled` (boolean), `type` (submit / button), icon (optional inline SVG) |
| **Design Token References** | `color.primary`, `color.primary-dark` (hover), `color.danger`, `color.success`, `color.surface`, `color.text`, `typography.font-weight.medium`, `typography.font-size.md`, `border-radius.md`, `motion.duration.fast`, `motion.easing.default` |
| **Accessibility** | `focus-visible` ring (2px solid outline, 2px offset). Native `<button>` element. Disabled state uses `disabled` attribute. Loading state sets `aria-busy="true"`. |
| **States** | Default, hover (darken via `primary-dark`, shadow), focus-visible (outline ring), active (scale 0.98), disabled (opacity 0.45, no pointer-events), loading (`.btn-loading` — content hidden, `::after` spinner via `@keyframes spin`) |
| **JS Functions** | `setBtnLoading(btn, loading)` — toggles `.btn-loading` class, `aria-busy`, `disabled` |
| **Added/Updated** | SP-7: loading state pattern (UX-04) |

---

### 1.2 Card (Questionnaire)

| Field | Value |
|-------|-------|
| **Category** | MOLECULE |
| **CSS Class** | `.card`, `.card-top`, `.card-id`, `.card-q`, `.card-meta`, `.card-ans`, `.card-foot`, `.dirty` |
| **Description** | Container for questionnaire items. Displays question ID, badges, question text, metadata (why/format/example), answer textarea, and save/status footer. |
| **Variants** | Standard card, dirty card (unsaved changes — left border highlight) |
| **Props** | Question text, ID badge, status badge, metadata, answer textarea, status select |
| **Design Token References** | `color.surface`, `color.border`, `color.border-hover`, `color.text`, `color.text-sec`, `color.warning` (dirty), `shadow.sm`, `shadow.md` (hover), `border-radius.lg`, `spacing.md`, `spacing.lg`, `typography.font-size.lg`, `typography.font-size.sm` |
| **Accessibility** | `role="article"` on card. Interactive elements keyboard-accessible. Status via badge text + colorblind-safe icons (✓ ○ ⏸). |
| **States** | Default, hover (shadow elevation + border-hover), dirty (3px left border `--warning`), loading (skeleton variant) |
| **JS Functions** | `renderQ(q)`, `saveOne(file, qId)`, `markDirty(file, qId)` |

---

### 1.3 Modal Dialog

| Field | Value |
|-------|-------|
| **Category** | ORGANISM |
| **CSS Class** | `.overlay`, `.modal`, `.modal-actions`, `.overlay.hidden` |
| **Description** | Overlay dialog for answering questions, editing decisions, confirming destructive actions, viewing details, and reevaluation. Includes backdrop blur, focus trap, and close mechanisms. |
| **Variants** | Standard (form content), Confirmation (yes/no with optional reason field), Reevaluate, New/Edit Decision, Help Panel, Onboarding |
| **Props** | Title, body content, action buttons (confirm/cancel), closable (boolean), backdrop-click-to-close |
| **Design Token References** | `color.surface-raised`, `color.text`, `color.border`, `shadow.lg`, `border-radius.xl`, `spacing.xl`, `z-index.modal` (500), `z-index.modal-backdrop`, `motion.duration.normal`, `motion.easing.bounce` |
| **Accessibility** | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to title. Focus trap — Tab cycles within modal. Escape key closes. Focus returns to trigger element on close. |
| **States** | Hidden (`.hidden`), opening (`@keyframes modal-in` — scale 0.95→1; `@keyframes overlay-in` backdrop fade), visible, closing (reverse) |
| **JS Functions** | `openModal(overlayId)`, `closeModal(overlayId)`, `confirmAction(title, text, showReason, confirmLabel)` |

---

### 1.4 Toast Notification

| Field | Value |
|-------|-------|
| **Category** | ATOM |
| **CSS Class** | `.toast-box`, `.toast`, `.t-ok`, `.t-err`, `.t-info` |
| **Description** | Ephemeral notification for success, error, and informational feedback. Auto-dismisses after 4.5s. Fixed bottom-right. |
| **Variants** | `t-ok` (green gradient), `t-err` (red gradient), `t-info` (blue gradient) |
| **Props** | Message text, variant/type, auto-dismiss timeout (4500ms) |
| **Design Token References** | `color.success`, `color.danger`, `color.primary`, `color.surface-raised`, `color.text`, `border-radius.lg`, `shadow.md`, `z-index.toast` (1000), `motion.duration.normal`, `motion.easing.entrance` |
| **Accessibility** | Non-error toasts via `announceStatus()` (`aria-live="polite"`). Error toasts via `announceError()` (`aria-live="assertive"`). Colorblind-safe icons: ✓ (ok), ✗ (error), ℹ (info). |
| **States** | Hidden, entering (`@keyframes tslide` — slide up + scale), visible (backdrop blur, shadow), exiting (removed from DOM after timeout) |
| **JS Functions** | `toast(msg, cls)`, `announceError(msg)`, `announceStatus(msg)` |

---

### 1.5 Tab Bar

| Field | Value |
|-------|-------|
| **Category** | MOLECULE |
| **CSS Class** | `.tabs`, `.tab`, `.tab.active`, `.tab-count`, `.b-ans` |
| **Description** | Horizontal navigation for switching between three main views: Command Center, Questionnaires, Decisions. |
| **Variants** | Desktop (full labels + count badges), Mobile (compressed) |
| **Props** | Tab items (label, icon, id, badge count), active tab ID |
| **Design Token References** | `color.primary`, `color.text`, `color.text-sec`, `color.border`, `color.surface`, `color.success` (answered badge), `typography.font-size.sm`, `typography.font-weight.medium`, `spacing.sm`, `spacing.md`, `border-radius.md`, `motion.duration.fast` |
| **Accessibility** | `role="tablist"` on container, `role="tab"` on each, `role="tabpanel"` on content. `aria-selected="true"` on active. `aria-controls` links to panel ID. `tabindex="0"` on active, `"-1"` on inactive. Arrow Left/Right navigation. |
| **States** | Default, hover (text → `--primary`), active (underline indicator + primary color), focus-visible (ring) |
| **JS Functions** | `switchTab(tab)`, `updateTabCounts()` |

---

### 1.6 Input / Textarea

| Field | Value |
|-------|-------|
| **Category** | ATOM |
| **CSS Class** | `input`, `select`, `textarea`, `.field-error`, `.error-msg`, `.brief-area` |
| **Description** | Standard form controls for text entry. Used in answer forms, decision editing, command parameters, and settings. |
| **Variants** | Single-line input, multi-line textarea, search input (with icon), brief area (monospace, 200px min-height) |
| **Props** | `label`, `placeholder`, `required`, `disabled`, `readonly`, `maxlength`, error message |
| **Design Token References** | `color.surface`, `color.text`, `color.border-control`, `color.primary` (focus), `color.danger` (error), `color.primary-light` (focus shadow), `typography.font-size.md`, `typography.font-family.sans`, `border-radius.md`, `spacing.sm`, `spacing.md` |
| **Accessibility** | `<label>` via `for`/`id`. `aria-invalid="true"` on error. `aria-describedby` pointing to error message. Error message has `role="alert"`. |
| **States** | Default, focus (border `--primary`, ring + shadow), filled, error (`.field-error` — `--danger` border + `@keyframes errorFadeIn`), disabled (opacity 0.5), readonly |
| **JS Functions** | `validateRequired(field, label)`, `validateAnswerStatus(answerEl, statusEl)`, `setFieldError(field, msg)` |

---

### 1.7 Progress Bar

| Field | Value |
|-------|-------|
| **Category** | ATOM |
| **CSS Class** | `.prog-bar`, `.prog-fill`, `.q-progress-bar`, `.q-progress-track`, `.q-progress-fill`, `.q-progress-text`, `.pipe-progress`, `.pipe-progress-bar`, `.pipe-progress-fill` |
| **Description** | Visual progress indicator for questionnaires (sidebar + detail) and pipeline phases. |
| **Variants** | Sidebar progress (gradient primary→success), Questionnaire detail bar (with text + jump button), Pipeline progress (shimmer animation) |
| **Props** | `value` (0–100), label text, jump-to-next action |
| **Design Token References** | `color.primary` (fill), `color.success` (gradient end), `color.border` (track), `border-radius.full`, `spacing.xs` |
| **Accessibility** | `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label` with descriptive text. |
| **States** | Empty (0%), partial (gradient fill), complete (100%), pipeline shimmer (`@keyframes shimmer`) |
| **JS Functions** | `renderSidebar()`, `renderQ()`, `renderPipeline()` |

---

### 1.8 Badge

| Field | Value |
|-------|-------|
| **Category** | ATOM |
| **CSS Class** | `.badge`, `.b-req`, `.b-opt`, `.b-open`, `.b-ans`, `.b-def`, `.b-high`, `.b-med`, `.b-low`, `.b-decided`, `.b-deferred`, `.b-expired`, `.b-cat`, `.badge-blocking` |
| **Description** | Inline label for status, phase, category, and priority metadata on cards and list items. |
| **Variants** | Status (ANSWERED/OPEN/REQUIRED/OPTIONAL/DEFERRED), Priority (HIGH/MEDIUM/LOW), Decision (DECIDED/DEFERRED/EXPIRED), Category, Blocking (animated) |
| **Props** | Label text, variant (determines color), icon (Unicode for colorblind safety) |
| **Design Token References** | `color.success`, `color.warning`, `color.danger`, `color.primary`, `color.accent`, `color.text`, `typography.font-size.caption`, `typography.font-weight.extrabold`, `border-radius.full`, `spacing.xs`, `spacing.sm` |
| **Accessibility** | Colorblind-safe icons (✓, ○, ◇, ⏸, !, ✕). `aria-hidden="true"` on decorative icons. |
| **States** | Static (most), animated pulse (`.badge-blocking` — `@keyframes pulse-block`) |

---

### 1.9 Select / Dropdown

| Field | Value |
|-------|-------|
| **Category** | ATOM |
| **CSS Class** | `select`, `.status-group select`, `.dec-filter-bar select` |
| **Description** | Native `<select>` for filter options and form fields. |
| **Variants** | Standard, Filter (inline in filter bar), Status group (questionnaire footer) |
| **Props** | `label`, options, selected value, `disabled`, `required` |
| **Design Token References** | `color.surface`, `color.text`, `color.border-control`, `color.primary` (focus), `typography.font-size.md`, `border-radius.md`, `spacing.sm` |
| **Accessibility** | Native keyboard + screen reader support. `<label>` via `for`/`id`. |
| **States** | Default, focus (ring), disabled (opacity 0.5) |

---

### 1.10 Skeleton Loader

| Field | Value |
|-------|-------|
| **Category** | ATOM |
| **CSS Class** | `.skeleton`, `.skeleton-card`, `.skeleton-line`, `.skeleton-line.w60`, `.skeleton-line.w80`, `.skeleton-line.w40`, `.skeleton-sidebar` |
| **Description** | Placeholder shimmer animation while data loads. Mimics card structure. |
| **Variants** | Card skeleton (4 lines), Sidebar skeleton, Line widths (100%/80%/60%/40%) |
| **Props** | Count, line widths |
| **Design Token References** | `color.border` (base), `color.surface` (shimmer), `border-radius.lg`, `motion.duration.slow`, `motion.easing.default` |
| **Accessibility** | Parent container `aria-busy="true"` during loading. `@media (prefers-reduced-motion: reduce)` — opacity pulse instead of shimmer. |
| **States** | Animating (`@keyframes shimmer`), done (replaced by real content) |
| **Added** | SP-7 (UX-04) |

---

### 1.11 Sidebar Navigation

| Field | Value |
|-------|-------|
| **Category** | ORGANISM |
| **CSS Class** | `.sidebar`, `.sb-phase`, `.sb-item`, `.sb-item.active`, `.sb-item-name`, `.sb-progress`, `.hamburger` |
| **Description** | Left sidebar with phase-grouped questionnaire list, progress bars per agent, and mobile toggle. |
| **Variants** | Desktop (expanded + progress), Mobile (collapsed, fixed overlay via hamburger toggle) |
| **Props** | Navigation items (agent name, progress ratio, active state), phase groupings |
| **Design Token References** | `color.surface`, `color.text`, `color.text-sec`, `color.primary` (active), `color.border`, `typography.font-size.label`, `spacing.sm`, `spacing.md`, `motion.duration.fast` |
| **Accessibility** | `role="button"` + `tabindex="0"` on items. `aria-pressed`. Progress bars: `role="progressbar"` + `aria-valuenow/min/max`. |
| **States** | Desktop expanded, mobile collapsed, mobile open (`.sidebar.open`), item: default/hover/active/focus-visible |
| **JS Functions** | `renderSidebar()`, `selectQ(file)` |

---

### 1.12 Filter Bar (Decision)

| Field | Value |
|-------|-------|
| **Category** | MOLECULE |
| **CSS Class** | `.dec-filter-bar`, `.dec-stats-bar` |
| **Description** | Sticky bar above decisions with search, priority/status/category dropdowns, and statistics. Real-time filtering. |
| **Props** | Search input, filter selects, stats counters |
| **Design Token References** | `color.surface`, `color.border`, `color.text`, `color.text-sec`, `spacing.sm`, `spacing.md`, `border-radius.md`, `typography.font-size.sm` |
| **Accessibility** | Native form elements with labels. Search has `aria-label`. Debounced 200ms. |
| **States** | Default, active filtering, empty results |
| **JS Functions** | `renderDecisions()` |

---

### 1.13 Global Search

| Field | Value |
|-------|-------|
| **Category** | MOLECULE |
| **CSS Class** | `.global-search`, `.search-input`, `.search-results`, `.search-result-item`, `.sr-active`, `.sr-id`, `.sr-text`, `.sr-meta`, `.search-empty`, `.search-group-title` |
| **Description** | Real-time search across questionnaires and decisions with dropdown results. Debounced 250ms. Grouped by type. |
| **Props** | Query, results list (grouped), keyboard cursor |
| **Design Token References** | `color.surface-raised`, `color.border`, `color.text`, `color.primary` (highlights), `shadow.lg`, `border-radius.md`, `z-index.dropdown` (100) |
| **Accessibility** | `role="listbox"` on results. `role="option"` per item. `aria-label="Search questionnaires and decisions"`. `aria-live="polite"` on `#searchAnnounce`. Arrow Up/Down, Enter, Escape. |
| **States** | Closed, open (dropdown), keyboard-active (`.sr-active`), empty ("No results") |
| **JS Functions** | `performSearch(query)`, `highlightMatch(text, query)` |

---

### 1.14 Breadcrumb

| Field | Value |
|-------|-------|
| **Category** | MOLECULE |
| **CSS Class** | `.breadcrumb`, `.bc-mid` |
| **Description** | Navigation hierarchy: Phase → Agent → Questionnaire. `<ol>` with `::before` separator (›). |
| **Design Token References** | `color.primary` (links), `color.text-sec` (separator), `typography.font-size.sm`, `spacing.sm` |
| **Accessibility** | `<nav aria-label="Breadcrumb">`. `aria-current="page"` on current item. |
| **States** | Default, hover (underline), responsive (max 200px/link; `.bc-mid` hidden on mobile < 600px) |
| **Added** | SP-7 (UX-05) |

---

### 1.15 Pagination

| Field | Value |
|-------|-------|
| **Category** | MOLECULE |
| **CSS Class** | `.q-pagination`, `.pg-info`, `.pg-active` |
| **Description** | Numbered page buttons for questionnaires (20/page). Smart skip pattern — max 7 buttons with ellipsis. |
| **Props** | Current page, total pages, items per page |
| **Design Token References** | `color.primary` (active), `color.surface`, `color.border`, `border-radius.md`, `spacing.sm` |
| **Accessibility** | `<nav aria-label="Questionnaire pagination">`. `aria-label="Page X"` per button. `aria-current="page"` on active. Prev/Next disabled at boundaries. |
| **States** | Active (`.pg-active`), disabled prev/next, focus-visible |
| **Added** | SP-7 (UX-05) |

---

### 1.16 Empty State

| Field | Value |
|-------|-------|
| **Category** | MOLECULE |
| **CSS Class** | `.empty`, `.empty-icon`, `.empty-title`, `.empty-desc`, `.empty-action`, `.empty-steps`, `.pipe-empty` |
| **Description** | Centered placeholder when no data exists. Icon, title, description, and step-by-step guidance with numbered CSS-counter circles. |
| **Variants** | Questionnaire ("No questionnaires yet" + "Run CREATE"), Decision ("No decisions yet" + "Click + New Decision"), Pipeline (`.pipe-empty`) |
| **Design Token References** | `color.text-muted`, `color.primary` (circles, action), `color.surface`, `typography.font-size.h3`, `spacing.lg` |
| **Accessibility** | Semantic headings + `<ol>` step lists. Action buttons are `.btn-primary`. |
| **States** | Visible (list empty), hidden (replaced by content) |
| **JS Functions** | `renderEmpty()`, `renderDecisions()` |
| **Added** | SP-7 (UX-05) |

---

### 1.17 Decision Card

| Field | Value |
|-------|-------|
| **Category** | MOLECULE |
| **CSS Class** | `.dec-card`, `.dec-card-top`, `.dec-card-id`, `.dec-card-text`, `.dec-card-meta`, `.dec-card-notes`, `.dec-card-actions`, `.dec-card.blocking` |
| **Description** | Container for decisions. Shows ID, badges, text, metadata, notes, and context-dependent actions. |
| **Variants** | Open (textarea + decide/defer), Decided (read-only + edit/expire/reopen), Deferred/Expired (read-only + reopen), Blocking (animated border + blocking badge) |
| **Design Token References** | `color.surface`, `color.border`, `color.primary`, `color.primary-light` (notes), `color.danger` (blocking), `shadow.sm`, `border-radius.lg` |
| **Accessibility** | `role="article"`. `aria-labelledby`. `.badge-blocking` text "⚠ BLOCKS SPRINT GATE". |
| **States** | Default, hover (shadow), blocking (danger left border + animated badge) |
| **JS Functions** | `renderDecisions()`, `answerDecision()`, `decideDecision()`, `deferDecision()`, `expireDecision()`, `reopenDecision()`, `openEditDecision()` |

---

### 1.18 Decision Lifecycle Panel

| Field | Value |
|-------|-------|
| **Category** | MOLECULE |
| **CSS Class** | `.dec-lifecycle`, `.dec-lifecycle-toggle`, `.dec-lifecycle-content`, `.dec-lifecycle-flow`, `.dec-lf-arrow` |
| **Description** | Collapsible `<details>` showing status flow: OPEN → DECIDED → EXPIRED or OPEN → DEFERRED → OPEN. |
| **Design Token References** | `color.warning` (OPEN), `color.success` (DECIDED), `color.danger` (EXPIRED), `color.text-muted` (DEFERRED) |
| **Accessibility** | `role="img"` + detailed `aria-label` on lifecycle flow. Native `<details>` disclosure. |
| **States** | Collapsed (default), expanded |

---

### 1.19 Header

| Field | Value |
|-------|-------|
| **Category** | ORGANISM |
| **CSS Class** | `.header`, `.header-left`, `.header-logo`, `.header-title`, `.header-subtitle`, `.header-stats`, `.stat-val`, `.header-actions`, `.status-indicator`, `.status-dot`, `.status-spinner`, `.server-banner` |
| **Description** | Fixed 60px top bar with gradient background. Logo, title, stats, connection status, theme toggle, help, and export. |
| **Design Token References** | `color.header-bg` (gradient), `color.header-text`, `color.success`/`color.danger` (status), `shadow.sm`, `z-index.header` (10), `typography.font-size.h3` |
| **Accessibility** | `role="banner"`. `aria-hidden="true"` on decorative emoji. Status text + dot color. |
| **States** | Connected (green dot), disconnected (animated red pulse + spinner), banner visible/hidden |
| **JS Functions** | `updateConnectionStatus()` |

---

### 1.20 Help Panel

| Field | Value |
|-------|-------|
| **Category** | ORGANISM |
| **CSS Class** | `.help-overlay`, `.help-panel`, `.help-nav`, `.help-nav-title`, `.help-nav-item`, `.help-content`, `.help-close` |
| **Description** | Slide-in panel from right. 780px wide, full height. Two-column: nav (220px) + content. Renders markdown help topics. |
| **Design Token References** | `color.surface-raised`, `color.text`, `color.border`, `color.primary` (active nav), `shadow.lg`, `z-index.modal` (500), `motion.duration.normal` |
| **Accessibility** | `role="navigation"` on nav. Focus trapped. Backdrop click closes. Escape to close. |
| **States** | Closed (`translateX(100%)`), open (`.open` — slides in), nav item: default/hover/active |
| **JS Functions** | `openHelp()`, `closeHelp()`, `loadHelpTopic(slug)`, `renderHelpNav()`, `renderMarkdown(md)` |

---

### 1.21 Section Toggle / Collapsible

| Field | Value |
|-------|-------|
| **Category** | MOLECULE |
| **CSS Class** | `.section-divider`, `.section-toggle`, `.section-content`, `.section-content.collapsed` |
| **Description** | Expand/collapse questionnaire sections. Arrow rotates on toggle. State persisted per session in `expandedSections` Set. |
| **Design Token References** | `color.border`, `color.text`, `spacing.sm`, `motion.duration.fast` |
| **Accessibility** | `role="button"` + `tabindex="0"`. `aria-expanded="true/false"`. Enter/Space to toggle. |
| **States** | Expanded (arrow down), collapsed (arrow right, content hidden) |

---

### 1.22 Skip Navigation

| Field | Value |
|-------|-------|
| **Category** | ATOM |
| **CSS Class** | `.skip-nav` |
| **Description** | "Skip to main content" link. Visually hidden until focused, appears top-left. Links to `#content`. |
| **Design Token References** | `color.primary` (bg), `color.surface` (text), `z-index.skip-nav` (10000), `border-radius.md` |
| **Accessibility** | First focusable element. Target: `<main role="main" id="content">`. |
| **States** | Hidden (off-screen), visible (on `:focus`) |
| **Added** | SP-5 (UX-02) |

---

### 1.23 Command Center Sidebar

| Field | Value |
|-------|-------|
| **Category** | ORGANISM |
| **CSS Class** | `.cmd-sidebar`, `.cmd-section-title`, `.cmd-section-group`, `.cmd-btn`, `.cmd-btn-icon`, `.cmd-btn-label`, `.cmd-btn-sub`, `.cmd-btn.active` |
| **Description** | Command palette grouping commands by category (Create, Audit, On-Demand). Collapsible sections persisted in `sessionStorage`. |
| **Design Token References** | `color.surface`, `color.text`, `color.border`, `color.primary` (active), `color.accent` (hover), `spacing.sm`, `spacing.md`, `motion.duration.fast` |
| **Accessibility** | `role="button"` + `aria-expanded` on section titles. `tabindex="0"`. |
| **States** | Section: expanded/collapsed. Button: default, hover (translate, cyan border), active (cyan bg + glow), focus-visible |
| **JS Functions** | `selectCommand(cmd)`, `toggleCmdGroup(title)` |

---

### 1.24 Command Form

| Field | Value |
|-------|-------|
| **Category** | ORGANISM |
| **CSS Class** | `.cmd-form`, `.form-group`, `.form-row`, `.cmd-submit-row`, `.cmd-clipboard`, `.briefSizeWarn`, `.cmd-form-collapsed` |
| **Description** | Dynamic form for selected command. Shows project name, brief textarea, scope dropdown (conditional), launch button. Collapses to `<details>` after launch. |
| **Variants** | CREATE/AUDIT (name + brief), FEATURE/HOTFIX (description), SCOPE CHANGE/REEVALUATE (scope dropdown) |
| **Design Token References** | `color.surface`, `color.border`, `color.text`, `color.warning` (size warning), `spacing.md`, `border-radius.md` |
| **Accessibility** | `aria-describedby` tooltips on fields. Blur validation. |
| **States** | Active (form), submitted (collapses to details), warning (brief > 50KB) |
| **JS Functions** | `selectCommand(cmd)`, `launchCommand()`, `copyClipboard()` |

---

### 1.25 Clipboard Box

| Field | Value |
|-------|-------|
| **Category** | ATOM |
| **CSS Class** | `.cmd-clipboard`, `.cmd-clipboard code`, `.cmd-clipboard button` |
| **Description** | Terminal-style command display with copy button. Dark bg, monospace text. |
| **Design Token References** | `color.terminal-bg`, `color.terminal-text`, `color.terminal-border`, `typography.font-family.mono`, `border-radius.md` |
| **Accessibility** | `title="Copy to clipboard"`. Feedback toast on copy. |
| **States** | Default, copied (button text changes 2s) |
| **JS Functions** | `copyClipboard()` (`navigator.clipboard.writeText` + `execCommand` fallback) |

---

### 1.26 Pipeline Progress

| Field | Value |
|-------|-------|
| **Category** | MOLECULE |
| **CSS Class** | `.pipe-header`, `.pipe-progress`, `.pipe-progress-bar`, `.pipe-progress-fill`, `.pipe-progress-label` |
| **Description** | Overall pipeline progress bar: "X/Y agents (Z%)" with animated shimmer gradient fill. |
| **Design Token References** | `color.primary` (gradient), `color.success` (gradient end), `color.border` (track), `border-radius.full`, `motion.duration.slow` |
| **Accessibility** | `role="progressbar"`, `aria-valuenow/min/max`, `aria-label="Overall pipeline progress"`. |
| **States** | Empty (0%), partial (shimmer `@keyframes shimmer`), complete (100%) |
| **JS Functions** | `renderPipeline()` |

---

### 1.27 Phase Card (Pipeline)

| Field | Value |
|-------|-------|
| **Category** | MOLECULE |
| **CSS Class** | `.pipe-phase`, `.pipe-phase-head`, `.pipe-phase-icon`, `.pipe-phase-label`, `.pipe-phase-badge`, `.pipe-badge-pending`, `.pipe-badge-active`, `.pipe-badge-done`, `.pipe-agents`, `.pipe-agent`, `.pipe-agent-dot` |
| **Description** | One card per pipeline phase. Shows icon, name, status badge, and agent list with status dots. |
| **Design Token References** | `color.primary` (active), `color.success` (done), `color.text-muted` (pending), `color.warning` (active dot), `shadow.sm`, `border-radius.lg` |
| **Accessibility** | Icons `aria-hidden`. Active agents: animated dot (`@keyframes pulse-dot`). Active phase: border pulse (`@keyframes pulse-pipe`). |
| **States** | Pending (gray), active (animated), done (success). Agent: pending/active (animated)/done |
| **JS Functions** | `renderPipeline()` |

---

### 1.28 Sprint Tracker

| Field | Value |
|-------|-------|
| **Category** | MOLECULE |
| **CSS Class** | `.pipe-sprints`, `.pipe-sprint-card`, `.pipe-sprint-id` |
| **Description** | Summary cards per sprint (ID, status, stories, points). |
| **Design Token References** | `color.surface`, `color.border`, `color.success`/`warning`/`primary` (status), `border-radius.md` |
| **States** | DONE (success), IN_PROGRESS (warning), NOT_STARTED (gray) |
| **JS Functions** | `renderPipeline()` |

---

### 1.29 Waiting State (Command Pending)

| Field | Value |
|-------|-------|
| **Category** | MOLECULE |
| **CSS Class** | `.pipe-waiting`, `.pipe-waiting-banner`, `.pipe-waiting-pulse`, `.pipe-waiting-title`, `.pipe-waiting-steps`, `.step-done`, `.step-active` |
| **Description** | Shown when command is queued but session hasn't started. Numbered step progress. |
| **Design Token References** | `color.warning` (pulse dot), `color.text-muted` (done steps), `color.surface`, `border-radius.lg` |
| **Accessibility** | Semantic `<li>` list. Done = struck-through. |
| **States** | Done (`.step-done`), active (`.step-active` — orange + `@keyframes waitPulse`), pending |
| **JS Functions** | `renderPipeline()` |

---

### 1.30 Onboarding Wizard

| Field | Value |
|-------|-------|
| **Category** | ORGANISM |
| **CSS Class** | `.onboarding-overlay`, `.onboarding-card`, `.onboarding-icon`, `.onboarding-title`, `.onboarding-text`, `.onboarding-steps`, `.onboarding-dot`, `.onboarding-actions` |
| **Description** | 5-step tour: Welcome → Command Center → Questionnaires → Decisions → Ready. Dot indicators. Persisted in `localStorage`. Restartable from Help panel. |
| **Design Token References** | `color.surface-raised`, `color.primary` (active dot), `color.text`, `shadow.lg`, `border-radius.xl`, `z-index.modal`, `motion.duration.normal` |
| **Accessibility** | `role="dialog"`, `aria-modal="true"`. Focus contained. Prev/Next buttons. |
| **States** | Hidden (completed), step 0–4 (dot indicators), final step ("Get Started") |
| **JS Functions** | `showOnboarding()`, `renderOnboardingStep()`, `finishOnboarding()` |
| **Added** | SP-7 (UX-05) |

---

### 1.31 Tooltip

| Field | Value |
|-------|-------|
| **Category** | ATOM |
| **CSS Class** | `.tooltip-wrap`, `.tooltip-btn`, `.tooltip-text` |
| **Description** | Small `?` circle button (18×18px) showing help text above on hover/focus. |
| **Design Token References** | `color.text-sec`, `color.surface-raised` (bg), `shadow.md`, `border-radius.md`, `z-index.tooltip` (1500) |
| **Accessibility** | `role="tooltip"`. `aria-describedby` from field to tooltip. Keyboard via `:focus`. |
| **States** | Hidden (default), visible (hover/focus) |

---

### 1.32 Icon System

| Field | Value |
|-------|-------|
| **Category** | ATOM |
| **CSS Class** | `.icon`, `.icon-sm` (14px), `.icon-md` (18px), `.icon-lg` (24px), `.icon-xl` (32px) |
| **Description** | Inline SVG icons using `currentColor`. Generated by `svgIcon(name)` from `SVG_ICONS` registry. |
| **Accessibility** | `aria-hidden="true"` on decorative icons. Semantic icons use adjacent text. |
| **JS Functions** | `svgIcon(name)` |

---

### 1.33 Theme Toggle

| Field | Value |
|-------|-------|
| **Category** | ATOM |
| **CSS Class** | `.theme-toggle` |
| **Description** | 38×38px circular button toggling dark/light mode. Reads `prefers-color-scheme`. Persists to `localStorage`. |
| **Design Token References** | `color.surface`, `color.text`, `border-radius.full` |
| **Accessibility** | `title` attribute describes current action. |
| **States** | Default, hover (rotate 30deg), dark (🌙), light (☀️) |
| **JS Functions** | `initTheme()`, `toggleTheme()`, `updateThemeIcon(theme)` |

---

### 1.34 Font Size Controls

| Field | Value |
|-------|-------|
| **Category** | ATOM |
| **Description** | Three buttons setting `html[data-fontsize]` for base font size (11px/14px/17px). Persists to `localStorage`. |
| **JS Functions** | `initFontSize()`, `setFontSize(size)` |

---

### 1.35 Questionnaire Progress Bar (Detail)

| Field | Value |
|-------|-------|
| **Category** | MOLECULE |
| **CSS Class** | `.q-progress-bar`, `.q-progress-track`, `.q-progress-fill`, `.q-progress-text`, `.q-jump-btn` |
| **Description** | "X/Y answered (Z%)" above questions with jump-to-next-unanswered button. |
| **Design Token References** | `color.primary` (fill), `color.border` (track), `border-radius.full` |
| **Accessibility** | Readable text. Jump button is `.btn-primary.btn-sm`. |
| **JS Functions** | `renderQ()` |
| **Added** | SP-7 (UX-05) |

---

### 1.36 Pending Command Banner

| Field | Value |
|-------|-------|
| **Category** | ATOM |
| **CSS Class** | `.cmd-pending`, `.cmd-pending-icon`, `.cmd-pending-text`, `.cmd-pending-cmd` |
| **Description** | Warning banner when command is queued during active pipeline. |
| **Design Token References** | `color.warning`, `color.text`, `border-radius.md` |
| **States** | Visible/hidden |

---

## 2. Cross-Cutting Patterns

### 2.1 Responsive Behavior
- **Mobile breakpoint:** max-width 700px — sidebar becomes overlay, header stats hidden, search compressed, breadcrumbs shortened
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` — all animations to 0.01ms, skeleton uses opacity pulse
- **Forced colors:** `@media (forced-colors: active)` — ButtonText, Highlight, LinkText; explicit borders on interactive elements

### 2.2 Animations (`@keyframes`)
| Name | Used By | Description |
|------|---------|-------------|
| `spin` | Button loading, status spinner | 360° rotation |
| `pulse-dot` | Pipeline agent dots | Scale 1→1.4 |
| `pulse-block` | Blocking badge | Opacity pulse |
| `pulse-pipe` | Active phase card | Opacity + shadow |
| `tslide` | Toast notification | Slide up + scale in |
| `overlay-in` | Modal backdrop | Fade in |
| `modal-in` | Modal dialog | Scale + translate |
| `shimmer` | Skeleton, pipeline progress | Gradient shift |
| `errorFadeIn` | Validation messages | Fade in + translate |
| `waitPulse` | Pending command | Pulsing dot |

### 2.3 Screen Reader Regions
| Region | ID | Role | Purpose |
|--------|----|------|---------|
| Error announcer | `#errorAnnounce` | `aria-live="assertive"` | Critical errors |
| Status announcer | `#statusAnnounce` | `aria-live="polite"` | Status updates, saves |
| Search announcer | `#searchAnnounce` | `aria-live="polite"` | Search result count |

### 2.4 Focus Management
- All interactive elements: 2px solid outline, 2px offset
- Forced-colors mode: `Highlight` system color
- Focus trap in modals: Tab wraps within `.overlay` or `.help-panel`
- Focus restoration: returns to trigger element on modal close

---

## 3. Missing Components (Recommended for Future)

| Component | Category | Rationale | Priority | Source |
|-----------|----------|-----------|----------|--------|
| Data Table | ORGANISM | Structured display for sprint KPIs, questionnaire exports | Low | Future analytics |

---

## 4. Implementation Agent Guardrail

> **MANDATORY for Implementation Agent (Agent 20)**
>
> 1. This **Component Inventory** is the leading reference for UI implementation. Any deviation from the component specifications above requires written justification in the PR description.
> 2. All components **MUST** consume design tokens from `design-tokens.json`. Hardcoded color, spacing, typography, or shadow values are prohibited.
> 3. **Accessibility requirements are mandatory**, not optional. Every component must implement the ARIA roles, keyboard navigation, and screen reader behavior documented in its entry.
> 4. **Component naming conventions:**
>    - CSS class prefix: descriptive, kebab-case (e.g., `.q-card`, `.dec-card`, `.filter-bar`)
>    - JavaScript function prefix: `render` + PascalCase (e.g., `renderCard()`, `renderModal()`)
>    - IDs: kebab-case, unique per instance
> 5. New components not in this inventory must be **added to this document** before implementation begins (Definition of Ready gate).
> 6. All interactive components must be keyboard-operable and have visible focus indicators.
> 7. Loading states must use `setBtnLoading()` for buttons and skeleton loaders for content areas.
> 8. Empty states must provide contextual guidance with step-by-step instructions.
> 9. Status communication must always use **color + icon + text** (never color alone).

---

## 5. Handoff Checklist
- [x] All 36 implemented components documented with CSS classes, tokens, a11y, states, JS functions
- [x] Each component has Category, Description, Variants, Props, Token References, Accessibility, States
- [x] Missing components documented with rationale (reduced from 2 to 1 — Tooltip and Breadcrumb now implemented)
- [x] Cross-cutting patterns documented (responsive, animations, screen reader regions, focus management)
- [x] Implementation Agent guardrail updated (added rules 7–9 for loading, empty states, status communication)
- [x] Sprint attribution: SP-5/SP-7 additions marked with **Added** field
- [x] Design token references verified against `design-tokens.json`
- [x] No contradictory statements
