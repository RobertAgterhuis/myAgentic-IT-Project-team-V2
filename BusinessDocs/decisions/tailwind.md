# Decisions: Tailwind CSS

> Stack: tailwind | Status: ACTIVE | Applicable: YES
>
> Created 2026-03-16 during reevaluation. The UI (`src/webapp/ui/`) uses
> Tailwind CSS v4 with the `@tailwindcss/vite` plugin.

---

## Decided Items

| ID      | Priority | Scope                                  | Decision                                                                   | Notes                                                                                                                                                                                                              | Date       |
| ------- | -------- | -------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| DEC-292 | HIGH     | Phase 3 (CSS Strategy)                 | What CSS methodology is mandated for the UI?                               | Tailwind CSS utility-first is the primary styling approach. Avoid custom CSS files except for edge cases (third-party overrides, animations). No CSS-in-JS libraries alongside Tailwind.                           | 2026-03-16 |
| DEC-293 | HIGH     | Phase 3 (Tailwind Version)             | What Tailwind CSS version baseline applies and what is the upgrade policy? | Tailwind CSS v4 is the current baseline. v4 uses CSS-based configuration (no `tailwind.config.js`). Apply minor/patch updates monthly. Major upgrades within 90 days of stable release.                            | 2026-03-16 |
| DEC-294 | HIGH     | Phase 3 (Design Token Integration)     | How do design tokens map to Tailwind utilities?                            | Map design tokens (colors, spacing, typography) to Tailwind's CSS custom properties. Use `@theme` directive in Tailwind v4 for token-based customization. Tokens are the single source of truth.                   | 2026-03-16 |
| DEC-295 | MEDIUM   | Phase 3 (Tailwind + Radix Integration) | What pattern governs Tailwind usage with Radix UI components?              | Use `tailwind-merge` for className merging in component variants. Use `class-variance-authority` (CVA) for component variant APIs. Radix data attributes can be styled via Tailwind's `data-[state=*]:` modifiers. | 2026-03-16 |
| DEC-296 | MEDIUM   | Phase 3 (Responsive Design)            | What responsive design strategy is required?                               | Mobile-first responsive using Tailwind breakpoint utilities. Define standard breakpoints aligned with design system. Test responsive behavior in Storybook viewports and Playwright.                               | 2026-03-16 |
| DEC-297 | MEDIUM   | Phase 3 (Dark Mode)                    | What dark mode implementation pattern is required?                         | Use Tailwind's `dark:` variant with class-based dark mode strategy (controlled by next-themes). All color values must have both light and dark variants defined via design tokens.                                 | 2026-03-16 |
| DEC-298 | LOW      | Phase 3 (Tailwind Linting)             | What linting/formatting rules apply to Tailwind class usage?               | Use `prettier-plugin-tailwindcss` for consistent class ordering. Consider `eslint-plugin-tailwindcss` for detecting common mistakes. Enforce via pre-commit and CI.                                                | 2026-03-16 |
| DEC-299 | LOW      | Phase 3 (Custom Utilities)             | What policy governs custom Tailwind utilities and plugins?                 | Custom utilities via `@utility` directive in Tailwind v4 CSS. Prefer built-in utilities over custom ones. Custom plugins require review and documentation.                                                         | 2026-03-16 |
