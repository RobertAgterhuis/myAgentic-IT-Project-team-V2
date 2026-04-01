# Developer Architecture

## Main Components

- `src/webapp`: Fastify backend and API routes.
- `src/webapp/ui`: React/Vite frontend.
- `platform`: schema, standards, and engine support modules.
- `templates`: SDLC templates, contracts, and guardrails.
- `BusinessDocs`: generated project artifacts and decisions.

## Runtime Model

- Requests enter Fastify routes.
- Services enforce orchestration and policy checks.
- Persistent artifacts are written for auditability.

## Design Goal

Prioritize controlled delivery, traceability, and safe progression through gates.
