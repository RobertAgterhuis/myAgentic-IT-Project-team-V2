# Decisions: Storybook

> Stack: storybook | Status: ACTIVE | Applicable: YES
>
> Created 2026-03-16 during reevaluation. The UI (`src/webapp/ui/`) uses
> Storybook 10 with React-Vite, a11y addon, and Vitest integration.

---

## Decided Items

| ID      | Priority | Scope                             | Decision                                                                                                                                                                                           | Notes | Date       |
| ------- | -------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------- |
| DEC-300 | HIGH     | Phase 3 (Component Documentation) | Yes. All components in the shared component library must have stories covering default state, key variants, edge cases (empty, loading, error), and interactive states.                            |       | 2026-03-16 |
| DEC-301 | HIGH     | Phase 3 (Accessibility Testing)   | `@storybook/addon-a11y` must be enabled for all stories. A11y violations at "serious" or "critical" level are blocking. Run axe checks as part of Storybook CI build.                              |       | 2026-03-16 |
| DEC-302 | MEDIUM   | Phase 3 (Interaction Testing)     | Use `@storybook/addon-vitest` for component interaction tests. Test user workflows (click, type, navigate) within stories. These supplement but do not replace Playwright e2e tests.               |       | 2026-03-16 |
| DEC-303 | MEDIUM   | Phase 3 (Visual Regression)       | Visual regression testing is recommended for design-system components. Use Chromatic or Storybook's built-in snapshot comparison. Review visual diffs in PR before merge.                          |       | 2026-03-16 |
| DEC-304 | MEDIUM   | Phase 5 (Storybook CI Build)      | Yes. `build-storybook` must pass in CI. A broken Storybook build blocks merge. Publish Storybook artifacts for design review on PRs that modify UI components.                                     |       | 2026-03-16 |
| DEC-305 | MEDIUM   | Phase 3 (Story Organization)      | Colocate stories with components (`Component.stories.tsx`). Use consistent naming: `Primary`, `WithVariant`, `Loading`, `Error`, `Empty`. Group by domain in Storybook sidebar.                    |       | 2026-03-16 |
| DEC-306 | LOW      | Phase 3 (Storybook Version)       | Storybook 10 is the current baseline. Apply minor/patch updates monthly. Major upgrades within 90 days of stable release with addon compatibility validation.                                      |       | 2026-03-16 |
| DEC-307 | LOW      | Phase 3 (Design Token Docs)       | Recommended. Create a "Foundation" section in Storybook documenting colors, typography, spacing, and breakpoints from design tokens. Keeps design system documentation co-located with components. |       | 2026-03-16 |
