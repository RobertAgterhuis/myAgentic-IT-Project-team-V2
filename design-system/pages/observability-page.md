# observability-page

## Page Purpose

- Unified analytical lens for drift, analytics velocity, traceability, alerts, and telemetry streams.

## Page-Specific Layout Deviations

- Hosts nested page modules inside a tab shell with lazy-loaded content.
- Uses panel offset behavior (`-mx-6 -mt-6`) for embedded legacy module rendering.

## Page-Specific Component Usage Rules

- Observability tabs must migrate to shared Tabs primitive while preserving lazy loading behavior.
- Alert and stream views should use operational-card/queue-triage components as canonical analytical card patterns.

## Content Density Guidance

- High density is expected; prioritize readable grouping over decorative spacing.
- For streams and alerts, maintain compact metadata rows with strong label/value contrast.

## Hierarchy Notes

- Keep top-page framing stable: PageHeader -> ContextStrip -> Tabs -> Active analytical panel.
- Nested analytical pages should not duplicate top-level page hero structures.

## Page-Specific Warnings / Anti-Patterns

- Avoid mixing tab visuals from multiple style systems.
- Do not let nested pages create duplicate H1-equivalent headers.
- Prevent tab-state and panel-spacing drift across observability subviews.
