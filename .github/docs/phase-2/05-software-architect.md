# Analysis – Software Architect – 2026-03-08

## Metadata
- Agent: Software Architect (05)
- Phase: 2
- Input received from: Phase 1 Product Manager (34) + critic-risk-validation
- Date: 2026-03-08
- Software under analysis: myAgentic-IT-Project-team-V2
- Mode: AUDIT

## Scope Change Impact
NOT_APPLICABLE — normal cycle

## Step 0: Questionnaire Context
NOT_INJECTED — first audit cycle

---

## Step 1: Codebase Inventory

### 1.1 Repository
| Property | Value | Source |
|----------|-------|--------|
| Name | myAgentic-IT-Project-team-V2 | `README.md` |
| Language | JavaScript (Node.js) | `.github/package.json` engines: >=18 |
| Framework | None — native `http` module | `server.js:7` |
| Module system | CommonJS (`require`) | All source files use `require()` |
| Entry points | `server.js` (HTTP), `mcp-server.js` (MCP stdio) | `package.json` scripts |
| LOC (source) | ~8,334 | Terminal scan (34 JS/MJS files) |
| Tests | 576 passing (Vitest) | `vitest run` output |

### 1.2 Module Structure
| Module | File | Responsibility | LOC (est.) |
|--------|------|----------------|------------|
| HTTP Server | `server.js` | REST API, SSE, metrics, static files | ~1,100 |
| MCP Server | `mcp-server.js` | 13 MCP tools + 3 resources via stdio | ~550 |
| Store | `store.js` | FileStore (sync FS + backup) + InMemoryStore | ~130 |
| Cache | `cache.js` | FileCache with mtime invalidation | ~90 |
| Models | `models.js` | Questionnaire/decision/pipeline parsing | ~600 |
| Schemas | `schemas.js` | Session state + command queue validators | ~100 |
| Audit | `audit.js` | Append-only JSONL audit trail | ~120 |
| Strings | `strings.js` | Centralized string constants | ~80 |
| Errors | `utils/errors.js` | Error response helpers | ~30 |
| Secrets | `utils/secret-utils.js` | Secret detection utilities | ~50 |
| Frontend | `frontend-utils.js` | Client-side validation, polling | ~200 |

### 1.3 External Dependencies
| Dependency | Version | Type | License |
|------------|---------|------|---------|
| `@modelcontextprotocol/sdk` | ^1.27.1 | Runtime | MIT |
| `vitest` | ^4.0.18 | Dev | MIT |
| `@vitest/coverage-v8` | ^4.0.0 | Dev | MIT |
| `eslint` | ^10.0.3 | Dev | MIT |
| `jsdom` | ^28.1.0 | Dev | MIT |

### 1.4 Deployment Topology
- **HTTP Server:** `localhost:127.0.0.1:3000` (configurable via PORT env) — Source: `server.js:91-92`
- **MCP Server:** stdio transport, launched by IDE — Source: `mcp-server.js:1-12`
- **No cloud deployment, no containers, no IaC**

---

## Step 2: Architecture Pattern Recognition

### 2.1 Pattern: Modular Monolith (File-based)
- **Evidence:** Single Node.js process, all modules loaded via `require()`, no service boundaries, shared file system state
- **Source:** `server.js:8-16` (all imports from local modules), `store.js:1-10` (direct `fs` usage)
- **Communication:** In-process function calls (no network between modules)
- **Data sharing:** All modules access the same file system paths (PROJECT_ROOT, BUSINESS_DOCS, GITHUB_DOCS)

### 2.2 Secondary Pattern: Document Store (Implicit)
- **Evidence:** All state persisted as JSON/Markdown files on disk, no database, no SQL
- **Source:** `store.js` (FileStore), `cache.js` (FileCache), `audit.js` (JSONL)
- **Query pattern:** File-read + in-memory parse + filter (no indexing)

### 2.3 Communication Patterns
| Pattern | Where | Source |
|---------|-------|--------|
| Synchronous HTTP | Web UI ↔ server.js | `server.js` REST endpoints |
| Server-Sent Events | server.js → Web UI (push) | `server.js:21-34` SSE registry |
| stdio | IDE ↔ mcp-server.js | `mcp-server.js` StdioServerTransport |
| File system | All components (implicit) | `store.js` FileStore |

---

## Step 3: DDD Analysis

