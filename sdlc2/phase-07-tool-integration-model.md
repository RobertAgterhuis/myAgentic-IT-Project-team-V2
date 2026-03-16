# Phase 7 — Tool Integration Model

> Execution layer design with adapter-by-adapter implementation plan.  
> Reviewed: 2026-03-15 | Reviewer: Principal Software Architect

---

## Current Adapter Architecture

```
platform/sdlc/adapters/
  ├── index.ts          — AdapterRegistry + BaseAdapter + ToolAdapter interface
  ├── tool-adapter.ts   — Canonical ToolAdapter interface definition
  ├── git-adapter.ts    — GitAdapter (stub)
  ├── ci-adapter.ts     — CiAdapter (stub)
  ├── container-adapter.ts — ContainerAdapter (stub)
  ├── cloud-adapter.ts  — CloudAdapter (stub)
  ├── security-adapter.ts — SecurityAdapter (stub)
  ├── testing-adapter.ts — TestingAdapter (stub)
  └── llm-adapter.ts    — LlmAdapter (stub)
```

### ToolAdapter Interface

```typescript
interface ToolAdapter {
  name: string;
  category: string;
  operations: string[];
  checkHealth(): Promise<HealthStatus>;
  execute(
    operation: string,
    params: Record<string, unknown>
  ): Promise<AdapterResult>;
}
```

### BaseAdapter Pattern

```typescript
abstract class BaseAdapter implements ToolAdapter {
  protected config: AdapterConfig;
  protected operationMap: Map<string, Function>;
  // Shared: health check, config validation, operation dispatch
  async execute(op, params) {
    return this.operationMap.get(op)?.(params);
  }
}
```

**Assessment**: The interface is clean and minimal. The `BaseAdapter` shared
logic (health, dispatch, config) is correct. The `AdapterRegistry` handles
registration and lookup. All adapters follow the same pattern. This is the
right foundation.

---

## Tool Executor Design

The Tool Executor is the new bridge between the engine/dispatcher and the
adapter implementations. It sits at Layer 5 of the target architecture.

```
Dispatcher → Tool Executor → AdapterRegistry → Specific Adapter → External Tool
```

### Responsibilities

1. **Routing**: Determine which adapter handles a given operation
2. **Credential injection**: Load adapter-specific credentials from environment
3. **Timeout enforcement**: Kill long-running operations after configurable timeout
4. **Result normalization**: Ensure all adapter results conform to `AdapterResult`
5. **Idempotency check**: Consult adapter result cache before re-executing
6. **Audit logging**: Log every tool execution to audit trail

### Interface

```typescript
interface ToolExecutor {
  execute(request: ToolRequest): Promise<ToolResult>;
  checkHealth(adapterName: string): Promise<HealthStatus>;
  listCapabilities(): AdapterCapability[];
}

interface ToolRequest {
  adapter: string; // e.g., 'git', 'ci', 'testing'
  operation: string; // e.g., 'list_branches', 'run_tests'
  params: Record<string, unknown>;
  timeout?: number; // ms, default from config
  idempotency_key?: string;
}

interface ToolResult {
  success: boolean;
  adapter: string;
  operation: string;
  data?: unknown;
  error?: string;
  duration_ms: number;
  cached: boolean;
}
```

### Implementation Strategy

```typescript
// platform/engine/tool-executor.ts (~150 lines)
class ToolExecutorImpl implements ToolExecutor {
  constructor(
    private registry: AdapterRegistry,
    private resultCache: AdapterResultCache,
    private auditTrail: AuditTrail,
    private config: ExecutorConfig
  ) {}

  async execute(request: ToolRequest): Promise<ToolResult> {
    // 1. Check idempotency cache
    const cached = await this.resultCache.get(request.idempotency_key);
    if (cached?.success) return { ...cached, cached: true };

    // 2. Resolve adapter
    const adapter = this.registry.get(request.adapter);
    if (!adapter) return { success: false, error: 'Unknown adapter' };

    // 3. Health check
    const health = await adapter.checkHealth();
    if (health.status !== 'healthy')
      return { success: false, error: 'Adapter unhealthy' };

    // 4. Execute with timeout
    const start = Date.now();
    const result = await withTimeout(
      adapter.execute(request.operation, request.params),
      request.timeout || this.config.defaultTimeout
    );

    // 5. Cache result
    await this.resultCache.set(request.idempotency_key, result);

    // 6. Audit
    await this.auditTrail.append({
      type: 'tool_execution',
      ...request,
      result,
    });

    return { ...result, duration_ms: Date.now() - start, cached: false };
  }
}
```

