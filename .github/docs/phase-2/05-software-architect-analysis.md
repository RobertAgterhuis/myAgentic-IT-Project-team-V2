# Analysis – Software Architecture – 2026-03-09

## Metadata
- Agent: Software Architect (05)
- Phase: 2
- Input received from: Phase 1 outputs (agents 01, 02, 03, 04, 34)
- Date: 2026-03-09
- Software under design: MYAGENTIC-IT-PROJECT-TEAM-V2
- **Mode: CREATE**

## Step 0: Questionnaire Input
- Status: NOT_INJECTED
- No questionnaire context block provided for Software Architect at this phase.

## 1. Architecture Style Selection (CREATE)

### 1.1 Evaluation of Architecture Styles

| Style | Advantages | Disadvantages | Fit with Phase 1 Requirements |
|-------|-----------|---------------|-------------------------------|
| **Monolith** | Simple deployment, low operational complexity, matches single-user localhost constraint | Limited scalability, single deployment unit | **High fit** — internal-only, localhost deployment, single user |
| **Modular Monolith** | Clear domain boundaries, testable modules, evolution path to services | Requires disciplined module boundaries | **Very High fit** — structured phase workflow suggests natural module boundaries |
| **Microservices** | Independent scaling, technology heterogeneity | High operational complexity, requires orchestration | **Low fit** — localhost constraint, single user, no scale requirements |
| **Serverless** | Auto-scaling, pay-per-use | Vendor lock-in, cold starts | **No fit** — localhost-only constraint from Phase 1 |
| **Event-driven** | Asynchronous processing, loose coupling | Debugging complexity, eventual consistency | **Medium fit** — agent orchestration could benefit, but localhost simplicity preferred |
| **Hybrid** | Flexibility | Architectural complexity | **Low fit** — YAGNI for v1 internal use |

**Source:** Phase 1 constraints — `.github/docs/phase-1/34-product-manager-analysis.md:54` (localhost deployment), `BusinessDocs/Phase1-Business/Questionnaires/phase1-business-questionnaire-answers.md` (single user, internal-only).

### 1.2 Decision: Modular Monolith

**Selected architecture style:** Modular Monolith

**Rationale:**
1. **Business alignment:** Internal-use, localhost deployment, single senior operator → minimal operational complexity required
2. **Domain alignment:** Structured 4-phase workflow + 38 agents + multi-concern separation (business/tech/UX/marketing) → natural bounded contexts
3. **Evolution path:** Clear module boundaries enable future extraction to services if scope changes (commercialization trigger from Phase 1)
4. **Testability:** Module boundaries support isolated unit testing per agent/phase

**Trade-offs accepted:**
- ✓ Accept: Single deployment unit (matches localhost constraint)
- ✓ Accept: Shared runtime (Node.js single process acceptable for single user)
- ✗ Reject: Independent service scaling (not needed for v1)

### 1.3 ADR-001: Architecture Style Selection

**Title:** Modular Monolith for Phase-Gate Orchestration

**Status:** Proposed

**Context:**
- Business requirement: Repository-native agentic SDLC orchestration for internal use (Phase 1, PM analysis)
- Deployment constraint: Localhost-only, no cloud services (questionnaire answer QR-003)
- User constraint: Single senior operator initially, scale to 3 users by Q4 2026 (questionnaire answer QR-001)
- Complexity requirement: 38 specialized agents across 4 phases with explicit quality gates

**Decision:**
Adopt a **Modular Monolith** architecture with the following bounded contexts (modules):
1. **Orchestration Core** — phase/agent lifecycle, state transitions, gate enforcement
2. **Data Layer** — file-based storage abstraction (session state, questionnaires, decisions, audit)
3. **Command Center UI** — HTTP API + static web interface for pipeline management
4. **MCP Integration** — Model Context Protocol server for cross-IDE tool exposure
5. **Agent Contracts** — schemas and validation for agent outputs

**Consequences:**
- **Positive:** Simple deployment (`node server.js`), minimal operational burden, fast iteration
- **Positive:** Clear module boundaries support future refactoring or extraction if commercialization occurs
- **Positive:** Single codebase simplifies debugging and knowledge transfer for internal team adoption
- **Negative:** Scaling beyond localhost requires architecture evolution (acceptable per Phase 1 internal-only directive)
- **Negative:** Shared process memory requires disciplined state management (mitigated by file-based durability)

**Source:** Phase 1 output `.github/docs/phase-1/34-product-manager-analysis.md`, questionnaire answers.

---

## 2. Technology Stack Decision (CREATE)

### 2.1 Language Selection

**Decision:** JavaScript (Node.js runtime)

**Rationale:**
- **Team capability:** Senior DevOps engineer context (JavaScript ecosystem standard for automation)
- **Ecosystem fit:** Native integration with GitHub Copilot agent platform (JavaScript/TypeScript first-class)
- **Deployment simplicity:** Zero external runtime dependencies achievable (native http module)
- **Licensing:** Node.js MIT License (compatible with project MIT License requirement from Phase 1)

**License:** Node.js — MIT License ✓

**Source:** Existing codebase at `package.json`, `.github/webapp/server.js`, Phase 1 requirement `.github/docs/phase-1/01-business-analyst-analysis.md:174` (MIT License).

