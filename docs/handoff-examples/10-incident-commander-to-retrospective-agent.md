# Handoff: Incident Commander to Retrospective Agent

## Summary

- Objective: transfer incident timeline, mitigations, and follow-up actions for retrospective.
- Scope covered: impact, mitigation, and action-item ownership.
- Current state: incident stabilized; retrospective required.

## Deliverables

- templates/sdlc/agents/28-retrospective-agent.md - retrospective handoff requirements.
- BusinessDocs/decisions/monitoring.md - on-call and incident handling decisions.

## Handoff to Next Agent

- From: Incident Commander
- To: Sprint Retrospective Agent (28)
- Status: COMPLETED
- Next action: run retrospective and capture prevent/repeat actions.

## Exit Criteria Met

- [x] Incident timeline documented.
- [x] Mitigations recorded.
- [x] Action owners assigned.

## Quality Validation

- Command: npm run test:smoke
- Evidence: smoke checks green after mitigation deployment.

## Technical Decisions

- Decision: keep incident handoff in unified template instead of incident-specific format.
- Rationale: allows cross-team consistency and validator reuse.
- Impact: easier auditability, less format fragmentation.

## Annotation

- Included Technical Decisions because incident process design impacts future runbooks.
- Omitted Escalations because immediate production risk is resolved.