---

## Adapter Implementation Plans

### Priority Tiers

| Tier | Adapters              | Rationale                     |
| ---- | --------------------- | ----------------------------- |
| P0   | Git, Testing          | Core development workflow     |
| P1   | CI, Security          | Quality gates and automation  |
| P2   | Container, Cloud, LLM | Deployment and AI integration |

---

### P0: GitAdapter Implementation

**Target operations**:
| Operation | Implementation | External Tool |
| ----------------- | ----------------------------------------------- | ------------- |
| `list_branches` | `git branch --list --format='%(refname:short)'` | git CLI |
| `list_commits` | `git log --oneline -n {count}` | git CLI |
| `create_branch` | `git checkout -b {name}` | git CLI |
| `create_tag` | `git tag -a {name} -m {message}` | git CLI |
| `get_diff` | `git diff {from}..{to} --stat` | git CLI |

**Execution model**: Shell out to `git` CLI using `node:child_process.execFile`.
Parse stdout as structured output.

**Configuration**:

```typescript
interface GitAdapterConfig {
  workingDirectory: string; // Default: process.cwd()
  gitPath?: string; // Default: 'git' (from PATH)
  timeout?: number; // Default: 30000ms
}
```

**Health check**: `git --version` succeeds and working directory has `.git/`.

**Error handling**:

- Non-zero exit code → `{ success: false, error: stderr }`
- Timeout → `{ success: false, error: 'Git operation timed out' }`
- Missing git binary → health check fails, adapter marked unhealthy

**Estimated implementation**: ~100 lines replacing stubs in `git-adapter.ts`.

---

### P0: TestingAdapter Implementation

**Target operations**:
| Operation | Implementation | External Tool |
| -------------------- | --------------------------------------------- | ------------- |
| `run_unit_tests` | `npx vitest run --reporter=json` | vitest |
| `run_integration` | `npx vitest run tests/integration/ --reporter=json` | vitest |
| `run_e2e` | `npx playwright test --reporter=json` | playwright |
| `get_coverage` | `npx vitest run --coverage --reporter=json` | vitest |

**Execution model**: Shell out to test runner, capture JSON reporter output.
Parse into standardized test result format.

**Result format**:

```typescript
interface TestResult {
  framework: 'vitest' | 'playwright';
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  failures: Array<{ name: string; message: string; file: string }>;
  coverage?: { lines: number; branches: number; functions: number };
}
```

**Configuration**:

```typescript
interface TestingAdapterConfig {
  packageManager: 'npm' | 'pnpm' | 'yarn'; // Default: 'npm'
  vitestConfig?: string; // Path to vitest config
  playwrightConfig?: string; // Path to playwright config
  timeout?: number; // Default: 300000ms (5 min)
}
```

**Health check**: `npx vitest --version` and/or `npx playwright --version`.

**Estimated implementation**: ~120 lines replacing stubs in `testing-adapter.ts`.

---

### P1: CiAdapter Implementation

**Target operations**:
| Operation | Implementation | External Tool |
| ---------------------- | ------------------------------------------- | --------------- |
| `trigger_workflow` | GitHub Actions API: POST workflow_dispatch | GitHub REST API |
| `get_build_status` | GitHub Actions API: GET workflow runs | GitHub REST API |
| `get_build_logs` | GitHub Actions API: GET run logs | GitHub REST API |
| `list_workflows` | GitHub Actions API: GET workflows | GitHub REST API |

**Execution model**: HTTP calls to GitHub API using `node:https`.

**Configuration**:

```typescript
interface CiAdapterConfig {
  provider: 'github-actions' | 'azure-devops';
  apiToken: string; // From env: GITHUB_TOKEN or ADO_TOKEN
  owner: string; // Repository owner
  repo: string; // Repository name
  apiBaseUrl?: string; // Default: 'https://api.github.com'
}
```

