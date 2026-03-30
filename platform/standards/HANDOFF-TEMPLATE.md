# Unified Handoff Template

This template standardizes handoff documents for SDLC and agency workflows.
It is intentionally lightweight: all agents use one structure, with optional
sections enabled when relevant.

## Required vs Optional

Required sections:

- Summary
- Deliverables
- Handoff to Next Agent
- Exit Criteria Met

Optional sections:

- Escalations
- Quality Validation
- Lessons Learned
- Dependencies
- Technical Decisions

Rules:

- Required sections MUST exist and be non-empty.
- Optional sections MAY be omitted when not relevant.
- If a section is not relevant, omit it instead of filling with placeholder text.

## Status Values

The handoff status in the Handoff to Next Agent section MUST be one of:

- COMPLETED
- BLOCKED
- ESCALATED

## Section Rationale

Summary:

- Gives the next agent immediate context without scanning full outputs.

Deliverables:

- Lists exactly what was produced and where evidence can be found.

Handoff to Next Agent:

- States owner transition, expected next action, and transfer status.

Exit Criteria Met:

- Confirms completion conditions and any remaining constraints.

Escalations (optional):

- Captures blockers requiring human or orchestration intervention.

Quality Validation (optional):

- Documents concrete checks (tests, lint, validation commands, evidence links).

Lessons Learned (optional):

- Preserves reusable insights to reduce rework in future cycles.

Dependencies (optional):

- Exposes upstream/downstream coupling and unresolved external dependencies.

Technical Decisions (optional):

- Records implementation choices and rationale for traceability.

## Markdown Template

Use this template for handoff files:

```markdown
# Handoff: <from agent> to <to agent>

## Summary

- Objective: <what was completed>
- Scope covered: <in/out>
- Current state: <short status summary>

## Deliverables

- <artifact or evidence path/link> - <what it contains>
- <artifact or evidence path/link> - <what it contains>

## Handoff to Next Agent

- From: <agent or role>
- To: <agent or role>
- Status: <COMPLETED|BLOCKED|ESCALATED>
- Next action: <specific action expected>

## Exit Criteria Met

- [x] <criterion met>
- [x] <criterion met>
- [ ] <criterion not met, if applicable>

## Escalations

- <who/what/why, only if needed>

## Quality Validation

- Command: <command run>
- Evidence: <result summary and/or file/link>

## Lessons Learned

- <reusable learning>

## Dependencies

- <dependency and impact>

## Technical Decisions

- Decision: <what>
- Rationale: <why>
- Impact: <trade-off>
```

## Inclusion Guidance by Agent Type

Business and strategy agents:

- Usually include Summary, Deliverables, Handoff, Exit Criteria, Dependencies.
- Include Technical Decisions when architectural or policy decisions are made.

Engineering and QA agents:

- Usually include Summary, Deliverables, Handoff, Exit Criteria, Quality Validation.
- Include Escalations when defects or blockers affect release flow.

Design and content agents:

- Usually include Summary, Deliverables, Handoff, Exit Criteria, Lessons Learned.
- Include Dependencies when assets, copy, or approvals are pending.

## Example Coverage

Validated examples are provided in docs/handoff-examples for:

- Business Analyst -> Domain Expert
- Software Architect -> Senior Developer
- UX Researcher -> UX Designer
- Game Designer -> Developer
- Tester -> PR/Review Agent
- Compliance and incident scenarios
