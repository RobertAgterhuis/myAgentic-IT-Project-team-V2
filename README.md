# myAgentic-IT-Project-team – End-to-End Software Solution Creation & Audit

[![CI](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/actions/workflows/ci.yml/badge.svg)](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/actions/workflows/ci.yml)
[![Storybook CI](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/actions/workflows/storybook.yml/badge.svg)](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/actions/workflows/storybook.yml)
[![Coverage: 75%+ enforced](https://img.shields.io/badge/Coverage-75%25%2B%20enforced-brightgreen.svg)](#testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js ≥ 18](https://img.shields.io/badge/Node.js-%E2%89%A518-green.svg)](https://nodejs.org/)
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

---

## Technology Stack

| Layer      | Technology                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Runtime    | Node.js ≥ 18                                                                                                                  |
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
