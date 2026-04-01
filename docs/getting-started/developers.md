# Developer Quick Start

## Prerequisites

- Node.js 22+
- npm

## Local Setup

```bash
npm ci
npm ci --prefix src/webapp/ui
npm start
```

Open: `http://127.0.0.1:3000`

## Core Dev Commands

```bash
npm run build
npm run lint
npm run typecheck
npm run test:coverage
```

## Expected Workflow

1. Create a feature branch.
2. Implement changes with tests.
3. Run format, lint, coverage.
4. Open PR to `main`.
5. Merge only when CI is green.

See also: [Developer Workflow](../developer/workflow.md)
