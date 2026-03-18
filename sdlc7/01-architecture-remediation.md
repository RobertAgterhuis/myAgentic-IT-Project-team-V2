# Architecture Remediation

## Current Assessment

The architecture is real and mostly sensible. The backend is modular, the UI is its own package, and the platform layer exists as a distinct kernel. The problem is not absence of architecture. The problem is that the repository currently presents multiple architecture stories at once.

## Validated Findings

- `src/webapp/config.ts` exposes multiple runtime modes for storage, queueing, session storage, and Redis integration.
- `src/webapp/store.ts` still centers the default model on synchronous `FileStore` semantics.
- `src/webapp/server.ts` initializes a storage provider abstraction but can still continue startup without one.
- `src/webapp/README.md` still describes the system as having `No database`.
- `docs/reference/technical-manual.md` mixes a modern Fastify plus React plus optional Redis story with an older file-centric deployment framing.
- `src/webapp/server.legacy.ts` still exists, which keeps the migration story open.

## My Opinion

The architecture is good enough to evolve, but it is not internally settled. Right now the codebase supports a provider-based future while still documenting and partially operating like a single-node file-backed application. That ambiguity is dangerous because it leaks into operations, support, testing, and security assumptions.

## Target State

The repository should have one canonical production architecture and one explicit local-development architecture.

### Canonical production architecture should define:

- required storage provider
- required queue provider
- required session store
- required SSE topology
- required authentication mode
- required host and proxy assumptions
- startup rules for missing dependencies

### Local development architecture should define:

- what degraded modes are allowed
- what data durability guarantees are intentionally weaker
- what security shortcuts are acceptable only on localhost

## How I Would Fix It

### Fix 1: Declare supported runtime profiles

Create explicit runtime profiles such as:

- `local-dev`
- `ci-test`
- `production-single-node`
- `production-distributed`

Each profile should define exact allowed values for:

- `STORAGE_PROVIDER`
- `QUEUE_PROVIDER`
- `SESSION_STORE`
- `REDIS_URL`
- auth requirements
- SSE mode

### Fix 2: Enforce profile validity at startup

Add a startup validator that fails boot when the chosen profile is invalid. For example:

- production profiles must not allow auth-disabled mode
- distributed profile must require Redis-backed SSE and persistent queueing
- production profiles must not continue when storage provider initialization fails

### Fix 3: Remove or quarantine legacy server code

Choose one of these outcomes:

- delete `src/webapp/server.legacy.ts`
- move it into an explicit `legacy/` area with a retirement note
- document it as test fixture only if it truly still serves a purpose

Do not leave it as a normal sibling of the active server entry point.

### Fix 4: Rewrite the architecture manuals around the actual runtime contract

Update:

- `src/webapp/README.md`
- `docs/reference/technical-manual.md`
- top-level `README.md`

The new docs should stop mixing the file-only story with the provider-based runtime story.

## Milestone Candidate

Milestone: Runtime Consolidation and Architecture Contract

## Epic Candidates

### Epic: Define canonical deployment architecture

Suggested issues:

- Define supported runtime profiles and environment contract
- Implement startup profile validation
- Document local versus production architecture clearly

### Epic: Remove legacy server ambiguity

Suggested issues:

- Audit current need for `server.legacy.ts`
- Remove or isolate legacy server path
- Remove coverage exclusions that exist only for legacy residue

## Acceptance Criteria

- There is one documented production runtime path.
- Startup fails closed when production requirements are not met.
- Legacy server code is either removed or formally isolated.
- Architecture docs describe the code as it actually runs today.
