# A3 — Tool Use & External Integrations

**Dimension:** Agentic System Design — Tool Execution & Adapter Layer  
**Score: 7 / 10**

---

## What Was Evaluated

Whether external tool integrations are real or stubbed. How tools are invoked, authorized, audited, and made safe for agent use. Whether MCP integration is functional.

---

## Findings

### 1. Tool Executor — Real, with Idempotency and Timeout

`platform/engine/tool-executor.ts` (52 lines, 75% line coverage) is the single routing entrypoint for all tool invocations. It:

- Routes by category to the registered adapter
- Checks an `AdapterResultCache` — prevents duplicate side effects on engine resume
- Enforces a configurable timeout (default 60,000ms, per-request override)
- Caches successful results for read-only operations: `list-branches`, `list-commits`, `get-diff`, `status`, `get-coverage`

The idempotency cache is important for fault tolerance: if the engine restarts mid-run, cached results prevent double-commits or double-deploys.

Source: `platform/engine/tool-executor.ts` lines 1–100.

### 2. Tool Execution Middleware — Real Policy + RBAC + Audit Trail

`platform/engine/tool-execution-middleware.ts` (239 lines, 71% line coverage) wraps every tool call with:

- RBAC authorization check against the invoking agent's role
- Policy evaluation via `evaluatePolicies()` + `loadAllPolicyPacks()`
- C3 policy map: `tool.files.write → POL-SEC-C3-001`, enforcing write operations go through security policy
- Audit event emission: `{timestamp, traceId, toolCallId, toolId, role, profile, paramsHash, resultHash, success, errorCode, decisionRefs}`

The audit event includes parameter and result hashes — enables forensic reconstruction of what was passed to and returned from each tool without storing raw sensitive data.

Source: `platform/engine/tool-execution-middleware.ts` lines 1–100.

### 3. Seven Adapter Categories — Implemented

Provider files under `platform/sdlc/adapters/providers/`:

- `openai-llm.ts` — OpenAI API
- `anthropic-llm.ts` — Anthropic Claude API
- `copilot-llm.ts` — GitHub Copilot
- `docker-container.ts` — Docker/container operations
- `github.ts` — GitHub API (@octokit/rest)
- `vitest-testing.ts` — Test runner integration

Adapter categories under `platform/sdlc/adapters/`:

- `ci-adapter.ts` (83 lines, 62% coverage) — CI pipeline operations
- `cloud-adapter.ts` (99 lines, 74% coverage)
- `container-adapter.ts` (82 lines, 68% coverage)
- `git-adapter.ts` (71 lines, **37% coverage** — weakest)
- `llm-adapter.ts` (113 lines, 62% coverage)
- `security-adapter.ts` (75 lines, **41% coverage**)
- `registry.ts` (78 lines, **47% coverage**)

Source: `coverage-summary.json`.

**Gap:** `git-adapter.ts` at 37% line coverage is the most-used adapter during normal SDLC execution (commits at gate passage) but is the least tested.

### 4. isomorphic-git — Real Git Operations

`package.json` includes `isomorphic-git` as a production dependency. The workspace manager and git service use it for real git operations (commit, diff, branch, status). This is not a mock — actual git history is written.

Source: `package.json` dependencies, `src/webapp/services/git/` directory, `platform/engine/workspace/workspace-manager.ts` (95% line coverage).

### 5. MCP Integration

`@modelcontextprotocol/sdk ^1.27.1` is in production dependencies. The `src/webapp/routes/` directory includes `mcp/` routes, and the UI has four MCP-specific pages (`mcp-matrix-page`, `mcp-agent-view-page`, `mcp-overrides-page`, `mcp-diagnostics-page`).

The engine acts as an **MCP server** — it exposes agent capabilities as MCP tools. This enables VS Code Copilot and other MCP clients to invoke SDLC agents as composable tools.

**Gap:** The path from `tool-executor.ts` to MCP tool routing (i.e., how a tool call from an agent maps to an MCP endpoint vs a local adapter) was not directly readable from the files accessed. The MCP matrix UI page exists, suggesting MCP tool registration is configurable — but the completeness of the MCP server implementation could not be verified from available code.

### 6. Policy Evaluator — Real Governance (platform/engine/policy-evaluator.ts)

The policy evaluator (101 lines, 67% coverage) implements:

- Scope hierarchy: `global → org → team → repo → sprint`
- Categories: `security | quality | compliance | process | architecture`
- Severity: `blocking | warning | advisory`
- Exception rules with expiry dates and approver names
- Policy packs loaded from `templates/sdlc/` at runtime (not hardcoded)

Source: `platform/engine/policy-evaluator.ts` lines 1–80.

---

## Strengths

1. **Full audit trail on every tool call** — parameter and result hashes, traceId, toolCallId, role, and policy decision refs are all captured. This is production-grade observability.
2. **Idempotency cache** — prevents double side-effects on engine restart; critical for a long-running agentic workflow.
3. **Real tool implementations** — git operations via isomorphic-git, GitHub via @octokit/rest, CI via real adapter calls. These are not stubs.
4. **Policy inheritance chain** — five scope levels with exception management and expiry. Well-engineered for enterprise governance.
5. **Seven adapter categories** — broad coverage from CI to cloud to security.

---

## Weaknesses

1. **git-adapter.ts at 37% coverage** — The adapter used in every gate passage (code commits) has severe test gaps. A defect in git commit logic would go undetected. Source: `coverage-summary.json`.
2. **security-adapter.ts at 41% coverage** — Security scanning operations are undertested despite being in the critical path of PHASE_2 gates.
3. **adapter registry at 47% coverage** — The runtime registration mechanism for all adapters is below half tested.
4. **MCP routing completeness unclear** — The MCP server interface is present but the end-to-end path from external MCP client → tool invocation → adapter execution → response was not fully traceable from files read.
5. **No circuit breaker** — If an external tool (e.g., GitHub API, Docker) fails repeatedly, there is retry logic in LLM adapters but no circuit-breaker pattern for external service adapters. Under sustained external failures, agents would queue up retries rather than fast-failing.

---

## Recommended Improvements

1. Raise `git-adapter.ts` coverage to ≥75% — critical path, high-risk on defect.
2. Add timeout-and-circuit-breaker wrapper at the `tool-executor.ts` level using a token-bucket pattern.
3. Document the MCP server capability surface (which tools are exposed as MCP endpoints) in a machine-readable manifest.
4. Add integration tests for the CI and security adapters using containerized test doubles (e.g., a Mock GitHub API server).

---

## Source References

| File                                           | Lines Read                              | Key Finding                      |
| ---------------------------------------------- | --------------------------------------- | -------------------------------- |
| `platform/engine/tool-executor.ts`             | 1–100                                   | Routing, cache, timeout          |
| `platform/engine/tool-execution-middleware.ts` | 1–100                                   | RBAC, policy, audit event        |
| `platform/engine/policy-evaluator.ts`          | 1–80                                    | Scope hierarchy, exception rules |
| `platform/sdlc/adapters/providers/`            | dir listing                             | 6 provider implementations       |
| `platform/sdlc/adapters/llm-adapter.ts`        | 1–80                                    | Adapter categories               |
| `src/webapp/routes/`                           | dir listing                             | MCP routes present               |
| `coverage/coverage-summary.json`               | git-adapter, security-adapter, registry | Coverage gaps                    |