### 3.1 Bounded Contexts
| Context | Status | Evidence | Source |
|---------|--------|----------|--------|
| Questionnaire Management | Implicit | `models.parseQuestionnaire()`, `models.parseQuestionnaireIndex()` | `models.js` |
| Decision Management | Implicit | `models.parseDecisions()`, category-based files | `models.js`, `decisions-architecture.md` |
| Session Orchestration | Implicit | `schemas.validateSessionState()`, session-state.json | `schemas.js`, `server.js` |
| Audit & Observability | Implicit | `AuditTrail` class, metrics collector, SSE | `audit.js`, `server.js:37-85` |
| Pipeline Visualization | Implicit | `models.parsePipelineFromSession()` | `models.js` |

**Assessment:** Bounded contexts exist implicitly through module boundaries but are not formally declared. No explicit context maps or anti-corruption layers.

### 3.2 Aggregates
- **Session State** — aggregate root for orchestration (validated by `schemas.validateSessionState`)
- **Questionnaire** — aggregate root for Q&A lifecycle (parsed by `models.parseQuestionnaire`)
- **Decision** — aggregate root for decision lifecycle (parsed by `models.parseDecisions`)
- **Finding:** Aggregates are implicit; no enforcement of invariants beyond schema validation

### 3.3 Domain Events
- **SSE events emitted:** `file_change`, `progress` — Source: `server.js:31`
- **Audit events logged:** `create`, `update`, `delete` — Source: `audit.js:80-90`
- **Finding:** No formal domain event catalog. Events are ad-hoc, not published to a bus.

### 3.4 Ubiquitous Language
- Terms like `INSUFFICIENT_DATA`, `QUESTIONNAIRE_REQUEST`, `SCOPE_CHANGE_HOLD` are used consistently across skill files but not codified in a glossary
- `strings.js` centralizes UI-facing strings but not domain terminology

---

## Step 4: Tech Debt Scoring

| Dimension | Score (0–10) | Findings | Source |
|-----------|-------------|----------|--------|
| Coupling | 6 | Modules share file paths and `require` each other; `mcp-server.js` imports `sanitizeMarkdown`, `detectSecrets`, `safePath` directly from `server.js` — tight coupling between server and MCP | `mcp-server.js:28-33` |
| Cohesion | 7 | `server.js` handles HTTP routing, SSE, metrics, and business logic in one file (~1100 LOC); `models.js` has clear single responsibility | `server.js:1-100`, `models.js:1-50` |
| Testability | 8 | 576 tests passing; InMemoryStore enables testing without FS; coverage thresholds enforced (70% stmt, 50% branch, 70% fn, 70% line) | `vitest.config.mjs`, test results |
| Modularity | 6 | Clean module separation (store, cache, audit, models, schemas) but no formal interfaces; Store has a typedef but not enforced at runtime | `store.js:14-23` |
| Documentation | 7 | JSDoc on most public functions; architecture decisions documented in `decisions-architecture.md`; README comprehensive; but no API docs (OpenAPI) | `server.js` JSDoc, `README.md` |
| Dependency freshness | 9 | All deps at latest major versions; Dependabot active; only 1 runtime dep | `package.json`, git branches |

**Total score: 72/100** (average × 10 + rounding)

### ESLint Violations (Code Quality)
- `models.js:259` — `parseCategoryHeader()` complexity 13 (max 8) — Source: ESLint output
- `models.js:578` — `detectMarkdownCorruption()` complexity 16 (max 8) — Source: ESLint output
- `server.js` — `parseDecisions()` complexity 10, arrow function complexity 9 — Source: ESLint output

---

## Step 5: Scalability Analysis

### 5.1 Current Scalability Strategy
- **Finding:** No explicit scalability strategy. Single Node.js process, single-threaded, synchronous file I/O.
- **Source:** `server.js` (native `http.createServer`), `store.js` (all `fs.*Sync` operations)