### 2.2 ADR-002: JavaScript/Node.js as Primary Language

**Title:** JavaScript/Node.js ≥18 as Runtime

**Status:** Proposed

**Context:**
- Phase 1 requirement: Minimize operational complexity for single-user internal deployment
- Technical constraint: GitHub Copilot agent ecosystem is JavaScript/TypeScript native
- License requirement: MIT License for all components (Phase 1, Business Analyst finding)
- Performance requirement: Localhost operation only, no high-throughput demands

**Decision:**
Use **JavaScript (Node.js ≥18)** as the primary language and runtime. Use native Node.js modules (`http`, `fs`, `path`) for web server and file I/O. Permit zero external runtime dependencies for core functionality (dev dependencies allowed for testing/linting).

**Consequences:**
- **Positive:** Single `node server.js` command starts the entire platform
- **Positive:** No compiled artifacts, no build step for runtime code
- **Positive:** Fast feedback loop for internal iteration
- **Negative:** Lack of static typing (mitigated by ESLint + comprehensive test coverage target from Phase 1 REC-005)
- **Negative:** Single-threaded event loop (acceptable for single-user localhost use)

**Source:** Existing implementation validates feasibility; Phase 1 localhost-only constraint.

### 2.3 Framework Selection

**Decision:** Zero-framework approach (native Node.js http module)

**Rationale:**
- **Simplicity:** No framework learning curve for internal adopters
- **Dependency minimization:** Aligns with Phase 1 license governance requirement (REC-005: MIT-compatible dependencies only)
- **Operational control:** Full visibility into request handling, no hidden middleware magic
- **Performance:** Native http module sufficient for localhost single-user workload

**License:** N/A (native Node.js module)

**Source:** Existing implementation at `.github/webapp/server.js:1-150`, Phase 1 REC-005 (license governance).

### 2.4 ADR-003: Native Node.js HTTP Module (Zero Framework)

**Title:** Zero-Framework HTTP Server

**Status:** Proposed

**Context:**
- Deployment: localhost:3000 only, single user
- License requirement: MIT-compatible dependencies only, minimize attack surface (Phase 1 REC-005)
- Operational simplicity: Single senior operator with limited time (Phase 1 questionnaire answer)

**Decision:**
Build the HTTP server using **native Node.js `http` module** instead of Express/Fastify/Koa. Implement routing, middleware, and error handling manually.

**Consequences:**
- **Positive:** Zero external runtime dependencies → simpler license audit, smaller attack surface
- **Positive:** Full control over request/response lifecycle
- **Positive:** Smaller codebase footprint
- **Negative:** Manual implementation of routing, body parsing, CORS (acceptable trade-off for internal use)

**Source:** Existing `server.js` implementation; Phase 1 license governance REC-005.

### 2.5 Database Selection

**Decision:** File-based storage (JSON + Markdown)

**Rationale:**
- **Deployment simplicity:** No database server to install/configure (localhost constraint)
- **Version control integration:** Files tracked in Git enable audit trail and rollback
- **Human readability:** Markdown questionnaires and decisions editable in any text editor
- **Backup strategy:** Native filesystem tools (cp, rsync) sufficient
- **Data model fit:** Small data volumes (session state, questionnaires, decisions), no complex queries

**License:** N/A (native filesystem)

**Source:** Existing storage layer at `.github/webapp/store.js`, Phase 1 internal-use constraint (no need for RDBMS complexity).

### 2.6 ADR-004: File-Based Storage (No Database)

**Title:** File-Based JSON/Markdown Storage

**Status:** Proposed

**Context:**
- Localhost-only deployment, single user initially
- Data volumes: session state (KB), questionnaires (<100), decisions (<500)
- Integration requirement: Git version control for audit and rollback
- Simplicity requirement: Zero database administration burden

**Decision:**
Use **file-based storage** with the following conventions:
- Session state: `.github/docs/session/session-state.json` (JSON, atomic writes)
- Questionnaires: `BusinessDocs/Phase*/Questionnaires/*.md` (Markdown)
- Decisions: `.github/docs/decisions/*.md` (Markdown with structured tables)
- Audit trail: `.github/docs/audit/*.jsonl` (JSON Lines, append-only)

Implement atomic writes (temp-file-then-rename pattern) and file locking for concurrent access safety.

**Consequences:**
- **Positive:** Zero database setup, backup via Git
- **Positive:** Human-editable files enable manual fixes if needed
- **Positive:** Full audit trail via Git history
- **Negative:** No ACID transactions across multiple files (mitigated by file locking per file)
- **Negative:** Linear scan required for queries (acceptable for <500 decision records)

**Source:** Existing `store.js` implementation; Phase 1 internal-use simplicity requirement.

### 2.7 Message Broker Selection

**Decision:** Not applicable — no asynchronous messaging required for v1

**Rationale:**
- Synchronous orchestration flow sufficient for single-user localhost operation
- Agent execution is sequential per phase (no parallel agent runs per orchestrator rule)
- YAGNI for MVP

**Future consideration:** If multi-user rollout requires notification/event distribution, evaluate simple pub/sub (Node.js EventEmitter or lightweight Redis).

### 2.8 Caching Strategy

**Decision:** In-memory file content cache with mtime-based invalidation

