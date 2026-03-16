# Contributing to myAgentic-IT-Project-team

Thank you for your interest in contributing! This guide covers everything you
need to get started.

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
# 1. Clone the repository
git clone https://github.com/RobertAgterhuis/myAgentic-IT-Project-team.git
cd myAgentic-IT-Project-team

# 2. Install dev dependencies
npm install

# 3. Run the test suite
npm test

# 4. Start the web UI (optional)
npm start
# → Open http://127.0.0.1:3000
```

### Useful Commands

| Command                        | Purpose                                |
| ------------------------------ | -------------------------------------- |
| `npm start`                    | Start the web server on localhost:3000 |
| `npm test`                     | Run root tests (Jest, 363 tests)       |
| `npm run test:vitest`          | Run vitest tests (1239 tests)          |
| `npm run test:vitest:watch`    | Watch mode — re-runs on file changes   |
| `npm run test:vitest:coverage` | Generate coverage report               |
| `npm run test:all`             | Run all tests (vitest + Jest)          |
| `npm run lint`                 | Run ESLint                             |

---

## Architecture Overview

```
src/webapp/           ← Web application (the code you'll work with most)
  server.ts               ← HTTP server, route handlers, SSE, metrics
  store.ts                ← Storage abstraction (FileStore + InMemoryStore)
  models.ts               ← Domain parsing (questionnaires, decisions, session state)
  cache.ts                ← File cache with mtime invalidation
  schemas.ts              ← JSON schema validation
  strings.ts              ← Externalized UI strings
  audit.ts                ← Mutation audit trail (append-only JSONL)
  utils/errors.ts         ← Error catalog with structured responses
  utils/secret-utils.ts   ← Secret pattern detection + warning formatting
  ui/                     ← React SPA (Vite + React + TypeScript + Tailwind CSS)

templates/sdlc/   ← Template pack (agents, contracts, guardrails, playbooks)
platform/engine/  ← Domain-agnostic pipeline engine

tests/
  unit/                   ← Unit tests (models, cache, schemas, sanitization, etc.)
  integration/            ← Integration tests (API, SSE, store, regression suite)
```

### Key Design Decisions

- **Minimal runtime dependencies** — The HTTP server uses only Node.js built-in
  modules (`http`, `fs`, `path`, `url`, `crypto`). Runtime dependencies are
  limited to MCP SDK, Ajv (schema validation), and tsx (TypeScript runner).
  Dev dependencies (Vitest, ESLint) are test/lint-only.
- **Store abstraction** — `FileStore` for production, `InMemoryStore` for tests.
  All I/O goes through the store interface.
- **Atomic writes** — `safeWriteSync()` writes to a temp file first, then
  renames. Backups are created before overwriting.
- **Localhost only** — The server binds to `127.0.0.1`. No network exposure, no
  authentication required.
- **Checkpoint-and-yield** — Agents run one at a time, saving state to
  `session-state.json` after each step.

---

## Coding Standards

### ESLint Configuration

A single ESLint configuration (`eslint.config.mjs`, flat config) covers the entire project.
The `src/webapp/` override enforces:

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

- Sanitize all user input (see `sanitizeMarkdown`, `sanitizeQID` in server.ts)
- Use `safePath()` to prevent path traversal
- Detect and warn on secret patterns (`detectSecrets()`)
- Set security headers on every response (`setSecurityHeaders()`)
- No `eval()`, no `Function()`, no dynamic code execution

---

## Commit Message Convention

Use descriptive commit messages with this format:

```
<type>: <short summary>

<optional body — explain what and why>
```

**Types:**

- `feat:` — New feature or functionality
- `fix:` — Bug fix
- `test:` — Test additions or fixes
- `docs:` — Documentation changes
- `refactor:` — Code restructuring without behavior change
- `chore:` — Build, tooling, or dependency changes

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

3. **Run both test suites** and ensure all tests pass:

   ```bash
   # Root suite (Jest)
   npm test

   # .github/ suite (Vitest)
   cd .github
   npm test
   ```

4. **Run ESLint** and fix any issues:

   ```bash
   cd .github
   npm run lint
   ```

5. **Check coverage** hasn't dropped below thresholds:

   ```bash
   cd .github
   npm run test:coverage
   ```

6. **Commit** with a descriptive message following the convention above.

7. **Push and open a PR** against `main`. Include:
   - What the change does and why
   - Link to any related GitHub issue
   - Confirmation that tests pass and lint is clean

### PR Review Checklist

- [ ] All tests pass (`npm test`)
- [ ] ESLint reports 0 errors (`npm run lint`)
- [ ] Coverage thresholds met (`npm run test:coverage`)
- [ ] No secrets or credentials in committed code
- [ ] Security headers maintained on new endpoints
- [ ] New user-facing strings added to `strings.ts`
- [ ] New errors added to `utils/errors.ts` catalog

---

## Questions?

Open a
[GitHub Issue](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team/issues)
for questions, bug reports, or feature requests.
