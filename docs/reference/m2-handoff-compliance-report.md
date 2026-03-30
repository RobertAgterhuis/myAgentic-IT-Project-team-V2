# M2 SDLC Handoff Compliance Audit

Scope: Audit of 39 SDLC agent templates against M2 mandatory handoff sections.

Mandatory sections audited:

- Summary
- Deliverables
- Handoff to Next Agent
- Exit Criteria Met

## Summary

- Total agents audited: 39
- Fully compliant: 0 (0.0%)
- Requiring updates: 39

## Compliance Table

| Agent Template                                               | Compliant | Missing Mandatory Sections                                      | Estimated Update Effort |
| ------------------------------------------------------------ | --------- | --------------------------------------------------------------- | ----------------------- |
| templates/sdlc/agents/00-orchestrator.md                     | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/01-business-analyst.md                 | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/02-domain-expert.md                    | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/03-sales-strategist.md                 | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/04-financial-analyst.md                | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/05-software-architect.md               | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/06-senior-developer.md                 | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/07-devops-engineer.md                  | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/08-security-architect.md               | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/09-data-architect.md                   | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/10-ux-researcher.md                    | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/11-ux-designer.md                      | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/12-ui-designer.md                      | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/13-accessibility-specialist.md         | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/14-brand-strategist.md                 | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/15-growth-marketer.md                  | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/16-cro-specialist.md                   | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/17-synthesis-agent.md                  | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/18-critic-agent.md                     | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/19-risk-agent.md                       | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/20-implementation-agent.md             | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/21-test-agent.md                       | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/22-pr-review-agent.md                  | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/23-reevaluate-agent.md                 | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/24-feature-agent.md                    | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/25-onboarding-agent.md                 | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/26-documentation-agent.md              | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/27-github-integration-agent.md         | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/28-retrospective-agent.md              | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/29-kpi-agent.md                        | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/30-brand-assets-agent.md               | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/31-storybook-agent.md                  | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/32-content-strategist.md               | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/33-legal-counsel.md                    | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/34-product-manager.md                  | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/35-localization-specialist.md          | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/36-questionnaire-agent.md              | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/37-scope-change-agent.md               | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |
| templates/sdlc/agents/38-architecture-compliance-reviewer.md | no        | summary, deliverables, handoff to next agent, exit criteria met | large                   |

## Update Plan

- Apply unified handoff section scaffold to all non-compliant agent templates.
- Preserve existing domain-specific guidance while inserting mandatory section headers.
- Re-run this audit script and the handoff validator in CI.

## Agents Requiring Updates

- templates/sdlc/agents/00-orchestrator.md
- templates/sdlc/agents/01-business-analyst.md
- templates/sdlc/agents/02-domain-expert.md
- templates/sdlc/agents/03-sales-strategist.md
- templates/sdlc/agents/04-financial-analyst.md
- templates/sdlc/agents/05-software-architect.md
- templates/sdlc/agents/06-senior-developer.md
- templates/sdlc/agents/07-devops-engineer.md
- templates/sdlc/agents/08-security-architect.md
- templates/sdlc/agents/09-data-architect.md
- templates/sdlc/agents/10-ux-researcher.md
- templates/sdlc/agents/11-ux-designer.md
- templates/sdlc/agents/12-ui-designer.md
- templates/sdlc/agents/13-accessibility-specialist.md
- templates/sdlc/agents/14-brand-strategist.md
- templates/sdlc/agents/15-growth-marketer.md
- templates/sdlc/agents/16-cro-specialist.md
- templates/sdlc/agents/17-synthesis-agent.md
- templates/sdlc/agents/18-critic-agent.md
- templates/sdlc/agents/19-risk-agent.md
- templates/sdlc/agents/20-implementation-agent.md
- templates/sdlc/agents/21-test-agent.md
- templates/sdlc/agents/22-pr-review-agent.md
- templates/sdlc/agents/23-reevaluate-agent.md
- templates/sdlc/agents/24-feature-agent.md
- templates/sdlc/agents/25-onboarding-agent.md
- templates/sdlc/agents/26-documentation-agent.md
- templates/sdlc/agents/27-github-integration-agent.md
- templates/sdlc/agents/28-retrospective-agent.md
- templates/sdlc/agents/29-kpi-agent.md
- templates/sdlc/agents/30-brand-assets-agent.md
- templates/sdlc/agents/31-storybook-agent.md
- templates/sdlc/agents/32-content-strategist.md
- templates/sdlc/agents/33-legal-counsel.md
- templates/sdlc/agents/34-product-manager.md
- templates/sdlc/agents/35-localization-specialist.md
- templates/sdlc/agents/36-questionnaire-agent.md
- templates/sdlc/agents/37-scope-change-agent.md
- templates/sdlc/agents/38-architecture-compliance-reviewer.md

## Exceptions

- none; all deviations are actionable and should be standardized.
