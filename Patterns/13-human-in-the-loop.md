# Pattern 13: Human-in-the-Loop

Current score: 9.9/10
Target score: 9.9/10

## Assessment

Human-in-the-loop control is one of the repository's clearest differentiators. The platform explicitly refuses to act as a blind autopilot. Approvals, overrides, gates, and intervention surfaces are structural. Budget-based execution policies add risk-and-spend-aware enforcement, while bounded auto-apply provides principled delegation: humans set the maxChangePercent threshold and retain override authority through the reversibleUntil window.

## Evidence

- The README states that the platform supports implementation with human-in-the-loop control and should be used as a supervised implementation assistant rather than a blind autopilot. Source: README.md:24, README.md:104-112.
- The dispatcher configuration includes humanReviewThresholds, enabling needs_human_review style decisions based on confidence. Source: platform/engine/dispatcher.ts:668, platform/engine/dispatcher.ts:897-898.
- MCP governance defaults deny governance-approval access by default and then selectively grant stronger permissions to orchestrator, security, devops, and related roles. Source: src/webapp/plugins/mcp-governance/defaults.ts:210-216, src/webapp/plugins/mcp-governance/defaults.ts:239-349.
- The chat tool surface includes list_pending_approvals and get_session_context, exposing a controlled operator-review loop rather than unconstrained autonomy. Source: src/webapp/routes/chat.ts:679-764.
- The cockpit and approvals flows track human_override, approval, policy_exception, gate_failure, and similar_overrides for operator decisions. Source: src/webapp/routes/cockpit.ts:215-266, src/webapp/routes/cockpit.ts:766-791.
- Budget-based execution policies now enforce resource and risk thresholds at dispatch time: agents are blocked when estimated cost or time exceeds budget, and fast-path mode is enforced when resources are near-limit. This operationalizes risk-score-based execution escalation. Source: platform/engine/context-budgeter.ts (evaluateAgentBudget), platform/engine/dispatcher.ts (\_runBoundedGroup).
- Bounded auto-apply implements principled human delegation: auto-approval only triggers within a human-configured maxChangePercent bound, and every auto-applied change carries a reversibleUntil timestamp within which operators can roll back. Source: platform/engine/proactive-discovery-optimization.ts (autoApplyAdaptivePolicyProposal, AdaptiveProposalAutoApplyResult).

## Remaining Refinements

- Reviewer workload balancing and escalation SLAs would improve operator experience at scale.
- Audit reports quantifying where human review added value versus caused avoidable latency are a future analytics increment.

## Audit Verdict

Human control is a core design principle with principled bounded delegation. Budget-based escalation and reversible bounded auto-apply extend human oversight into the adaptive policy execution domain. Target state is achieved.