**Security considerations**:

- Token loaded from environment variable, never persisted to state
- Token scoped to minimum required permissions (`actions:read`, `actions:write`)
- API calls use HTTPS only
- Rate limiting respected (check `X-RateLimit-Remaining` header)

**Health check**: `GET /repos/{owner}/{repo}` returns 200.

**Estimated implementation**: ~150 lines replacing stubs in `ci-adapter.ts`.

---

### P1: SecurityAdapter Implementation

**Target operations**:
| Operation | Implementation | External Tool |
| ----------------------- | ------------------------------------------- | ------------- |
| `run_sast` | `npx eslint . --format json` | ESLint |
| `audit_dependencies` | `npm audit --json` | npm |
| `scan_secrets` | Pattern matching on file contents | Built-in |
| `check_licenses` | `npx license-checker --json` | license-checker |

**Execution model**: Mix of shell execution and built-in pattern matching.

**Secret scanning patterns** (built-in, no external dependency):

```typescript
const SECRET_PATTERNS = [
  /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]{20,}/i,
  /(?:secret|password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}/i,
  /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/, // GitHub tokens
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, // JWT tokens
];
```

Note: The webapp's `server.ts` already has secret scanning on request bodies
using a similar pattern set. The security adapter should reuse or extend
that pattern list.

**Estimated implementation**: ~130 lines replacing stubs in `security-adapter.ts`.

---

### P2: ContainerAdapter Implementation

**Target operations**:
| Operation | Implementation | External Tool |
| -------------- | ----------------------------------------------- | ------------- |
| `build` | `docker build -t {tag} -f {dockerfile} {context}` | docker CLI |
| `push` | `docker push {tag}` | docker CLI |
| `inspect` | `docker inspect {image}` | docker CLI |
| `scan` | `docker scout cves {image}` (or trivy) | docker/trivy |

**Configuration**:

```typescript
interface ContainerAdapterConfig {
  runtime: 'docker' | 'podman';
  registry?: string; // Container registry URL
  timeout?: number; // Default: 600000ms (10 min for builds)
}
```

**Health check**: `docker --version` or `podman --version`.

**Estimated implementation**: ~100 lines.

---

### P2: CloudAdapter Implementation

**Target operations**:
| Operation | Implementation | Target |
| ---------------------- | --------------------------------------------- | --------------- |
| `deploy` | Azure CLI: `az webapp deploy` / `az container app update` | Azure |
| `get_status` | Azure CLI: `az webapp show` / health endpoint | Azure |
| `list_environments` | Azure CLI: `az webapp list` | Azure |
| `rollback` | Azure CLI: revert to previous deployment | Azure |

**Configuration**:

```typescript
interface CloudAdapterConfig {
  provider: 'azure' | 'aws' | 'gcp';
  subscriptionId?: string; // Azure-specific
  resourceGroup?: string; // Azure-specific
  credentials: 'cli' | 'managed-identity' | 'service-principal';
  timeout?: number;
}
```

Based on the decision documents in `BusinessDocs/decisions/`, Azure is the
primary cloud target. Initial implementation should target Azure only.

**Health check**: `az account show` succeeds.

**Estimated implementation**: ~150 lines.

---

### P2: LlmAdapter Implementation

**Target operations**:
| Operation | Implementation | Provider |
| ----------------------- | ------------------------------------------- | -------------- |
| `analyze_code` | Send code + prompt to LLM API | Configurable |
| `generate_documentation`| Send source + doc template to LLM API | Configurable |
| `review_architecture` | Send architecture docs + review criteria | Configurable |
| `generate_tests` | Send source + test framework to LLM API | Configurable |

**Configuration**:

```typescript
interface LlmAdapterConfig {
  provider: 'openai' | 'anthropic' | 'azure-openai';
  model: string;
  apiKey: string; // From env variable
  endpoint?: string; // For Azure OpenAI
  maxTokens?: number;
  temperature?: number;
}
```

**Design note**: The LLM adapter is the most complex because it must handle:

- Multi-provider API differences
- Token counting and context window management
- Streaming vs non-streaming responses
- Rate limiting and retry logic specific to LLM APIs
- Cost tracking

