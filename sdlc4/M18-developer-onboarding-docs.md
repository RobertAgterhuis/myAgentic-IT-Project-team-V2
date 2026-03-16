# M18: Developer Onboarding & Documentation Accuracy

> **Impact:** LOW | **Breaking changes:** NONE | **Blocks:** nothing |
> **Blocked by:** nothing
>
> **Audit reference:** Weakness #2 — "The root build script says 'no build step
> required' while the repo clearly contains a separate UI build pipeline."
> Also general observation that architecture quality (8.5/10) is ahead of
> documentation.
>
> **Validation:** CONFIRMED. Root `package.json` has `"build": "echo 'No build
step required'"` but the UI workspace requires `npm run build` to produce the
> SPA bundle served by the server. README marketing language and actual developer
> workflow have drifted apart.

---

## Rationale

Documentation drift erodes trust. A new contributor hitting "no build step
required" and then finding the UI doesn't load will lose confidence in the
project's maturity — the exact opposite of what the architecture deserves.

---

## Issues

### M18-001: Fix root build script

**Labels:** `dx`, `docs`

Replace `"build": "echo 'No build step required'"` with:

```json
"build": "npm run --workspace=src/webapp/ui build"
```

Or if the root build should also build design tokens:

```json
"build": "npm run tokens:build && npm run --workspace=src/webapp/ui build"
```

**Acceptance criteria:**

- [ ] `npm run build` at root actually builds the UI
- [ ] Build output is placed where `server.ts` expects it
- [ ] CI uses the same build command

---

### M18-002: Create architecture overview document

**Labels:** `docs`, `architecture`

Create `docs/architecture.md` with:

- Layer diagram: platform/engine → platform/schema → platform/sdlc →
  src/webapp → src/webapp/ui
- Data flow: user action → UI → HTTP API → server → engine → state machine →
  persistence
- MCP flow: IDE → MCP server (stdio) → file store
- Module inventory table (file count, purpose, test count per layer)

**Acceptance criteria:**

- [ ] `docs/architecture.md` exists
- [ ] Diagram matches actual codebase structure (validated against file listing)
- [ ] Linked from README

---

### M18-003: Create local development quickstart

**Labels:** `dx`, `docs`

Create or update `docs/quick-start.md` with exact steps:

1. Prerequisites (Node.js version, npm version)
2. `npm install` (root + workspaces)
3. `npm run build` (builds UI)
4. `npm start` (starts server on port 3000)
5. Open `http://localhost:3000`
6. `npm test` (runs all tests)
7. `npm run storybook` (if applicable)
8. Docker: `docker compose -f infra/docker-compose.dev.yml up`

**Acceptance criteria:**

- [ ] A new developer can go from clone to running application by following the
      guide exactly
- [ ] Every command in the guide has been verified
- [ ] Guide covers both local and Docker workflows

---

### M18-004: Align README with actual project state

**Labels:** `docs`

Review and update `README.md`:

- Remove or update any "no build step" language
- Update test count (currently advertises 1,370 — verify actual count)
- Ensure feature list matches implemented features
- Add architecture-layer summary (link to `docs/architecture.md`)
- Verify all links work

**Acceptance criteria:**

- [ ] README accurately reflects current project state
- [ ] All claims are verifiable against the codebase
- [ ] No dead links

---

### M18-005: Document MCP server setup for IDE users

**Labels:** `dx`, `docs`, `mcp`

Create `docs/mcp-setup.md`:

- How to configure VS Code / Copilot to use the MCP server
- Available tools (17) and resources (3) with brief descriptions
- Example interactions
- Troubleshooting common issues

**Acceptance criteria:**

- [ ] MCP setup guide exists and is linked from README
- [ ] A user unfamiliar with MCP can configure it by following the guide
