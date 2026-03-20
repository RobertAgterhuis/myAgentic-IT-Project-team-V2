# Storybook Adoption Plan

## Current Storybook Status

- Storybook is configured for React Vite with a11y and docs addons and MSW loader support. [src/webapp/ui/.storybook/main.ts](src/webapp/ui/.storybook/main.ts#L1-L14), [src/webapp/ui/.storybook/preview.ts](src/webapp/ui/.storybook/preview.ts#L1-L26)

## Required Folder/Story Architecture

- Continue co-located stories under `src/webapp/ui/src` with a consistent naming scheme and MDX usage to match Storybook config. [src/webapp/ui/.storybook/main.ts](src/webapp/ui/.storybook/main.ts#L1-L14)

## Component Onboarding Order (Storybook-First)

1. Foundations (semantic tokens, typography, spacing, motion). [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L79-L149)
2. Shell primitives (AppShell, SidebarNav, PageHeader, Breadcrumb, ContextStrip). [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L153-L239)
3. Status/risk primitives and feedback patterns. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)
4. Operational cards, decision components, evidence components. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)
5. Domain composites and page templates. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)

## Documentation Standard

- Each component story must include default, states, semantic variants, and usage guidance per the backlog requirements. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L18-L58)

## Testing Strategy

- Keep a11y checks enabled in Storybook and align with “todo” mode until CI is ready to fail on violations. [src/webapp/ui/.storybook/preview.ts](src/webapp/ui/.storybook/preview.ts#L16-L23)

## Visual Regression Suggestion

- Consider integrating Chromatic or Playwright visual snapshots once core primitives are stabilized (Storybook config already includes Chromatic addon). [src/webapp/ui/.storybook/main.ts](src/webapp/ui/.storybook/main.ts#L4-L10)
