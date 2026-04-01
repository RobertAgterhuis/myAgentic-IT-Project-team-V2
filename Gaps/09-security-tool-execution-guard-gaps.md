# Security Sweep 09: Tool-Execution Guard Gaps

## Scope

- Runtime manifest-based MCP tool policy enforcement
- Agent identity and environment scope handling
- Fail-open/deny-by-default posture

## Findings

### 1) Guard fails open when manifests are missing

- Severity: CRITICAL
- Evidence:
  - src/webapp/tool-execution-guard.ts:109
- Detail:
  - If runtime manifests are unavailable, evaluation returns `null` (allow).
- Risk:
  - Policy controls can be silently bypassed in misconfigured or degraded deployments.

### 2) Guard fails open when managed server record is absent

- Severity: CRITICAL
- Evidence:
  - src/webapp/tool-execution-guard.ts:117
- Detail:
  - If the manifest exists but does not include the expected server entry, evaluation returns `null` (allow).
- Risk:
  - Partial manifest drift can disable enforcement for an entire tool namespace.

### 3) Agent identity can be caller-supplied for policy selection

- Severity: MAJOR
- Evidence:
  - src/webapp/tool-execution-guard.ts:273
  - src/webapp/tool-execution-guard.ts:274
  - src/webapp/mcp-server.ts:241
- Detail:
  - Guard reads `agent_id` from incoming params to resolve policy identity, then `agent_id` is removed before handler execution.
- Risk:
  - Identity binding is policy-only and decoupled from authenticated principal, enabling potential policy confusion if upstream controls are weak.

### 4) Positive control: env scope validation is enforced before handler execution

- Severity: DEFENSE
- Evidence:
  - src/webapp/mcp-server.ts:218
  - src/webapp/mcp-server.ts:230
- Detail:
  - Requests are validated against expected env scope and blocked on validation error.

## Recommended Fixes

1. Switch guard posture to deny-by-default:

- Missing manifest or missing managed server record must block execution.

2. Bind policy identity to authenticated workload identity:

- Ignore caller-provided `agent_id` unless cryptographically/identity-verified.

3. Add startup health gate:

- Refuse MCP server readiness when runtime manifests are missing or malformed.

## Verdict for this area

- Current fail-open behavior creates the strongest systemic bypass risk in the tool-governance stack.