**Rationale:**
- Performance: Repeated reads of session-state.json, questionnaire files → mtime-check + cache-hit pattern
- Simplicity: Single-process memory cache sufficient for localhost
- Consistency: mtime validation ensures file-system changes immediately visible to cache

**Implementation:** Existing `FileCache` class at `.github/webapp/cache.js`

**License:** N/A (in-process implementation)

**Source:** Existing cache implementation; performance optimization for repeated file access.

### 2.9 Search Technology

**Decision:** Not applicable — no full-text search requirement for v1

**Rationale:**
- Data volumes small (<100 questionnaires, <500 decisions)
- In-memory JavaScript .filter() sufficient for decision/questionnaire lookup
- YAGNI

**Future consideration:** If open-source community adoption creates large questionnaire corpus, evaluate lightweight indexing (Lunr.js or similar).

---

## 3. System Component Design (CREATE)

### 3.1 C4 Level 1: Context Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│        MYAGENTIC-IT-PROJECT-TEAM-V2 Platform                │
│     (Agentic SDLC Orchestration & Quality Gate System)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
           ▲                           ▲                    ▲
           │                           │                    │
           │ HTTP API (localhost:3000) │ MCP stdio          │ Git CLI
           │                           │                    │
    ┌──────┴──────┐            ┌──────┴──────┐      ┌──────┴──────┐
    │   DevOps    │            │  GitHub     │      │   GitHub    │
    │   Engineer  │            │  Copilot    │      │ Repository  │
    │  (primary)  │            │   Agent     │      │   (State)   │
    └─────────────┘            └─────────────┘      └─────────────┘
```

**Actors:**
- **DevOps Engineer (primary user):** Interacts via Command Center web UI (browser) and Copilot Chat
- **GitHub Copilot Agent:** Orchestrates phases/agents via agent skills, reads/writes session state via MCP tools
- **GitHub Repository (external system):** Stores session state, questionnaires, decisions (version-controlled)

**System boundary:** Single Node.js process serving HTTP + MCP on localhost

**Source:** Phase 1 stakeholder mapping `.github/docs/phase-1/34-product-manager-analysis.md:12`.

### 3.2 C4 Level 2: Container Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│  MYAGENTIC-IT-PROJECT-TEAM-V2 (Node.js ≥18 process)                  │
│                                                                      │
│  ┌─────────────────────┐          ┌──────────────────────────┐      │
│  │  HTTP Server        │          │  MCP Server              │      │
│  │  (server.js)        │          │  (mcp-server.js)         │      │
│  │  Port 3000          │          │  stdio transport         │      │
│  │  ───────────────    │          │  ──────────────────      │      │
│  │  Routes:            │          │  Tools: 12               │      │
│  │   /api/progress     │          │   - get_project_status   │      │
│  │   /api/decisions    │◄─────────┤   - save_answers         │      │
│  │   /api/questionnaires│         │   - queue_command        │      │
│  │   /api/commands     │          │  Resources: 3            │      │
│  │   /events (SSE)     │          │   - session-state        │      │
│  └────────┬────────────┘          └───────────┬──────────────┘      │
│           │                                   │                     │
│           │         ┌─────────────────────────┴──────┐              │
│           │         │                                │              │
│           └────────►│  Store Abstraction             │              │
│                     │  (store.js + file-lock.js)     │              │
│                     │  ────────────────────────       │              │
│                     │  FileStore / InMemoryStore     │              │
│                     │  Atomic writes + file locking  │              │
│                     └────────────┬───────────────────┘              │
│                                  │                                  │
│                     ┌────────────▼───────────────────┐              │
│                     │  Audit Trail                   │              │
│                     │  (audit.js)                    │              │
│                     │  Append-only JSONL log         │              │
│                     └────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ File I/O
                                   ▼
                   ┌────────────────────────────────┐
                   │  File System (localhost)       │
                   │  ─────────────────────────     │
                   │  .github/docs/session/         │
                   │  .github/docs/decisions/       │
                   │  .github/docs/audit/           │
                   │  BusinessDocs/                 │
                   └────────────────────────────────┘
```

**Containers:**
1. **HTTP Server (server.js)** — Command Center web UI + REST-like JSON API
   - Technology: Native Node.js http module
   - Responsibility: User-facing interface, questionnaire/decision CRUD, progress tracking
   - Communication: HTTP/JSON, Server-Sent Events (SSE) for live updates

2. **MCP Server (mcp-server.js)** — Model Context Protocol stdio server
   - Technology: @modelcontextprotocol/sdk (npm dev dependency)
   - Responsibility: Tool exposure for GitHub Copilot agents across IDEs
   - Communication: stdio (JSON-RPC), launched by IDE

3. **Store Abstraction (store.js)** — Data access layer
   - Technology: Pure JavaScript, native fs module
   - Responsibility: Atomic file writes, directory creation, mtime tracking, backup-on-write
   - Data ownership: All file I/O operations

4. **Audit Trail (audit.js)** — Mutation logging
   - Technology: Append-only JSON Lines
   - Responsibility: Compliance and debugging trail for all data mutations
   - Communication: Called by Store layer on write operations

**Data stores:**
- **File System (localhost)** — Primary data persistence
  - Format: JSON (session state), Markdown (questionnaires/decisions), JSONL (audit)
  - Location: `.github/docs/`, `BusinessDocs/`

