**MCP Plugin Architecture Mapping Document**

Consolidated working document based on the full discussion in this chat

|                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Document scope This document consolidates the agreed architecture for a plugin-driven, remote-first MCP platform. It includes agent-centric RBAC, MCP server mapping, enablement logic, remote runtime assumptions, code-generated policy application, explicit bootstrap and reconcile flows, generated artifacts, and implementation guidance. |

**Authoring baseline.** Microsoft-focused full-stack development, remote MCP by default, no automatic activation during npm install, declarative-by-code configuration, explicit bootstrap, and runtime reconciliation.

Version: 1.0 | Date: 20 March 2026 | Font target: Manrope

# 1. Executive summary

The platform should be built as a plugin that allows end users to decide which MCP servers are available to their environment, while the platform retains central control over what each agent is allowed to discover, read, propose, write, or execute with approval.

The architecture should be remote-first rather than remote-only as a protocol statement, but for this product the recommended operating model is remote-only for normal users and optional local support only via a separate developer companion mode if ever needed.

RBAC should be agent-centric. The primary hierarchy is Agent → Role Template → Server Permission → Tool Permission → Environment Scope → Approval Policy. MCP server enablement is therefore resolved by policy, not guessed by the model.

The platform should not activate itself through npm install hooks. Instead, the package should install code and CLI binaries, then explicit commands should initialize, bootstrap, reconcile, validate, and build runtime manifests in an idempotent manner.

# 2. Design principles

**•** Default deny and least privilege everywhere.

**•** Remote-first MCP server model for product use, with explicit trust and governance boundaries.

**•** Agent awareness must come from runtime manifests and enforcement, not from prompt memory.

**•** All core policy state should be code-generated from declarative definitions.

**•** Bootstrap and reconcile should be explicit, auditable, and repeatable.

**•** Production write and destructive actions always require approval or a stronger control mode.

**•** The orchestrator is a planner and router, not a privileged executor.

# 3. Reference architecture

The platform is best understood as four cooperating planes.

| **Plane**        | **Primary responsibility**     | **Key objects**                                                                     | **Notes**                                                                      |
| ---------------- | ------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Management plane | Catalog and governance         | Server registry, auth bindings, health, policy metadata                             | Tracks what exists and what can be used.                                       |
| Policy plane     | Authorization model            | Agent types, role templates, tool permissions, environment rules, approval policies | The source of truth for access decisions.                                      |
| Runtime plane    | Session-time execution control | Enabled server resolution, initialize, tools/list, runtime manifests, enforcement   | Projects policy into actual usable tools.                                      |
| Experience plane | Operator and user visibility   | Agent views, permission matrices, overrides, diagnostics, approvals                 | Must explain why something is enabled, blocked, degraded, or pending approval. |

# 4. Agent catalog

| **Agent**        | **Purpose**                          | **Template category** | **Default control posture**                                     |
| ---------------- | ------------------------------------ | --------------------- | --------------------------------------------------------------- |
| Orchestrator     | Plans, routes, delegates             | Planner               | Discover and read broadly; no direct high-risk execution.       |
| Product          | Requirements and backlog             | Planner               | Read and propose; limited documentation write.                  |
| Architect        | Solution design and impact analysis  | Planner/Reviewer      | Read and propose across domains; no direct destructive actions. |
| Developer        | Backend and application code         | Builder               | Repository-strong; platform-weak.                               |
| UI               | Frontend and UX execution            | Builder               | Frontend write and UI validation only.                          |
| QA               | Validation and regression            | Reviewer/Operator     | Tests, runs, and evidence collection.                           |
| DevOps           | Pipelines and release orchestration  | Platform operator     | Write in dev/test; approval for prod-impacting changes.         |
| Infra            | Azure and IaC operations             | Platform operator     | High-risk domain with approval gates.                           |
| Security         | Review and compliance analysis       | Reviewer              | Read and propose, minimal direct remediation.                   |
| Data             | Database and data workflows          | Data specialist       | Controlled data writes; approval for schema-impacting changes.  |
| Documentation    | Docs, runbooks, wiki                 | Builder               | Documentation-only write scope.                                 |
| SRE / Operations | Incidents, observability, mitigation | Platform operator     | Safe operational actions plus approval-gated recovery changes.  |

