# M20: MCP as Canonical Platform API

> **Impact:** MEDIUM | **Breaking changes:** NONE (additive, then gradual
> migration) | **Blocks:** nothing | **Blocked by:** nothing (benefits from M17
> but not blocked)
>
> **Audit reference:** Strength #4 and Phase 3 recommendation — "The MCP surface
> is strategically important. It is the bridge from product to platform. It
> should become the canonical control interface, with the web UI and IDEs both
> consuming the same platform service surface."
>
> **Validation:** CONFIRMED. MCP server has 17 tools and 3 resources with real
> CRUD operations. The web UI currently calls the HTTP API directly
> (`src/webapp/routes/`). The MCP server calls `FileStore` directly. This means
> there are two parallel data-access paths with duplicated logic.

---

## Rationale

The audit correctly identifies MCP as the force multiplier. By promoting MCP
tool definitions to the canonical API contract, you ensure that every client
(web UI, IDE, CLI, future automation) gets the same capabilities and the same
validation. This eliminates the current duplication between HTTP routes and MCP
tools.

---

## Issues

### M20-001: Inventory MCP vs HTTP API surface parity

**Labels:** `architecture`, `mcp`

Create a parity matrix: for each MCP tool (17), document whether an equivalent
HTTP endpoint exists, and vice versa. Identify:

- MCP-only operations (no HTTP equivalent)
- HTTP-only operations (no MCP equivalent)
- Duplicated logic (same operation, two code paths)
- Behavioral differences (validation, error handling, audit)

**Acceptance criteria:**

- [ ] Parity matrix documenting all 17 MCP tools vs HTTP endpoints
- [ ] Gaps and duplications clearly identified
- [ ] Recommendation per item: converge, keep separate, deprecate

---

### M20-002: Extract shared service layer

**Labels:** `refactor`, `architecture`

Create `src/webapp/services/` with service modules that contain the business
logic currently duplicated between HTTP routes and MCP tools:

- `decisions-service.ts` — list, create, answer, decide
- `questionnaire-service.ts` — list, get, save answers
- `commands-service.ts` — queue, list, execute
- `governance-service.ts` — list approvals, approve, reject
- `session-service.ts` — status, progress, drift check

Each service takes `FileStore` and `AuditTrail` as constructor dependencies.

**Acceptance criteria:**

- [ ] Service modules exist with typed interfaces
- [ ] All business logic is in services (not in route handlers or MCP tools)
- [ ] Services have independent unit tests
- [ ] Existing route handlers delegate to services
- [ ] MCP tools delegate to the same services

---

### M20-003: Migrate HTTP routes to use service layer

**Labels:** `refactor`, `backend`

Refactor each of the 16 route modules in `src/webapp/routes/` to:

- Import and call the corresponding service
- Handle only HTTP-specific concerns: request parsing, response formatting,
  status codes, headers
- Remove any business logic from route handlers

**Acceptance criteria:**

- [ ] All 16 route modules are thin HTTP wrappers over services
- [ ] No business logic in route files
- [ ] All existing integration/smoke tests still pass

---

### M20-004: Migrate MCP tools to use service layer

**Labels:** `refactor`, `mcp`

Refactor `mcp-server.ts` tool implementations to:

- Import and call the corresponding service
- Handle only MCP-specific concerns: schema validation, tool response format
- Remove duplicated business logic

**Acceptance criteria:**

- [ ] All 17 MCP tools delegate to service layer
- [ ] No duplicated business logic between MCP and HTTP
- [ ] MCP-specific tests still pass

---

### M20-005: Generate OpenAPI spec from service contracts

**Labels:** `docs`, `api`

Auto-generate or manually create an OpenAPI 3.1 spec (`docs/api/openapi.yaml`)
that documents the canonical API surface derived from the service layer:

- Every service method maps to an operation
- Request/response schemas match TypeScript types
- Include error responses and authentication requirements

**Acceptance criteria:**

- [ ] `docs/api/openapi.yaml` exists and validates against OpenAPI 3.1
- [ ] All service operations are documented
- [ ] Spec is generated from or verified against actual types

---

### M20-006: Add MCP tool documentation to help system

**Labels:** `docs`, `mcp`

Ensure each MCP tool has comprehensive documentation accessible via the
`get_help` MCP tool:

- Tool name and description
- Input schema with examples
- Output format
- Common errors
- Usage patterns

**Acceptance criteria:**

- [ ] `get_help` returns documentation for all 17 tools
- [ ] Each tool doc includes at least one usage example
- [ ] Docs are verified against actual tool behavior