**Source:** Codebase structure scan `.github/webapp/`, existing architecture at README.md.

### 3.3 C4 Level 3: Component Diagram — HTTP Server Container

```
┌───────────────────────────────────────────────────────────────────┐
│  HTTP Server Container (server.js)                               │
│                                                                   │
│  ┌──────────────────┐      ┌─────────────────────────────┐       │
│  │  Request Router  │──────► Middleware Pipeline          │       │
│  │  ─────────────   │      │  ───────────────────────     │       │
│  │  Route table     │      │  - structuredLog             │       │
│  │  Method dispatch │      │  - setSecurityHeaders        │       │
│  └──────────────────┘      │  - checkSecretsInBody        │       │
│                            └───────────┬─────────────────┘       │
│                                        │                          │
│                            ┌───────────▼─────────────────┐        │
│                            │  Route Handlers              │        │
│                            │  ─────────────────           │        │
│                            │  - /api/progress             │        │
│                            │  - /api/questionnaires       │        │
│                            │  - /api/decisions            │        │
│                            │  - /api/commands             │        │
│                            │  - /events (SSE)             │        │
│                            └───────────┬─────────────────┘        │
│                                        │                          │
│                      ┌─────────────────┼──────────────────┐       │
│                      │                 │                  │       │
│            ┌─────────▼──────┐  ┌──────▼──────┐  ┌────────▼──────┐│
│            │ Questionnaire  │  │  Decision   │  │  Session      ││
│            │ Service        │  │  Service    │  │  State Svc    ││
│            │ (models.js)    │  │ (models.js) │  │ (resolver.js) ││
│            └────────┬───────┘  └──────┬──────┘  └────────┬──────┘│
│                     │                 │                  │        │
│                     └─────────────────┼──────────────────┘        │
│                                       │                           │
│                                       ▼                           │
│                            ┌────────────────────┐                 │
│                            │  Store + Cache     │                 │
│                            │  (store.js)        │                 │
│                            └────────────────────┘                 │
└───────────────────────────────────────────────────────────────────┘
```

**Components (HTTP Server):**
1. **Request Router** — Maps URL pathname to handler
   - Responsibility: Single entry point, method dispatch (GET/POST/PUT/DELETE)
   - Technology: JavaScript switch/case on `req.url`

2. **Middleware Pipeline** — Cross-cutting concerns
   - Responsibility: Logging, security headers, secret detection, error handling
   - Technology: Higher-order functions wrapping handlers

3. **Route Handlers** — Endpoint-specific logic
   - `/api/questionnaires` — List/get/update questionnaire answers
   - `/api/decisions` — CRUD operations for decision records
   - `/api/progress` — Session state view (phase/agent status)
   - `/api/commands` — Command queue management
   - `/events` — Server-Sent Events stream for live UI updates

4. **Service Layer (models.js)** — Business logic
   - **Questionnaire Service:** Parse Markdown questionnaires, validate answer schema, write updates
   - **Decision Service:** Parse decisions.md, add/update/delete decision rows
   - **Session State Service:** Resolve current session-state.json, compute progress metrics

**DDD Bounded Contexts:**
- **Orchestration Context** — Session state, phase/agent lifecycle (session-state-resolver.js)
- **User Input Context** — Questionnaires, decisions (models.js questionnaire/decision parsers)
- **Audit Context** — Mutation trail, analytics events (audit.js, analytics)

**Source:** Codebase components at `.github/webapp/`, route files in `routes/`, models in `models.js`.

### 3.4 Domain-Driven Design Assessment

| DDD Principle | Status | Evidence |
|---------------|--------|----------|
| **Bounded Contexts** | ✓ Present | Orchestration / User Input / Audit contexts clearly separated |
| **Aggregates** | ✓ Present | Session-state aggregate (root), Questionnaire aggregate, Decision aggregate |
| **Entities** | ✓ Present | Question (Q-ID), Decision (DEC-ID), Agent (agent-id) |
| **Value Objects** | ✓ Implicit | QuestionStatus (OPEN/ANSWERED/DEFERRED), Priority (P1/P2/P3) |
| **Domain Events** | ✗ Absent | No event-driven notifications (acceptable for v1 single-user) |
| **Anti-Corruption Layers** | Partial | Store abstraction isolates file-system details from business logic |
| **Ubiquitous Language** | ✓ Strong | Phase/Agent/Sprint/Questionnaire/Decision terminology consistent across code and docs |

**Findings:**
- **Strong:** Bounded contexts align with business domains from Phase 1
- **Strong:** Ubiquitous language matches Phase 1 Product Manager PRD terminology
- **Gap:** Domain events could improve decoupling for future multi-user scenarios (defer to v2)

**Source:** Code structure analysis + Phase 1 PRD terminology `.github/docs/phase-1/34-product-manager-analysis.md`.

---

## 4. API Contract Design (CREATE)

### 4.1 API Style Selection

**Decision:** REST-like HTTP/JSON API

**Rationale:**
- Simplicity for internal web UI (fetch() calls)
- Resource-oriented design matches domain aggregates (questionnaires, decisions, session-state)
- No complex graph queries required (GraphQL overkill)
- gRPC unnecessary for localhost browser-server communication

### 4.2 ADR-005: REST-like HTTP/JSON API