# 5. Default RBAC matrix by agent and MCP server

Permission legend: N = none, D = discover, R = read, P = propose, W = write, A = approval required, X = blocked.

| **Agent**     | **Azure** | **Azure DevOps** | **GitHub** | **Learn** | **SQL** | **Playwright** | **Graph/Enterprise** | **SharePoint/OneDrive** | **Dataverse** | **NuGet** | **AKS** | **Dev Box** |
| ------------- | --------- | ---------------- | ---------- | --------- | ------- | -------------- | -------------------- | ----------------------- | ------------- | --------- | ------- | ----------- |
| Orchestrator  | D,R       | D,R              | D,R        | R         | D,R     | D,R            | D,R                  | D,R                     | D,R           | D,R       | D,R     | D,R         |
| Product       | N         | R,P              | R          | R         | N       | N              | N                    | R,W                     | R,P           | N         | N       | N           |
| Architect     | R,P       | R,P              | R          | R         | R,P     | R              | R,P                  | R,W                     | R,P           | R         | R,P     | R           |
| Developer     | R         | R,W              | R,W        | R         | R       | R              | N                    | R                       | N             | R,W       | N       | R           |
| UI            | N         | R                | R,W        | R         | N       | R,W            | N                    | R                       | N             | R         | N       | N           |
| QA            | R         | R,W              | R          | R         | R       | R,W            | N                    | R                       | R             | N         | N       | N           |
| DevOps        | R,W,A     | R,W,A            | R,W        | R         | R       | R              | N                    | R                       | N             | R,W       | R,W,A   | R,W,A       |
| Infra         | R,W,A     | R                | R,W        | R         | R       | N              | R                    | R                       | N             | R         | R,W,A   | R,W,A       |
| Security      | R,P       | R                | R          | R         | R       | R              | R,P                  | R                       | R             | R         | R,P     | R           |
| Data          | R         | R                | R,W        | R         | R,W,A   | N              | N                    | R                       | R,W,A         | N         | N       | N           |
| Documentation | N         | R                | R,W        | R         | N       | N              | N                    | R,W                     | N             | N         | N       | N           |
| SRE/Ops       | R,W,A     | R                | R          | R         | R       | N              | R                    | R                       | N             | N         | R,W,A   | R           |

# 6. Environment scope model

| **Environment**        | **Allowed execution pattern**                            | **Typical agents**                         | **Control note**                                        |
| ---------------------- | -------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------- |
| Dev                    | Read and write where allowed                             | Developer, UI, DevOps, Infra, Data         | Fastest path; still respect blocked tool overrides.     |
| Test                   | Limited write plus approvals for higher-risk changes     | DevOps, Infra, QA, Data                    | Staging for evidence and controlled validation.         |
| Prod                   | Read by default; write only with approval                | DevOps, Infra, SRE, Data                   | No agent gets direct destructive actions in production. |
| Cross-environment rule | Planner agents stay read/propose oriented                | Orchestrator, Product, Architect, Security | Broad visibility does not imply execution rights.       |
| Override rule          | Manual override allowed only through explicit governance | Selected administrators                    | Must be auditable, scoped, and time-bound.              |

# 7. MCP server catalog and mapping intent

