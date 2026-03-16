# M19: Execution Adapter Formalization

> **Impact:** MEDIUM | **Breaking changes:** NONE (additive) | **Blocks:**
> nothing | **Blocked by:** nothing
>
> **Audit reference:** Phase 4 recommendation — "The repo needs explicit
> adapters for GitHub, Azure DevOps, CI/CD engines, package managers/build
> tools, ticketing systems, third-party MCP servers, LLM/runtime providers."
>
> **Validation:** CONFIRMED. `platform/sdlc/adapters/` contains 10 adapter
> modules (ci-adapter, cloud-adapter, container-adapter, git-adapter,
> llm-adapter, security-adapter, shell-executor, testing-adapter, tool-adapter,
> index). These are **interface/abstraction modules** — the audit correctly
> identifies them as the right pattern but notes they need to evolve into working
> adapters with real provider implementations.

---

## Rationale

The adapter layer is one of the repo's strongest extensibility assets. Formalizing
it with concrete provider implementations (starting with the providers already in
use: GitHub, Docker, Vitest, Node.js) transforms it from an abstraction into a
working integration layer — without breaking anything.

---

## Issues

### M19-001: Define adapter interface contracts

**Labels:** `architecture`, `adapters`

For each of the 10 adapter types, create a formal TypeScript interface in
`platform/sdlc/adapters/contracts/`:

- `GitProvider` — clone, branch, commit, push, PR, diff, blame
- `CIProvider` — trigger pipeline, get status, get logs, cancel
- `ContainerProvider` — build, push, pull, tag, scan
- `CloudProvider` — deploy, status, logs, rollback
- `LLMProvider` — complete, embed, stream, tool-use
- `SecurityProvider` — scan, audit, report
- `TestingProvider` — run, status, coverage, report
- `ToolProvider` — discover, invoke, validate
- `ShellExecutor` — exec, stream, timeout

Each interface must define: method signatures, input/output types, error types,
and capability flags (e.g., `supportsPR: boolean`).

**Acceptance criteria:**

- [ ] Contract file per adapter type in `contracts/`
- [ ] All methods have typed inputs and outputs
- [ ] Each contract has a `capabilities` type for feature detection
- [ ] Contracts are exported from the adapter barrel

---

### M19-002: Implement GitHub adapter

**Labels:** `adapters`, `integration`

Create `platform/sdlc/adapters/providers/github.ts` implementing `GitProvider`:

- Use `@octokit/rest` or bare `fetch` against GitHub API
- Implement: list repos, create branch, get diff, create PR, list PR checks,
  merge PR, get file contents
- Configuration: token from environment, org/repo from context
- Error classification: rate-limited → TRANSIENT, 404 → NOT_FOUND, 403 →
  PERMISSION_DENIED

**Acceptance criteria:**

- [ ] GitHub adapter passes contract compliance test
- [ ] Works with both PAT and GitHub App token
- [ ] Rate limit handling (backoff on 429)
- [ ] Unit tests with mocked HTTP responses

---

### M19-003: Implement Docker/container adapter

**Labels:** `adapters`, `integration`

Create provider implementing `ContainerProvider`:

- Shell-based: invoke `docker build`, `docker push`, `docker tag` via shell
  executor
- Parse Docker CLI output for success/failure/image ID
- Support: build with Dockerfile path, tag, push to registry, image scan
  (Trivy/Grype)

**Acceptance criteria:**

- [ ] Container adapter passes contract compliance test
- [ ] Build, tag, and push operations work
- [ ] Error handling for missing Docker daemon
- [ ] Unit tests with mocked shell responses

---

### M19-004: Implement Vitest/testing adapter

**Labels:** `adapters`, `integration`

Create provider implementing `TestingProvider`:

- Shell-based: invoke `vitest run` with JSON reporter
- Parse Vitest JSON output for: pass/fail/skip counts, file list, duration,
  coverage summary
- Support: run all, run file, run by name pattern, get coverage

**Acceptance criteria:**

- [ ] Testing adapter passes contract compliance test
- [ ] Can run tests and parse results programmatically
- [ ] Coverage data extraction works
- [ ] Unit tests with mocked Vitest output

---

### M19-005: Implement LLM provider adapter (multi-provider)

**Labels:** `adapters`, `integration`

Create provider implementing `LLMProvider`. The dispatcher already routes to
Copilot/Claude/OpenAI — formalize this into the adapter pattern:

- `providers/copilot-llm.ts` — GitHub Copilot integration
- `providers/openai-llm.ts` — OpenAI API
- `providers/anthropic-llm.ts` — Anthropic API
- Common: streaming support, token counting, tool-use protocol, timeout, retry

**Acceptance criteria:**

- [ ] Each LLM provider passes contract compliance test
- [ ] Dispatcher uses the adapter interface (not direct implementation calls)
- [ ] Provider selection via configuration, not code changes
- [ ] Unit tests with mocked API responses

---

### M19-006: Create adapter registry and discovery

**Labels:** `adapters`, `architecture`

Create `platform/sdlc/adapters/registry.ts`:

- Registry pattern: `registerProvider(type, name, factory)`
- Discovery: `getProvider(type, name?)` — returns configured provider or default
- Configuration: read from `platform.config.json` or environment
- Validation: verify provider implements the contract at registration time

**Acceptance criteria:**

- [ ] Registry supports dynamic provider registration
- [ ] Default providers are auto-registered
- [ ] Engine and server use the registry (not direct imports)
- [ ] Invalid providers are rejected with clear error messages

---

### M19-007: Add adapter contract compliance test suite

**Labels:** `testing`, `adapters`

Create `tests/unit/adapters/contract-compliance.test.ts`:

- For each adapter interface, define a compliance test suite
- Every concrete provider must pass the compliance suite
- Tests verify: method existence, input validation, error classification, return
  types

**Acceptance criteria:**

- [ ] Compliance test suite exists for all adapter types
- [ ] All implemented providers pass compliance tests
- [ ] New providers automatically get tested (data-driven test)
