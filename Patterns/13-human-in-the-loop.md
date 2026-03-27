# Pattern 13: Human-in-the-Loop

Current score: 9.7/10
Target score: 10.0/10

## Assessment

Human-in-the-loop control is one of the repository's clearest differentiators. The platform explicitly refuses to position itself as a blind autopilot and makes approvals, overrides, gates, and intervention surfaces part of the operating model.

## Evidence

- The README states that the platform supports implementation with human-in-the-loop control and should be used as a supervised implementation assistant rather than a blind autopilot. Source: README.md:24, README.md:104-112.
- The dispatcher configuration includes humanReviewThresholds, enabling needs_human_review style decisions based on confidence. Source: platform/engine/dispatcher.ts:668, platform/engine/dispatcher.ts:897-898.
- MCP governance defaults deny governance-approval access by default and then selectively grant stronger permissions to orchestrator, security, devops, and related roles. Source: src/webapp/plugins/mcp-governance/defaults.ts:210-216, src/webapp/plugins/mcp-governance/defaults.ts:239-349.
- The chat tool surface includes list_pending_approvals and get_session_context, exposing a controlled operator-review loop rather than unconstrained autonomy. Source: src/webapp/routes/chat.ts:679-764.
- The cockpit and approvals flows track human_override, approval, policy_exception, gate_failure, and similar_overrides for operator decisions. Source: src/webapp/routes/cockpit.ts:215-266, src/webapp/routes/cockpit.ts:766-791.

## Why The Score Is Not Higher

- The human role model is strong, but richer delegation patterns between reviewer types could still be added.
- There is room for more granular approval policies tied to cost, blast radius, and compliance domains.

## Path To 9.9+

- Add approval policies based on risk score, spend, data sensitivity, and deployment impact.
- Add reviewer workload balancing and escalation SLAs.
- Add audit reports that quantify where human review added value versus caused avoidable latency.

## Audit Verdict

Human control is a core design principle, not an afterthought. This pattern is already near-maximal maturity.