| **MCP server**            | **Primary domain**          | **Risk**    | **Default hosting assumption** | **Why it matters in this design**                                                   |
| ------------------------- | --------------------------- | ----------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| Azure MCP                 | Infrastructure              | High        | Remote                         | Core cloud control plane for resources, deployments, configuration, and monitoring. |
| Azure DevOps MCP          | Delivery                    | Medium/High | Remote                         | Backlog, repos, builds, tests, release pipeline context.                            |
| GitHub MCP                | Repository                  | Medium      | Remote                         | Optional in hybrid repo models or GitHub-based development.                         |
| Microsoft Learn MCP       | Grounding                   | Low         | Remote                         | Official documentation and code pattern grounding.                                  |
| SQL MCP                   | Data                        | High        | Remote                         | Controlled database access and schema-aware operations.                             |
| Playwright MCP            | Experience validation       | Medium      | Remote                         | Browser-based UI validation and regression flows.                                   |
| Graph / Enterprise MCP    | Tenant and identity         | High        | Remote                         | Entra, tenant, app, group, and directory awareness.                                 |
| SharePoint / OneDrive MCP | Documents and collaboration | Medium      | Remote                         | Document workflows, knowledge access, and collaborative content.                    |

# 8. Tool category mapping by server

Each server should be decomposed into tool categories. Authorization should be evaluated at tool category level and refined to individual tools where needed.

| **Server**                | **Tool categories**                                                             | **Default policy posture**                                                  | **Notes**                                                            |
| ------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Azure MCP                 | Inventory, deployments, configuration, monitoring, resource lifecycle           | Read for broad roles; approval for create/update/delete in sensitive scopes | Delete and high-impact updates must never be implicit.               |
| Azure DevOps MCP          | Work items, repos, pipelines, test plans, build/release metadata, wiki          | Read widely; write only for delivery-centric roles                          | Prod pipeline actions require higher gates than dev/test operations. |
| GitHub MCP                | Repository read, branch operations, pull requests, issues, workflows            | Builder-focused write, otherwise read-only                                  | Useful if the platform spans Azure DevOps and GitHub.                |
| SQL MCP                   | Schema inspect, query, controlled write, migrations, destructive schema actions | Data roles only for writes; migration/destructive actions require approval  | Developer gets read, not schema power.                               |
| Playwright MCP            | Browser launch, navigation, assertions, scenario execution, evidence capture    | UI and QA roles write/execute; others read at most                          | Use for regression evidence, not for broad platform admin.           |
| Graph / Enterprise MCP    | Tenant inventory, group/app insight, directory reads, governance queries        | Primarily read and propose                                                  | Do not grant default tenant write to ordinary engineering agents.    |
| SharePoint / OneDrive MCP | Read documents, write docs, list sites/libraries, knowledge retrieval           | Documentation and Product get controlled write                              | Useful for runbooks, specifications, and operational knowledge.      |

# 9. Approval policy model

| **Mode**          | **Meaning**                       | **Typical use**                                               | **Expected runtime behavior**                                         |
| ----------------- | --------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| auto              | Immediate execution               | Low-risk read and safe write in dev                           | Runtime may execute directly if other checks pass.                    |
| approval_required | Human review before execution     | Prod write, deployment apply, schema migration                | Runtime creates approval request and blocks execution until approved. |
| two_step          | Extra confirmation plus approval  | Delete, force replace, destructive schema or resource actions | Execution remains blocked until both safeguards are satisfied.        |
| blocked           | Never executable in current scope | Unsafe actions for a given agent or environment               | Visible only as blocked or omitted from the tool manifest.            |

# 10. Enablement and agent awareness model

**•** An enabled MCP server is a platform decision, not a language-model assumption. The model should not infer server status from memory or prompt text.

**•** The platform must maintain a server registry, an enablement policy store, a connection/session manager, a merged tool manifest, and an enforcement layer.

**•** A server or tool is visible only if the registry entry exists, policy allows it, scope allows it, authentication is ready, and health is acceptable.

**•** A tool is executable only if it is visible and the permission level, environment constraints, and approval requirements are all satisfied.

|                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Effective enablement formula effectiveEnabled = registryAvailable AND tenantEnabled AND workspaceEnabled AND agentAllowed AND authReady AND healthOk. Tool execution then adds permission sufficiency and approval satisfaction on top of visibility. |

# 11. Package and command model

The package should be declarative-by-code and explicitly operated through CLI commands. It should avoid hidden installation side effects.

