# Storybook Setup Report

## 1. Setup Summary

- Date: 2026-03-10
- Agent: 31-storybook-agent
- Recommended Storybook version: 8.x
- Recommended framework integration: React + Vite (or framework-equivalent adapter)
- Required addons:
  - `@storybook/addon-essentials`
  - `@storybook/addon-a11y`
  - `@storybook/addon-interactions`
  - `@storybook/addon-viewport`
  - `@storybook/addon-links`

## 2. Configuration

Recommended story directory structure:
- `src/stories/atoms/*.stories.tsx`
- `src/stories/molecules/*.stories.tsx`
- `src/stories/organisms/*.stories.tsx`
- `src/stories/templates/*.stories.tsx`
- `src/stories/pages/*.stories.tsx`

Naming conventions:
- Story title format: `Category/ComponentName` (for example: `Atoms/Button`)
- Story export names: `Default`, `Hover`, `Focus`, `Disabled`, `Error`, `Loading`
- Component file naming: `ComponentName.tsx`

Theme/token configuration:
- Import `.github/docs/brand/design-tokens.json` in a build step and expose as CSS variables.
- Apply variables globally in Storybook preview so every story renders with production token values.
- Ensure stories demonstrate all semantic color and state variants from the component inventory.

## 3. Accessibility Testing Setup

a11y addon baseline:
- Enable `@storybook/addon-a11y` globally in `preview` config.
- Run automatic checks for each story state (default, hover, focus, disabled, error, loading).
- Fail checks on critical WCAG violations for:
  - color contrast
  - missing labels
  - invalid ARIA attributes
  - keyboard trap issues

Automated accessibility rules:
- Buttons must have accessible names.
- Inputs must be label-associated.
- Dialog stories must validate focus trap and return focus behavior.
- Status indicators must include text, not color only.

Handoff status: COMPLETE
