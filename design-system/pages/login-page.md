# login-page

## Page Purpose

- Authenticate users and handle provider configuration fallback when auth is unavailable.

## Page-Specific Layout Deviations

- Route is intentionally outside the main app shell (no sidebar, top navigation, breadcrumbs, or help/chat panels).
- Uses centered, narrow card layout (`max-w-md`) for focused onboarding.

## Page-Specific Component Usage Rules

- Login actions must use primary/secondary button hierarchy by provider priority.
- Configuration fallback panel is allowed to use expanded instructional content blocks.
- Any environment-variable snippets should use mono styling and copy-action controls.

## Content Density Guidance

- Keep unauthenticated view low-density and task-focused.
- Collapse advanced setup guidance behind progressive disclosure in future iterations if panel height grows.

## Hierarchy Notes

- Primary hierarchy: product trust statement -> sign-in options -> error/reason context.
- Secondary hierarchy: configuration diagnostics and provider-specific setup steps.

## Page-Specific Warnings / Anti-Patterns

- Avoid introducing additional heavy visual motifs from shell pages.
- Do not mix runtime operational badges with authentication messaging.
- Keep this page semantically distinct from app workbench surfaces.
