# myAgentic-IT-Project-team-v2

[![CI](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/actions/workflows/ci.yml/badge.svg)](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-green.svg)](https://nodejs.org/)

An agentic SDLC platform focused on orchestration, governance, and traceable delivery.

## Positioning (Candid)

This project is strongest as a control plane for software delivery.

- Trust now: orchestration, gated phases, handoffs, auditability, policy guardrails, and documentation flow.
- Not fully trusted yet: unattended end-to-end autonomous implementation lane with no human supervision.

In short: this is a reliable system for coordinating and governing work across many specialized agents. It is not presented as a fully self-sufficient software engineering agent.

## What This Platform Does Well

- Runs structured SDLC modes (CREATE, AUDIT, FEATURE, REEVALUATE, etc.).
- Enforces phase gates and critic/risk checkpoints before progression.
- Produces machine-readable artifacts and persistent project memory.
- Standardizes agent behavior through global guardrails and contracts.
- Supports implementation with human-in-the-loop control (CONTINUE model).

## What Is Still Maturing

- Autonomous execution quality under broad, real-world engineering variance.
- Stability and confidence of fully unattended PR-to-merge workflows.
- Cross-environment reproducibility of "single-command autonomous delivery".

The roadmap emphasis is improving the autonomous software delivery lane while preserving the current governance strengths.

## Quick Start

```bash
npm ci
npm ci --prefix src/webapp/ui
npm start
```

Then open http://127.0.0.1:3000

Health check (optional):

```bash
curl http://127.0.0.1:3000/api/health
```

Notes:

- `npm start` runs the server in the foreground (it should keep running).
- If port 3000 is already in use, stop the conflicting process and run `npm start` again.

## Core Commands

```bash
# Run server
npm start

# Build
npm run build

# Lint and type-check
npm run lint
npm run typecheck

# Tests
npm test
npm run test:coverage
npm run test:coverage:gate

# MCP server mode
npm run start:mcp
```

## Runtime Notes

- Engine baseline: Node.js 22+ (see package.json engines).
- Local mode supports file/SQLite-backed workflows and optional Redis.
- Production mode is designed to fail closed when required providers are unavailable.

## Runtime Configuration

Operational route and runtime tuning is centralized in `src/webapp/config.ts` and can be overridden with env vars.

- `OBSERVABILITY_SSE_MAX_CLIENTS`: max concurrent SSE observability clients. Default `50`.
- `WEB_VITALS_SAMPLE_RETENTION_LIMIT`: retained browser vitals samples persisted under `BusinessDocs/metrics/web-vitals.json`. Default `250`.
- `RAG_FRESHNESS_STALE_SEC`: threshold used to mark RAG freshness collections as stale. Default `3600`.
- `MCP_HEALTH_INTERVAL_MS`: MCP governance health polling interval. Default `30000`.
- `MCP_HEALTH_FAILURE_THRESHOLD`: consecutive MCP health failures before unhealthy status. Default `3`.
- `STATIC_LOCALE_CACHE_MAX_AGE_SECONDS`: cache-control max-age for locale JSON assets. Default `3600`.

## Architecture Snapshot

- Server: Fastify-based web application in src/webapp.
- UI: React/Vite app in src/webapp/ui.
- SDLC templates/contracts/guardrails: templates/sdlc.
- Platform schema and generation: platform/schema and scripts/generate-platform.js.
- Business and synthesis artifacts: BusinessDocs.

## Repository Layout

- src: webapp backend and frontend
- templates: SDLC agent skills, contracts, and guardrails
- platform: canonical schema and engine metadata
- docs: concise GitHub Pages documentation (developers + end-users)
- docs_bak: archived legacy documentation set
- tests: unit, integration, e2e, security, and load checks
- BusinessDocs: generated/curated project artifacts and decisions

## Trust Model for Teams

Use this platform as:

- A governed orchestration layer for multi-agent SDLC work.
- A decision and evidence trail for audits and release reviews.
- A supervised implementation assistant, not a blind autopilot.

Recommended operating model:

1. Let agents generate analysis/design/implementation proposals.
2. Keep human approval at gate transitions and release-critical steps.
3. Use CI gates as hard quality boundaries before merge/deploy.

## Documentation

- [GitHub Pages docs home](docs/index.md)
- [Platform overview](docs/README.md)
- [Developer quick start](docs/getting-started/developers.md)
- [End-user quick start](docs/getting-started/end-users.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Code of conduct](CODE_OF_CONDUCT.md)

Note: the previous full documentation set is preserved in `docs_bak`.

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then run:

```bash
npm run format
npm run lint
npm run test:coverage
```

## License

[MIT](LICENSE)
