# cockpit-dashboard-page

## Page Purpose

- Deep diagnostic cockpit for confidence, dependencies, provenance, root cause, and approval history.

## Page-Specific Layout Deviations

- Uses a local tabbed investigative workspace with intervention controls above tab content.
- Supports mixed analytical widgets (graphs, timelines, provenance trees) requiring denser micro-layouts.

## Page-Specific Component Usage Rules

- All cockpit tab controls must conform to the shared tabs accessibility contract.
- Graph and provenance widgets may use visualization-specific rendering layers, but surrounding controls must stay token-driven.

## Content Density Guidance

- High-density investigation mode is intentional; keep scan paths explicit with section headings and compact legends.
- Micro-text should be constrained to secondary metadata only and remain readable.

## Hierarchy Notes

- Hierarchy order: PageHeader -> ContextStrip -> MissionControlHero -> Intervention Console -> Analytical Tabs -> Active panel.
- Active lens should remain visible in context strip for operator orientation.

## Page-Specific Warnings / Anti-Patterns

- Avoid introducing raw color constants in graph/status rendering.
- Prevent tab-button style drift from observability and other tabbed pages.
- Do not overload the top hero area with duplicate status chips.