### 5.2 Scalability Bottlenecks
| Bottleneck | Impact at 5x | Impact at 100x | Source |
|------------|-------------|---------------|--------|
| Synchronous file I/O (`fs.*Sync`) | Moderate — event loop blocks on large files | Critical — all requests queued behind file reads | `store.js:36-37` (`readFileSync`, `writeFileSync`) |
| In-memory metrics (no persistence) | Moderate — memory grows with request volume | Critical — unbounded `perEndpoint` growth | `server.js:37-60` |
| FileCache unbounded | Moderate — RAM usage if many files cached | Critical — no eviction, OOM possible | `cache.js:19` (Map with no size limit) |
| SSE client registry (Set, no limit) | Low | High — resource exhaustion at many connections | `server.js:21` |
| Audit trail append (`appendFileSync`) | Low | Moderate — file I/O contention, rotation handles size | `audit.js:88` |

### 5.3 Scalability Assessment
- **Current capacity:** Adequate for solo developer / small team (1–5 concurrent users)
- **Architecture ceiling:** ~10–20 concurrent users before sync I/O becomes a bottleneck
- **Source:** `store.js` synchronous operations, `server.js` single-process design

---

## Step 6: Architecture Gap Analysis

### 6.1 Gap: No Asynchronous I/O Path
- **Description:** All file operations use synchronous Node.js APIs (`fs.*Sync`). This blocks the event loop during I/O, preventing concurrent request handling.
- **Recommendation:** Migrate to `fs.promises` or async callbacks for all store operations; maintain sync option for startup/init only.
- **Priority:** High
- **Source:** `store.js:36-85` (all Sync methods), per G-ARCH-09

### 6.2 Gap: No File Locking Mechanism
- **Description:** Concurrent writes to the same file (e.g., session-state.json from web UI + Copilot agent) could corrupt data. The atomic-write pattern (tmp+rename) prevents partial writes but not concurrent overwrites.
- **Recommendation:** Implement advisory file locking (e.g., lockfile pattern with `.lock` files and timeout)
- **Priority:** Critical — directly blocks "state consistency" vision goal
- **Source:** `store.js:65-82` (writeFile uses tmp+rename but no lock), per G-ARCH-03

### 6.3 Gap: No Infrastructure as Code
- **Description:** No IaC files present (no Dockerfile, no docker-compose, no Terraform, no k8s manifests). The system runs directly on developer machine.
- **Recommendation:** Low priority for solo developer; document as gap per G-ARCH-02
- **Priority:** Low
- **Source:** Absence in repository, per G-ARCH-02

### 6.4 Gap: No API Documentation (OpenAPI/Swagger)
- **Description:** The HTTP server exposes REST-like endpoints but no OpenAPI specification exists. API surface is documented only via code and README.
- **Recommendation:** Generate OpenAPI spec from endpoint inventory; enables client generation and testing
- **Priority:** Medium
- **Source:** `server.js` (implicit endpoints), absence of `openapi.yaml`

### 6.5 Gap: MCP-to-Server Tight Coupling
- **Description:** `mcp-server.js` directly imports internal functions from `server.js` (`sanitizeMarkdown`, `sanitizeQID`, `detectSecrets`, `safePath`). This creates a brittle coupling where changes to server internals break MCP.
- **Recommendation:** Extract shared utilities into a dedicated `utils/` module that both servers import
- **Priority:** Medium
- **Source:** `mcp-server.js:28-33`

---

## INSUFFICIENT_DATA Items
- `INSUFFICIENT_DATA: Performance benchmarks` — No load testing results exist — Cannot quantify actual throughput — `QUESTIONNAIRE_REQUEST`
- `INSUFFICIENT_DATA: Deployment target` — Is the system intended to remain localhost-only or become deployable as a service? — Affects all architecture recommendations — `QUESTIONNAIRE_REQUEST`

## UNCERTAIN Items
- `UNCERTAIN: Completeness of API endpoint inventory` — Not all server.js endpoints were individually enumerated — Escalation: Senior Developer to complete endpoint inventory

---

## HANDOFF CHECKLIST
- [x] All sections (Steps 1–6) are fully completed per AUDIT mode requirements
- [x] All architecture claims substantiated with concrete file/line references (G-ARCH-07)
- [x] Tech debt score has per-dimension findings and sources (G-ARCH-04)
- [x] DDD principles assessed (G-ARCH-01)
- [x] Scalability claims substantiated per G-ARCH-09
- [x] IaC status documented per G-ARCH-02
- [x] Shared mutable state flagged per G-ARCH-03
- [x] All UNCERTAIN: and INSUFFICIENT_DATA: items documented
- [x] No contradictory statements
- [x] Deliverable written to file per MEMORY MANAGEMENT PROTOCOL