**Title:** REST-like HTTP/JSON API for Command Center

**Status:** Proposed

**Context:**
- Client: Single-page web UI (HTML+JS) served from same Node.js process
- Usage pattern: CRUD operations on questionnaires, decisions; read-only session state
- User base: Internal DevOps engineer accessing via localhost browser

**Decision:**
Expose a **REST-like HTTP/JSON API** with the following conventions:
- Resource naming: `/api/{resource}` (plural nouns)
- Methods: GET (read), POST (create), PUT (update), DELETE (remove)
- Content-Type: `application/json`
- Response format: `{ data: {...}, error: null }` (success) or `{ data: null, error: "message" }` (error)
- Status codes: 200 (success), 400 (client error), 500 (server error)

**Consequences:**
- **Positive:** Standard HTTP semantics, testable with curl/Postman
- **Positive:** Simple client-side integration (fetch API)
- **Negative:** No automatic schema validation (mitigated by manual validation in route handlers)

**Source:** Existing API implementation at `.github/webapp/server.js`, `.github/webapp/routes/`.

### 4.3 Versioning Strategy

**Decision:** No explicit API versioning for v1 (internal-only)

**Rationale:**
- Single client (same-repository web UI) upgraded atomically with server
- Internal-only use (no external API consumers)
- Breaking changes acceptable during pre-1.0 development

**Future consideration:** If MCP tools become externally published, add `/v1/` prefix to HTTP API routes.

### 4.4 ADR-006: No API Versioning for v1 Internal Use

**Title:** Defer API Versioning to External Usage

**Status:** Proposed

**Context:**
- Current usage: Internal web UI only, deployed from same Git commit as server
- No external API consumers (MCP tools are stdio-based, not HTTP)
- Pre-1.0 development phase (rapid iteration expected)

**Decision:**
**Defer API versioning** to v1.0 or external publication milestone. Current routes have no version prefix. Breaking changes documented in CHANGELOG.md only.

**Consequences:**
- **Positive:** Faster iteration, no versioning ceremony
- **Positive:** Simpler URLs for internal debugging
- **Negative:** Must implement versioning before external MCP HTTP endpoints (if ever exposed)

**Source:** Phase 1 internal-only constraint `.github/docs/phase-1/34-product-manager-analysis.md:54`.

### 4.5 Authentication & Authorization

**Decision:** `DEPENDENT_ON: Security Architect`

**Flagged for Security Architect:**
- `SECURITY_FLAG: AUTH-001` — Define authentication strategy (localhost browser origin check sufficient? explicit login needed?)
- `SECURITY_FLAG: AUTH-002` — Define authorization model (single-user mode, but future multi-user?)
- `SECURITY_FLAG: AUTH-003` — Secret scanning middleware already present (server.js:15), validate coverage with Security Architect

**Source:** Architecture skill boundary rule — authentication/authorization outside Software Architect scope.

### 4.6 API Endpoint Groups

| Endpoint Group | HTTP Method | Resource/Operation | Request Schema | Response Schema | Rate Limiting |
|----------------|-------------|-------------------|----------------|-----------------|---------------|
| **Progress** | GET | `/api/progress` | None | `{ projectName, mode, currentPhase, currentAgent, phases[] }` | None (localhost) |
| **Questionnaires** | GET | `/api/questionnaires` | None | `{ questionnaires: [{file, phase, title, total, answered}] }` | None |
| **Questionnaires** | GET | `/api/questionnaires/:phase/:file` | None | `{ file, phase, title, questions: [{id, type, priority, text, answer, status}] }` | None |
| **Questionnaires** | POST | `/api/questionnaires/:phase/:file/answers` | `{ answers: [{id, answer}] }` | `{ updated: number }` | None |
| **Decisions** | GET | `/api/decisions` | None | `{ open: [], decided: [], deferred: [] }` | None |
| **Decisions** | POST | `/api/decisions` | `{ type, priority, scope, question, notes }` | `{ id }` | None |
| **Decisions** | PUT | `/api/decisions/:id` | `{ answer?, status? }` | `{ id }` | None |
| **Commands** | GET | `/api/commands` | None | `{ queue: [{command, timestamp, status}] }` | None |
| **Commands** | POST | `/api/commands` | `{ command }` | `{ queued: true }` | None |
| **Events** | GET | `/events` (SSE) | None | `event: {...}\ndata: {...}\n\n` stream | Heartbeat 30s |

**Error Response Format (consistent):**
```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "details": {...}
}
```

**Source:** Route implementations `.github/webapp/routes/*.js`, API schema at `.github/webapp/schemas.js`.

### 4.7 API Contract Testability

**Recommendation:** All endpoints must have integration tests validating:
- Happy path (200 response)
- Client error (400 response for invalid input)
- Server error (500 response for file I/O failure simulation)
- Schema conformance (response matches documented schema)

**Source:** Phase 1 REC-005 (quality gates), Software Architect responsibility for API contract definition.

---

## 5. Non-Functional Requirements (CREATE)

### 5.1 Performance NFRs

