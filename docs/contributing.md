---
layout: default
title: Contributing
nav_order: 6
description:
  How to contribute — branching, commit conventions, PR workflow, testing, and
  code style guidelines.
---

# Contributing

Complete guide for contributing to myAgentic-IT-Project-team.

---

## Development Setup

### Prerequisites

- **Node.js ≥ 18** — [download](https://nodejs.org/)
- **Git** — [download](https://git-scm.com/)
- **VS Code** with
  [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)
  (for agent features)

### Getting Started

```bash
git clone https://github.com/RobertAgterhuis/myAgentic-IT-Project-team.git
cd myAgentic-IT-Project-team
npm install
npm start         # → Open http://127.0.0.1:3000
```

### Useful Commands

| Command                 | Purpose                                |
| ----------------------- | -------------------------------------- |
| `npm start`             | Start the web server on localhost:3000 |
| `npm test`              | Run all tests (Vitest)                 |
| `npm run test:watch`    | Watch mode — re-runs on file changes   |
| `npm run test:coverage` | Generate coverage report               |
| `npm run lint`          | Run ESLint                             |

---

## Architecture Overview

The server is built on **Fastify 5** with a plugin architecture. Key modules:

```
src/webapp/
  server.ts               ← Fastify application factory (composition root)
  app.ts                  ← Application bootstrap
  config.ts               ← Configuration constants
  context.ts              ← Typed request context
  auth.ts                 ← GitHub OAuth + session cookies + RBAC
  plugins/                ← Fastify plugins (body-parser, rate-limit, security-headers)
  routes/                 ← API route handlers (16 route modules)
  route-adapter.ts        ← Legacy route adapter for migration
  route-schemas.ts        ← Fastify JSON Schema definitions
  router.ts               ← Path-template router
  store.ts                ← Storage abstraction (FileStore + InMemoryStore)
  models/                 ← Domain parsing (questionnaires, decisions, session state)
  cache.ts                ← File cache with mtime invalidation
  schemas.ts              ← JSON schema validation (Ajv)
  middleware.ts           ← Security headers, input validation, logging
  redis.ts                ← Redis client (optional, graceful degradation)
  session-store-redis.ts  ← Redis-backed session store
  sse-manager.ts          ← SSE connection manager
  sse-manager-redis.ts    ← Redis pub/sub SSE for multi-instance
  metrics-collector.ts    ← Per-endpoint metrics collector
  audit.ts                ← Mutation audit trail (append-only JSONL)
  strings.ts              ← Externalized UI strings
  file-lock.ts            ← Async per-file mutex
  mcp-server.ts           ← MCP tool server (IDE integration)
  ui/                     ← React SPA (Vite + React + TypeScript + Tailwind CSS)

platform/engine/          ← Domain-agnostic pipeline engine
templates/sdlc/           ← Template pack (agents, contracts, guardrails, playbooks)

tests/
  unit/                   ← Unit tests
  integration/            ← Integration tests (API, SSE, store, regression)
  e2e/                    ← Playwright browser tests
  smoke/                  ← Quick sanity checks
```

### Key Design Decisions

- **Fastify 5 plugin architecture** — Encapsulated plugins for rate limiting,
  security headers, body parsing, CORS, static serving, Swagger docs.
- **Store abstraction** — `FileStore` for production, `InMemoryStore` for tests.
  All I/O goes through the store interface.
- **Typed context** — `context.ts` provides a typed request context shared
  across route handlers.
- **Atomic writes** — `store.writeFile()` writes to a temp file first, then
  renames. Backups are created before overwriting.
- **File locking** — `withFileLock()` serializes concurrent writes per file
  via promise-chaining.
- **GitHub OAuth + RBAC** — `auth.ts` handles authentication; role-based access
  control enforces permissions per endpoint.
- **Optional Redis** — Redis is used for session storage, SSE pub/sub, and
  BullMQ job queues when available. The system gracefully degrades to in-memory
  when Redis is not configured.
- **Checkpoint-and-yield** — Agents run one at a time, saving state to
  `session-state.json` after each step.

---

## Coding Standards

### ESLint Configuration

A single ESLint configuration (`eslint.config.mjs`, flat config) covers the
entire project. The `src/webapp/` override enforces:

| Rule              | Setting                   | Rationale                         |
| ----------------- | ------------------------- | --------------------------------- |
| `complexity`      | max 8                     | Keep functions small and testable |
| `no-unused-vars`  | error (ignore `_` prefix) | Remove dead code                  |
| `no-var`          | error                     | Use `const`/`let` only            |
| `prefer-const`    | error                     | Immutability by default           |
| `eqeqeq`          | error                     | Prevent type coercion bugs        |
| `no-eval`         | error                     | Security: prevent code injection  |
| `no-implied-eval` | error                     | Security: prevent indirect eval   |

### Style Guidelines

- **`const` by default**, `let` only when reassignment is needed
- **Function complexity ≤ 8** — extract helpers if a function grows too complex
- **No unnecessary dependencies** — if you need functionality, implement it
  or use Node.js built-ins
- **Externalize user-facing strings** to `strings.ts`
- **All errors** use the structured error catalog in `utils/errors.ts`
- **Tests use InMemoryStore** — never touch the real filesystem in tests

### Security Requirements

All code must be free from OWASP Top 10 vulnerabilities:

- Sanitize all user input (see `sanitizeMarkdown`, `sanitizeQID` in middleware)
- Use `safePath()` to prevent path traversal
- Detect and warn on secret patterns (`detectSecrets()`)
- Set security headers on every response (Fastify security-headers plugin)
- No `eval()`, no `Function()`, no dynamic code execution

---

## Commit Message Convention

```
<type>: <short summary>

<optional body — explain what and why>
```

**Types:** `feat`, `fix`, `test`, `docs`, `refactor`, `chore`

**Examples:**

```
feat: add mutation audit trail with JSONL logging
fix: reduce safeWriteSync complexity below ESLint threshold
test: add 67 regression tests covering Sprints 1-6
docs: update README with badges and technology stack
```

---

## Pull Request Process

1. **Create a feature branch** from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the coding standards above.

3. **Run tests** and ensure all pass:

   ```bash
   npm test
   ```

4. **Run ESLint** and fix any issues:

   ```bash
   npm run lint
   ```

5. **Check coverage** hasn't dropped below thresholds:

   ```bash
   npm run test:coverage
   ```

6. **Commit** with a descriptive message following the convention above.

7. **Push and open a PR** against `main`. Include:
   - What the change does and why
   - Link to any related GitHub issue
   - Confirmation that tests pass and lint is clean

8. **Documentation check** — if your change affects APIs, architecture,
   dependencies, or configuration, update the relevant `docs/` pages.

---

## Development Cookbook

### Adding an API Endpoint

1. Create or extend a route handler in `src/webapp/routes/`.
2. Register the Fastify route with JSON Schema validation.
3. Add user-facing strings to `strings.ts` if the response includes messages.
4. Add error codes to `utils/errors.ts` if the endpoint can fail in new ways.
5. Write tests — use `InMemoryStore` (never real filesystem):
   ```js
   import { createTestServer } from './server.test-helpers.js';
   ```

### Adding a New Tab to the UI

The UI is a React SPA in `src/webapp/ui/`. Components use React + TypeScript
with Tailwind CSS and Radix UI primitives.

1. Create a new component in `src/webapp/ui/src/components/`.
2. Add a route or tab entry in the app layout.
3. Fetch data from your API endpoint using TanStack Query hooks.

### Adding a New Model Parser

Model parsers live in `models/`. They transform raw file content into
structured data.

1. Export a new function from the relevant models file.
2. Write unit tests (follow the pattern in existing test files).
3. Use the parser in your API handler via `store.readFile()` + your parser.

### Adding Validation Schemas

JSON schemas live in `schemas.ts`. Used by endpoints that accept POST bodies.

1. Add your schema to `schemas.ts`.
2. Validate in your handler using Ajv.

### Key Patterns to Follow

| Pattern                     | Where                        | Why                                    |
| --------------------------- | ---------------------------- | -------------------------------------- |
| Use `store` abstraction     | All file I/O                 | Enables `InMemoryStore` in tests       |
| Use `store.writeFile()`     | All writes                   | Atomic writes with backup              |
| Use `safePath()`            | All user-provided paths      | Prevents path traversal                |
| Use `detectSecrets()`       | All user input saved to disk | Prevents accidental credential storage |
| Use security-headers plugin | All responses                | CSP, X-Frame-Options, etc.             |
| Use `strings.ts`            | All user-facing text         | Externalized for maintainability       |
| Use `utils/errors.ts`       | All error responses          | Consistent error codes                 |

---

## Questions?

Open a
[GitHub Issue](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/issues)
for questions, bug reports, or feature requests.
