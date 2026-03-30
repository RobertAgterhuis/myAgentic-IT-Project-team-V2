# Handoff: Compliance Auditor to Orchestrator

## Summary

- Objective: report governance non-compliance requiring orchestration-level action.
- Scope covered: contract completeness and unresolved policy exceptions.
- Current state: escalation required before phase progression.

## Deliverables

- templates/sdlc/agents/38-architecture-compliance-reviewer.md - compliance gate criteria.
- templates/sdlc/guardrails/00-global-guardrails.md - applicable global guardrails.

## Handoff to Next Agent

- From: Compliance Auditor
- To: Orchestrator (00)
- Status: ESCALATED
- Next action: assign remediation owner and trigger reevaluation flow.

## Exit Criteria Met

- [x] Violations categorized.
- [x] Evidence documented.
- [ ] Remediation completed.

## Escalations

- Policy exception pending for unresolved security labeling obligations.

## Quality Validation

- Command: npm run lint
- Evidence: lint baseline clean; compliance findings are process-related, not syntax-related.

## Annotation

- Included Escalations because unresolved policy exceptions block completion.
- Omitted Dependencies because escalation itself is the gating dependency.
