# Pattern 09: Learning and Adaptation

Current score: 7.1/10
Target score: 9.9/10

## Assessment

The repository contains adaptation hooks, but it is not yet a strongly self-improving system. Today it adapts through reevaluate cycles, retrospectives, profile overrides, and benchmark gates rather than through closed-loop automatic learning.

## Evidence

- Agent RAG profiles can be overridden from BusinessDocs metrics configuration, which allows retrieval policy adaptation without code changes. Source: src/webapp/services/rag-grounding-service.ts:121-179, src/webapp/services/rag-grounding-service.ts:275-301.
- The playbooks instruct the Orchestrator to check reevaluate-trigger.json and execute REEVALUATE before proceeding when new input invalidates current assumptions. Source: templates/sdlc/playbooks/software-creation-playbook.md:404-410, templates/sdlc/playbooks/commercial-software-audit-playbook.md:355-361.
- Retrospectives and velocity logs are treated as first-class artifacts in the playbooks. Source: templates/sdlc/playbooks/software-creation-playbook.md:727, templates/sdlc/playbooks/commercial-software-audit-playbook.md:644.
- The autonomy readiness gate reads benchmark artifacts and checks latency and error-rate thresholds before declaring readiness. Source: scripts/autonomy-readiness-gate.mjs:6-20, scripts/autonomy-readiness-gate.mjs:64.
- Approval workflows surface similar past overrides, which is a form of precedent reuse. Source: src/webapp/routes/cockpit.ts:766-791, src/webapp/ui/src/pages/approvals/approval-center-page.tsx:231-234.

## Why The Score Is Not Higher

- There is little evidence of automatic policy tuning based on retrospective outcomes.
- The system re-evaluates, but it does not yet learn durable execution heuristics from failures, delays, or low-quality outputs.
- There is no model-selection or prompt-policy adaptation loop tied directly to outcome quality.

## Path To 9.9

- Add a lessons-to-policy pipeline that turns reevaluate and retrospective outputs into runtime configuration changes.
- Add per-agent failure taxonomy and automatic mitigation policy updates.
- Add benchmark-driven prompt, routing, and concurrency tuning with rollback protection.

## Audit Verdict

Learning and adaptation is the clearest underdeveloped pattern in the current design. It is the single highest-leverage improvement area for reaching a 9.9+ overall score.