Given the current multi-platform transpiler already handles Copilot/Claude/OpenAI
differences, the LLM adapter should leverage the existing platform abstraction
in `dispatcher.ts` rather than reimplementing provider detection.

**Estimated implementation**: ~200 lines.

---

## Shell Execution Framework

All adapters that shell out to external tools need a shared execution function:

```typescript
// platform/sdlc/adapters/shell-executor.ts (~60 lines)

interface ShellResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  timedOut: boolean;
}

async function executeShell(
  command: string,
  args: string[],
  options: {
    cwd?: string;
    timeout?: number;
    env?: Record<string, string>;
  }
): Promise<ShellResult> {
  // Uses node:child_process.execFile (not exec — avoid shell injection)
  // Captures stdout + stderr
  // Enforces timeout via AbortController
  // Returns structured result
}
```

**Security**: Uses `execFile` (not `exec`) to prevent shell injection. Arguments
are passed as an array, never interpolated into a command string. Environment
variables are explicitly whitelisted, not inherited wholesale.

---

## Adapter Configuration Management

### Environment-Based Configuration

```bash
# .env (gitignored)
GIT_WORKING_DIR=/path/to/repo
GITHUB_TOKEN=ghp_xxxxx
GITHUB_OWNER=org
GITHUB_REPO=repo
AZURE_SUBSCRIPTION_ID=xxx
AZURE_RESOURCE_GROUP=xxx
OPENAI_API_KEY=sk-xxxxx
```

### Configuration Resolution Order

1. Explicit `AdapterConfig` passed to adapter constructor
2. Environment variables (with `ADAPTER_` prefix convention)
3. `.env` file in workspace root
4. Default values from adapter definition

### Configuration Validation

Each adapter's `validateConfig()` (already defined in BaseAdapter) should:

1. Check all required fields are present
2. Validate format (e.g., GitHub token starts with `ghp_`)
3. NOT validate connectivity (that's health check)
4. Return structured validation result with missing/invalid fields

---

## Integration with Engine

### How Adapters Get Invoked

Two invocation paths:

**Path 1: Agent-Requested Tool Use**

```
Agent output includes tool request →
  Dispatcher detects structured tool invocation →
    Tool Executor routes to adapter →
      Adapter executes →
        Result returned to agent context for next interaction
```

This path requires agents to produce structured tool requests. The existing
MCP tool schema provides the format.

**Path 2: Engine-Orchestrated Tool Use**

```
Engine reaches a state that requires tool execution →
  afterTransition hook checks state requirements →
    Tool Executor invoked directly →
      Result persisted to state
```

Examples:

- `IMPLEMENTATION` state → GitAdapter.create_branch
- Sprint completion → TestingAdapter.run_unit_tests
- Release gate → SecurityAdapter.audit_dependencies
- Deployment → ContainerAdapter.build + CloudAdapter.deploy

### Which Path First?

Path 2 (engine-orchestrated) is recommended first because:

1. The trigger points are well-defined (state transitions)
2. The operations are predictable (one state = one set of tools)
3. It doesn't require changing agent behavior

Path 1 (agent-requested) is more flexible but requires:

1. Agent output parsing for tool requests
2. Multi-turn interaction (execute tool, feed result back)
3. Trust in agent judgment for tool selection

---

## Implementation Order

| Step | Adapter          | Dependency           | Unlocks                         |
| ---- | ---------------- | -------------------- | ------------------------------- |
| 1    | Shell executor   | None                 | All CLI-based adapters          |
| 2    | GitAdapter       | Shell executor       | Branch management, diffing      |
| 3    | TestingAdapter   | Shell executor       | Automated test execution        |
| 4    | Tool Executor    | Adapter result cache | Engine ↔ adapter bridge         |
| 5    | SecurityAdapter  | Shell executor       | SAST, dependency audit, secrets |
| 6    | CiAdapter        | None (HTTP-based)    | CI/CD automation                |
| 7    | ContainerAdapter | Shell executor       | Container builds                |
| 8    | CloudAdapter     | None (CLI-based)     | Deployment                      |
| 9    | LlmAdapter       | None (HTTP-based)    | AI-assisted operations          |

Steps 1-4 form the critical path. Steps 5-9 can be parallelized.
