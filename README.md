# myAgentic-IT-Project-team – End-to-End Software Solution Creation & Audit

[![CI](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/actions/workflows/ci.yml/badge.svg)](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/actions/workflows/ci.yml)
[![Storybook CI](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/actions/workflows/storybook.yml/badge.svg)](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/actions/workflows/storybook.yml)
[![Coverage: 75%+ enforced](https://img.shields.io/badge/Coverage-75%25%2B%20enforced-brightgreen.svg)](#testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-green.svg)](https://nodejs.org/)
[![ESLint: 0 errors](https://img.shields.io/badge/ESLint-0%20errors-brightgreen.svg)](#code-quality)

A **multi-agent system** of 38+ specialized AI agents that creates complete,
production-ready software solutions — or audits existing ones — through a
structured four-phase analysis followed by supervised sprint-by-sprint
implementation (human-in-the-loop, CONTINUE-to-proceed).

> **Quick result:** A full Phase 1–4 cycle that takes 7–10 weeks manually
> completes in **5–10 working days** with this agentic team, requiring only
> **7–12 hours of active attention** from you.

---

## Quick Start

```bash
npm install
cd src/webapp/ui && npm install && cd ../../..
npm run build
npm start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) — select **CREATE** or
**AUDIT**, paste the command into Copilot Chat, and type **CONTINUE** after each
agent completes.

Platform-specific AI instruction files are generated during `npm install`.
For GitHub Copilot, this project intentionally keeps both `.github/instructions/*.instructions.md`
for modern VS Code clients and `.github/copilot-instructions.md` for GitHub-hosted
Copilot and older clients.

---

## Technology Stack

| Layer      | Technology                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Runtime    | Node.js 22                                                                                                                    |
| Server     | [Fastify 5](https://fastify.dev/) with plugin architecture (cors, rate-limit, static, swagger)                                |
| Auth       | GitHub OAuth + session cookies + RBAC (role-based access control)                                                             |
| Queue      | [BullMQ](https://docs.bullmq.io/) (optional Redis-backed job queue, graceful degradation to sync)                             |
| Data       | File-based JSON/Markdown + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) + optional [Redis](https://redis.io/) |
| MCP Server | [Model Context Protocol](https://modelcontextprotocol.io/) via stdio transport                                                |
| Logging    | [pino](https://getpino.io/) structured JSON logging                                                                           |
| Testing    | [Vitest](https://vitest.dev/) (3,000+ tests across 100+ files), coverage 75%+ enforced                                        |
| Linting    | [ESLint](https://eslint.org/) (flat config, `eslint.config.mjs`)                                                              |
| AI Agents  | [GitHub Copilot](https://github.com/features/copilot) agents in VS Code, Visual Studio, JetBrains                             |

---

## Runtime Profiles

The system supports explicit runtime profiles for different deployment contexts:

### Local Development (Default)

**Usage:** `npm start` (no environment variables needed)

- **Storage:** File-based JSON in `BusinessDocs/` folder
- **Queue:** In-memory (does not survive restart)
- **Sessions:** SQLite in `.agentic/sessions.db`
- **Redis:** Not required
- **Startup behavior:** Tolerates missing services; continues with fallback modes
- **Auth:** GitHub OAuth optional for localhost development; non-local binding requires OAuth or API_KEY
- **Characteristics:** Zero-config, ideal for single-operator development

### CI/Test

**Usage:** `NODE_ENV=test npm test`

- Same as Local Development
- Rate limiting disabled in test environments
- All providers use in-memory or local file storage
- No external services required

### Production (Single Node)

**Usage:** `NODE_ENV=production STORAGE_PROVIDER=sqlite STORAGE_PATH=/data/agentic.db npm start`

- **Storage:** SQLite (persistent database)
- **Queue:** Persistent (on-disk state)
- **Sessions:** SQLite
- **Redis:** Optional for pub/sub and metrics
- **Startup behavior:** **Fails (exit 1) if storage provider cannot initialize** — no fallback allowed
- **Auth:** Requires GitHub OAuth OR API_KEY (minimum 24 characters)
- **Network:** Runtime profile contract is validated at startup; non-localhost requires explicit `TRUST_PROXY` and auth
- **Characteristics:** Single-instance deployment with durable state

### Production (Distributed)

**Usage:** Set `QUEUE_PROVIDER=bullmq`, `SESSION_STORE=redis`, `REDIS_URL=redis://...`

- **Storage:** SQLite (shared database)
- **Queue:** BullMQ (Redis-backed, survives restart, enables concurrency)
- **Sessions:** Redis (distributed, shared across instances)
- **Redis:** Required; startup fails if `REDIS_URL` is set but unreachable
- **Startup behavior:** Strict fail-closed semantics; all services must be available
- **Auth:** Requires GitHub OAuth OR API_KEY
- **Network:** Load balancer in front; `TRUST_PROXY` must be configured
- **Characteristics:** Multi-instance high-availability, shared state, horizontal scale

---

## Documentation

| Document                                                  | Description                                          |
| --------------------------------------------------------- | ---------------------------------------------------- |
| [User Manual](docs/getting-started/user-manual.md)        | Getting started, commands, questionnaires, decisions |
| [Technical Manual](docs/reference/technical-manual.md)    | Architecture, API reference, configuration, security |
| [Architecture](docs/architecture/overview.md)             | Layer diagram, data flow, module inventory           |
| [Contributing](docs/contributing.md)                      | Development setup, coding standards, PR process      |
| [Data Dictionary](docs/reference/data-dictionary.md)      | Entity catalog, field schemas, validation rules      |
| [MCP Setup](docs/getting-started/mcp-setup.md)            | Cross-IDE MCP server configuration                   |
| [Release Checklist](docs/operations/release-checklist.md) | Pre-release verification steps                       |

---

## Testing

```bash
npm test              # Run all tests (Vitest)
npm run test:coverage # Coverage report
npm run test:watch    # Watch mode
npm run lint          # ESLint (0 errors, 0 warnings)
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for quick setup, or
[docs/contributing.md](docs/contributing.md) for the full guide.

---

## Community

- **[Discussions](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/discussions)** — Questions, ideas, show & tell
- **[Issues](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/issues)** — Bug reports and feature requests

---

## License

[MIT](LICENSE) — Copyright (c) 2026 Robert Agterhuis
