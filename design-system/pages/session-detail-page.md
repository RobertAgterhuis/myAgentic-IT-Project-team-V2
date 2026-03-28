# session-detail-page

## Page Purpose

- Live runtime evidence surface for a single orchestration session.

## Page-Specific Layout Deviations

- Multi-region operational layout combining timeline, activity, runtime log, intervention console, and evidence side modules.
- Supports real-time event merges and phase-filtered log views.

## Page-Specific Component Usage Rules

- Runtime and evidence panels should use shared card/list patterns with explicit section labeling.
- Event timelines and logs must preserve mono/metadata readability while avoiding tiny-font default drift.

## Content Density Guidance

- This is intentionally dense and should prioritize comparative scanability across regions.
- Keep dense telemetry labels concise and grouped by functional domain (phase, agent, evidence, gate).

## Hierarchy Notes

- Primary: session identity and status.
- Secondary: current flow/phase/agent context strip.
- Tertiary: operational analysis regions (timeline, logs, evidence, interventions).

## Page-Specific Warnings / Anti-Patterns

- Avoid introducing parallel status legends that conflict with global status semantics.
- Do not use inconsistent panel widths for equivalent information groups.
- Prevent long log/event blocks from breaking desktop grid rhythm.