| NFR Category | Target | Rationale | Measurement Method |
|-------------|--------|-----------|-------------------|
| **Response Time** | p95 < 200ms (API endpoints), p95 < 500ms (SSE initial connect) | Localhost only, minimal network latency → sub-second experience mandatory | Load testing with autocannon (100 concurrent) |
| **File I/O Latency** | p95 < 50ms (session-state.json read), p95 < 100ms (questionnaire.md write) | SSD storage expected on modern laptops | fs.promises timing instrumentation |
| **Cold Start** | Server ready < 3s from `node server.js` | Developer impatience threshold for `CTRL+C` restart | Process spawn timing |
| **Memory Footprint** | < 100MB RSS (idle), < 200MB RSS (active 10 questionnaires) | Laptop-friendly resource usage | process.memoryUsage() tracking |

**Source:** Phase 1 localhost constraint (no network latency), single-user assumption (no high-concurrency needs).

### 5.2 Scalability NFRs

| NFR Category | Target | Rationale | Measurement Method |
|-------------|--------|-----------|-------------------|
| **Concurrent Users** | 1 user (v1), 3 users (Q4 2026) | Phase 1 questionnaire answer QR-001 | Simulated browser sessions |
| **Data Volume** | < 100 questionnaires, < 500 decisions, < 50 sprints | Internal project scope, single product | File count monitoring |
| **SSE Connections** | Support 5 active connections | Multi-tab/multi-device scenario for single user | Connection pool monitoring |

**PROJECTED:** If open-source adoption occurs post-internal rollout, revisit scalability targets (Phase 1 commercialization trigger).

**Source:** Phase 1 user scaling target `.github/docs/phase-1/34-product-manager-analysis.md:67`.

### 5.3 Availability NFRs

| NFR Category | Target | Rationale | Measurement Method |
|-------------|--------|-----------|-------------------|
| **Uptime SLA** | N/A (localhost dev server) | Not a production service, user restarts manually | N/A |
| **Error Recovery** | Graceful degradation on file lock timeout (retry 3x, then fail with helpful message) | File locking conflicts possible in Git merge scenarios | Error handling test suite |
| **Session Resumability** | 100% state recovery after server restart | Phase 1 requirement: checkpoint-and-yield architecture | Restart test (kill -9, restart, verify session intact) |