| **Command**                 | **Primary purpose**           | **What it should do**                                                                                        |
| --------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| npx my-plugin init          | Project initialization        | Generate project config, folders, default definitions, example registry, and .generated workspace.           |
| npx my-plugin bootstrap     | First-time apply              | Run migrations, seed core metadata, compile desired state, apply base policies, and build manifests.         |
| npx my-plugin reconcile     | Desired-state synchronization | Read code, diff against actual state, plan create/update/disable actions, apply them, and rebuild manifests. |
| npx my-plugin doctor        | Validation and diagnostics    | Validate config, database, auth, known endpoints, policy references, and manifest buildability.              |
| npx my-plugin agents sync   | Agent definition sync         | Normalize and apply agent catalog changes.                                                                   |
| npx my-plugin mcp sync      | Server registry sync          | Update MCP server metadata, enablement bindings, and health-aware registration state.                        |
| npx my-plugin policy sync   | Policy compilation and apply  | Compile RBAC, environment, and tool policies into applied policy records.                                    |
| npx my-plugin runtime build | Manifest generation           | Build per-agent runtime manifests from effective policy plus health and auth state.                          |

## Recommended operator flow

npm install my-plugin

npx my-plugin init

npx my-plugin bootstrap --apply

npx my-plugin doctor

npx my-plugin reconcile --dry-run

npx my-plugin reconcile --apply

npx my-plugin runtime build

# 12. Code-generated configuration model

The following elements should be defined declaratively in code and compiled into managed state.

**•** Agent definitions and template bindings

**•** MCP server definitions and endpoint metadata

**•** Role-based policies and server permissions

**•** Environment rules and production guardrails

**•** Tool overrides and approval requirements

**•** UI metadata, generated runtime manifests, and diagnostics artifacts

## Illustrative structure

export const agents = defineAgents({ ... });

export const mcpServers = defineMcpServers({ ... });

export const policies = definePolicies({ ... });

export const environments = defineEnvironmentPolicies({ ... });

export const toolOverrides = defineToolPolicies({ ... });

# 13. Generated artifacts and data model

| **Artifact or table**              | **Role**                      | **Examples**                                               |
| ---------------------------------- | ----------------------------- | ---------------------------------------------------------- |
| .generated/compiled-policies.json  | Compiled desired-state output | Normalized policy model used during runtime build.         |
| .generated/mcp-registry.json       | Managed registry snapshot     | Resolved remote server catalog plus metadata.              |
| runtime_manifests                  | Applied runtime output        | Per-agent visible tools, permissions, and approval states. |
| agent_types                        | Catalog table                 | Agent identity and template assignment.                    |
| agent_server_policies              | Policy table                  | Server-level permissions by agent and scope.               |
| agent_tool_policies                | Policy table                  | Tool-level overrides, blocks, approvals, and exceptions.   |
| reconcile_runs / reconcile_changes | Audit tables                  | Diff plans, applied actions, and outcomes.                 |

# 14. Implementation sequence

**1.** Define agent catalog, permission codes, template categories, environment scopes, and approval modes.

**2.** Create the remote MCP registry model, including endpoints, health, auth bindings, and enablement metadata.

**3.** Implement server-level RBAC first, then refine to tool category and tool-level policies.

**4.** Build explicit init, bootstrap, reconcile, doctor, and runtime-build commands before attempting automated UX flows.

**5.** Generate runtime manifests per agent and force all execution through manifest-driven enforcement.

**6.** Only after core governance works should the UI expose per-agent overrides, per-environment views, and approval workflows.

# 15. Final recommendations

**•** Keep the product remote-first and explicit in operation. Do not rely on npm install side effects for live activation.

**•** Treat orchestrator power as limited by design. Visibility is useful; execution is dangerous.

**•** Use agent-centric RBAC as the backbone and treat MCP enablement as a policy-resolved runtime concern.

**•** Prefer code-generated desired state plus reconcile over manual drift-prone administration.

**•** Decompose MCP servers into tool categories early so the policy model stays precise as the platform grows.

End of consolidated mapping document