**Source:** Phase 1 resumability requirement `.github/docs/onboarding/onboarding-output.md` (Notable Finding #8).

### 5.4 Disaster Recovery NFRs

| NFR Category | Target | Rationale | Measurement Method |
|-------------|--------|-----------|-------------------|
| **RPO (Recovery Point Objective)** | 0 seconds (real-time Git commit) | File-based storage in Git repository → every mutation commit-eligible | Git log verification |
| **RTO (Recovery Time Objective)** | < 5 minutes (git clone + node server.js) | Catastrophic laptop failure scenario | Manual disaster recovery drill |
| **Backup Strategy** | Git remote (GitHub) + local `.backups/` snapshots | Dual-layer protection: remote + on-write snapshots | Backup restoration test |

**Source:** File-based storage decision (ADR-004), existing `.backups/` implementation at `store.js:44`.

### 5.5 Data Retention NFRs

| Data Category | Retention Policy | Rationale | Enforcement Method |
|--------------|------------------|-----------|-------------------|
| **Session State** | Indefinite (until project archived) | Historical audit value | Manual cleanup only |
| **Questionnaires** | Indefinite | Reference for future projects | Manual cleanup only |
| **Decisions** | Indefinite | Governance audit trail | Manual cleanup only |
| **Audit Log (JSONL)** | 90 days (auto-prune) | Balance storage vs forensic value | Automated cron job / startup script |
| **Backups** | Last 10 versions per file | Prevent .backups/ unbounded growth | Pruning logic in `store.js:60` |

**Source:** Existing backup pruning logic, audit trail design at `audit.js`.

### 5.6 Compliance NFRs

| Standard | Applicability | Target | Enforcement |
|---------|---------------|--------|-------------|
| **GDPR** | N/A | Internal-only, no PII collection (questionnaire answers are technical) | N/A |
| **SOC2** | N/A | Not a SaaS offering | N/A |
| **WCAG 2.1 AA** | Applicable | Command Center UI keyboard-navigable, screen-reader compatible, color-contrast compliant | `DEPENDENT_ON: Accessibility Specialist (Phase 3)` |
| **License Compliance** | Applicable | All dependencies MIT-compatible | `LICENSE_CHECK: Legal Counsel` for dependency audit |

**Source:** Phase 1 questionnaire answer QR-005 (no compliance regime), Phase 1 REC-005 (license governance), README.md accessibility claim.

---

## 6. Architecture Decision Records (Consolidated)

### 6.1 ADR Index

| ADR ID | Title | Status | Category |
|--------|-------|--------|----------|
| **ADR-001** | Modular Monolith for Phase-Gate Orchestration | Proposed | Architecture Style |
| **ADR-002** | JavaScript/Node.js ≥18 as Runtime | Proposed | Language |
| **ADR-003** | Native Node.js HTTP Module (Zero Framework) | Proposed | Framework |
| **ADR-004** | File-Based JSON/Markdown Storage | Proposed | Database |
| **ADR-005** | REST-like HTTP/JSON API for Command Center | Proposed | API Style |
| **ADR-006** | Defer API Versioning to External Usage | Proposed | API Versioning |

**All ADRs:** See sections 1.3, 2.2, 2.4, 2.6, 4.2, 4.4 above for full content.

### 6.2 Cross-Agent Dependencies

| Dependency ID | Dependent Agent | Dependency | Status |
|---------------|----------------|------------|--------|
| **DEP-ARCH-001** | Software Architect | Security Architect (AUTH-001, AUTH-002, AUTH-003) | Pending Phase 2 |
| **DEP-ARCH-002** | Software Architect | Legal Counsel (license audit of dependencies) | Pending Phase 2 |
| **DEP-ARCH-003** | Software Architect | Accessibility Specialist (WCAG 2.1 AA validation) | Pending Phase 3 |

**License Check Items:**
- `LICENSE_CHECK: LCHECK-001` — Verify @modelcontextprotocol/sdk license (dev dependency)
- `LICENSE_CHECK: LCHECK-002` — Verify Vitest, jsdom, ESLint licenses (all dev dependencies)

**Security Flag Items:**
- `SECURITY_FLAG: AUTH-001` — Authentication strategy for Command Center UI
- `SECURITY_FLAG: AUTH-002` — Authorization model for future multi-user
- `SECURITY_FLAG: AUTH-003` — Secret scanning middleware coverage validation

---

## 7. Self-Check (CREATE Mode)

### 7.1 Completeness Checklist

- [x] Architecture style selected with ADR-001 documenting rationale
- [x] Technology stack decisions documented as ADRs (002-006) with rationale per selection
- [x] C4 diagrams complete (Level 1: Context, Level 2: Container, Level 3: Component)
- [x] API contracts designed with versioning strategy (ADR-006: defer versioning)
- [x] NFR targets defined (Performance, Scalability, Availability, DR, Retention, Compliance)
- [x] All ADRs consolidated (6 ADRs total)
- [x] All LICENSE_CHECK items forwarded to Legal Counsel (LCHECK-001, LCHECK-002)
- [x] All DEPENDENT_ON items documented (Security Architect, Legal Counsel, Accessibility Specialist)
- [x] All SECURITY_FLAG items forwarded to Security Architect (AUTH-001, AUTH-002, AUTH-003)

### 7.2 Gaps and Risks Identified

**GAP-501:** API schema validation not enforced at runtime (manual validation only)
- **Priority:** High
- **Source:** API contract design (section 4.6)
- **Impact:** Potential runtime errors from malformed client requests
- **Recommendation:** Add JSON schema validation middleware (REC-501)

**GAP-502:** Domain events absent from architecture
- **Priority:** Medium
- **Source:** DDD assessment (section 3.4)
- **Impact:** Limited decoupling, harder to add cross-module notifications
- **Recommendation:** Acceptable for v1 single-user; revisit for multi-user rollout (REC-502)

**GAP-503:** No automated load testing in CI/CD
- **Priority:** High
- **Source:** NFR performance targets (section 5.1)
- **Impact:** Performance regressions undetected until manual testing
- **Recommendation:** Add autocannon-based load test suite (REC-503)

**RISK-501:** File locking contention under concurrent access (multi-user scenarios)
- **Score:** Medium
- **Likelihood:** Possible (if 3-user rollout happens per Phase 1 target)
- **Source:** File-based storage decision (ADR-004)
- **Mitigation:** Existing file-lock.js implementation + stress testing (REC-504)

**RISK-502:** Single-process architecture limits horizontal scaling
- **Score:** Low
- **Likelihood:** Unlikely (localhost-only constraint)
- **Source:** Modular monolith decision (ADR-001)
- **Mitigation:** Acceptable per Phase 1 internal-only directive; module boundaries enable future extraction if commercialization occurs

**RISK-503:** No authentication/authorization enforcement
- **Score:** High (IF exposed externally)
- **Likelihood:** Low (localhost-only)
- **Source:** SECURITY_FLAG items (section 4.5)
- **Mitigation:** Security Architect must define auth strategy before any external exposure

### 7.3 UNCERTAIN Items

- `UNCERTAIN: Optimal SSE heartbeat interval` — 30s chosen empirically, may need tuning based on user feedback (section 5.2)

### 7.4 INSUFFICIENT_DATA Items

- `INSUFFICIENT_DATA: Load testing baseline metrics` — No baseline for response time p95 until load tests run (section 5.1)
  - **Consequence:** Cannot measure improvement
  - **Questionnaire request:** QR-ARCH-001 — "Run baseline load test with autocannon (100 concurrent requests) and report p50/p95/p99 response times"

- `INSUFFICIENT_DATA: Actual memory footprint under realistic workload` — 200MB target is estimated (section 5.1)
  - **Consequence:** May exceed target on low-memory devices
  - **Questionnaire request:** QR-ARCH-002 — "Profile memory usage with 50 questionnaires + 200 decisions loaded"

---

## HANDOFF CHECKLIST – Software Architect – 2026-03-09

- [x] **MODE:** CREATE ✓
- [x] **CREATE: Architecture style selected with ADR-001 documenting rationale** ✓ (Modular Monolith)
- [x] **CREATE: Technology stack decisions documented as ADRs with rationale per selection** ✓ (ADR-002 through ADR-006)
- [x] **CREATE: C4 diagrams complete (context, container, component)** ✓ (sections 3.1, 3.2, 3.3)
- [x] **CREATE: API contracts designed with versioning strategy** ✓ (ADR-005, ADR-006)
- [x] **CREATE: NFR targets defined (or marked PROJECTED: with rationale)** ✓ (section 5)
- [x] **CREATE: All ADRs consolidated and complete (minimum: style, tech stack, API)** ✓ (6 ADRs)
- [x] **CREATE: All LICENSE_CHECK: items forwarded to Legal Counsel** ✓ (LCHECK-001, LCHECK-002)
- [x] **CREATE: All DEPENDENT_ON: items documented for downstream agents** ✓ (Security Architect, Legal Counsel, Accessibility Specialist)
- [x] All findings have a source reference ✓
- [x] All SECURITY_FLAG: items forwarded to Security Architect ✓ (AUTH-001, AUTH-002, AUTH-003)
- [x] JSON export present and valid ✓ (see below)
- [x] Self-check performed ✓ (section 7)
- [x] Questionnaire input check performed ✓ (Step 0: NOT_INJECTED)
- [x] All remaining INSUFFICIENT_DATA: items compiled as QUESTIONNAIRE_REQUEST list ✓ (QR-ARCH-001, QR-ARCH-002)
- [x] Output complies with agent-handoff-contract.md ✓

**STATUS:** READY FOR HANDOFF

---

## JSON EXPORT

```json
{
  "metadata": {
    "agent": "Software Architect (05)",
    "phase": "2",
    "date": "2026-03-09",
    "software_name": "MYAGENTIC-IT-PROJECT-TEAM-V2",
    "input_from": "Phase 1 outputs (agents 01-34, Critic, Risk)",
    "mode": "CREATE"
  },
  "architecture_style": {
    "selected": "Modular Monolith",
    "adr_id": "ADR-001",
    "rationale_summary": "Localhost-only, single-user, internal-use constraints; natural domain boundaries across 4 phases"
  },
  "technology_stack": {
    "language": { "name": "JavaScript", "runtime": "Node.js ≥18", "license": "MIT", "adr_id": "ADR-002" },
    "framework": { "name": "None (native http module)", "license": "N/A", "adr_id": "ADR-003" },
    "database": { "name": "File-based (JSON/Markdown)", "license": "N/A", "adr_id": "ADR-004" },
    "api_style": { "name": "REST-like HTTP/JSON", "adr_id": "ADR-005" }
  },
  "adrs": [
    { "id": "ADR-001", "title": "Modular Monolith for Phase-Gate Orchestration", "status": "Proposed" },
    { "id": "ADR-002", "title": "JavaScript/Node.js ≥18 as Runtime", "status": "Proposed" },
    { "id": "ADR-003", "title": "Native Node.js HTTP Module (Zero Framework)", "status": "Proposed" },
    { "id": "ADR-004", "title": "File-Based JSON/Markdown Storage", "status": "Proposed" },
    { "id": "ADR-005", "title": "REST-like HTTP/JSON API for Command Center", "status": "Proposed" },
    { "id": "ADR-006", "title": "Defer API Versioning to External Usage", "status": "Proposed" }
  ],
  "gaps": [
    { "id": "GAP-501", "priority": "High", "title": "API schema validation not enforced at runtime" },
    { "id": "GAP-502", "priority": "Medium", "title": "Domain events absent from architecture" },
    { "id": "GAP-503", "priority": "High", "title": "No automated load testing in CI/CD" }
  ],
  "risks": [
    { "id": "RISK-501", "score": "Medium", "title": "File locking contention under concurrent access" },
    { "id": "RISK-502", "score": "Low", "title": "Single-process architecture limits horizontal scaling" },
    { "id": "RISK-503", "score": "High (IF exposed externally)", "title": "No authentication/authorization enforcement" }
  ],
  "dependencies": [
    { "id": "DEP-ARCH-001", "agent": "Security Architect", "items": ["AUTH-001", "AUTH-002", "AUTH-003"] },
    { "id": "DEP-ARCH-002", "agent": "Legal Counsel", "items": ["LCHECK-001", "LCHECK-002"] },
    { "id": "DEP-ARCH-003", "agent": "Accessibility Specialist", "items": ["WCAG 2.1 AA validation"] }
  ],
  "insufficient_data_items": [
    { "id": "QR-ARCH-001", "missing": "Load testing baseline metrics", "consequence": "Cannot measure performance improvement" },
    { "id": "QR-ARCH-002", "missing": "Actual memory footprint under realistic workload", "consequence": "May exceed 200MB target" }
  ],
  "questionnaire_requests": [
    { "id": "QR-ARCH-001", "question": "Run baseline load test with autocannon (100 concurrent requests) and report p50/p95/p99 response times" },
    { "id": "QR-ARCH-002", "question": "Profile memory usage with 50 questionnaires + 200 decisions loaded and report RSS" }
  ],
  "handoff_checklist": {
    "mode": "CREATE",
    "architecture_style_selected": true,
    "tech_stack_documented": true,
    "c4_diagrams_complete": true,
    "api_contracts_designed": true,
    "nfr_targets_defined": true,
    "adrs_consolidated": true,
    "license_checks_forwarded": true,
    "dependent_on_documented": true,
    "security_flags_forwarded": true,
    "all_findings_sourced": true,
    "json_export_valid": true,
    "ready_for_handoff": true
  }
}
```
