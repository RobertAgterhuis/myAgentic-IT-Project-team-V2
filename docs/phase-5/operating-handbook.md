# Operating Handbook — Agentic SDLC Platform

| Field             | Value                                       |
| ----------------- | ------------------------------------------- |
| **Document**      | GA Operating Handbook                       |
| **Version**       | 1.0                                         |
| **Created**       | 2026-03-12                                  |
| **Audit Finding** | F-12 (MEDIUM) — Operator documentation gaps |
| **Issue**         | #144                                        |

---

## 1. Starting and Stopping

### Start the Command Center

```bash
node src/webapp/server.js
```

The server binds to `127.0.0.1:3000` (localhost only). Open
[http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

### Start with Docker (includes Matomo analytics)

```bash
docker compose up --build
```

Services:

- Command Center: [http://127.0.0.1:3000](http://127.0.0.1:3000)
- Matomo analytics: [http://127.0.0.1:8080](http://127.0.0.1:8080)

### Stop

- **Node.js**: Press `Ctrl+C` in the terminal
- **Docker**: `docker compose down` (add `-v` to also remove analytics data)

---

## 2. Monitoring

### Server Health

The server logs all requests as structured JSON to stdout:

```json
{
  "level": "info",
  "event": "request",
  "method": "GET",
  "url": "/",
  "status": 200,
  "ms": 12
}
```

Logs are not persisted to disk — pipe to a file if you need a log history:

```bash
node src/webapp/server.js 2>&1 | tee server.log
```

### Session State

Check the current session state at any time:

```bash
cat docs/session/session-state.json | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).status))"
```

Or via the Command Center dashboard (Pipeline tab).

### Audit Trail

All data mutations are logged to the terminal as structured events. The
`AuditTrail` module records:

- Timestamp
- Operation (create, update, delete)
- Target file
- Actor (server route that triggered the write)

---

## 3. Troubleshooting

### Port 3000 already in use

```bash
# Find the process using port 3000
# Windows:
netstat -ano | findstr :3000
# macOS/Linux:
lsof -i :3000

# Kill it or use a different port:
PORT=3001 node src/webapp/server.js
```

### Command Center shows stale data

The web UI uses SSE (Server-Sent Events) for real-time updates. If the
connection drops:

1. Check the browser console for SSE errors
2. Refresh the page (F5)
3. Restart the server if the issue persists

### Session state corrupted

The server creates backups before overwriting session state. To restore:

1. Check for `.bak` files in `docs/session/`
2. Copy the backup over the corrupted file
3. Restart the server

If no backup exists, delete `session-state.json` and type `CONTINUE` in Copilot
Chat — the Orchestrator will re-create it from the last known phase outputs.

### Tests fail on fresh clone

```bash
# Ensure dependencies are installed for both workspaces
npm install

# Run tests
npm test               # Root (Jest)
npm run test:vitest   # Vitest (1239 tests)
```

If `contrast.test.js` fails, verify that `docs/brand/design-tokens.json`
contains the `color.light` and `color.dark` sections.

### Docker containers won't start

```bash
# Check for port conflicts
docker compose ps
docker compose logs command-center

# Rebuild from scratch
docker compose down -v
docker compose up --build
```

---

## 4. Recovery

### Resuming after a crash

The platform is designed for resilience:

1. All agent output is saved to disk (not just in chat memory)
2. `session-state.json` tracks the current phase, agent, and step
3. Type `CONTINUE` in a new Copilot Chat to resume from the last checkpoint

### Resuming after VS Code restart

1. Open the workspace in VS Code
2. Start a new Copilot Chat
3. Type `CONTINUE`
4. The Orchestrator reads `session-state.json` and picks up where it left off

### Backing up your project

All data lives in the project directory. To back up:

```bash
# Full backup (includes git history)
cp -r myAgentic-IT-Project-team-V2 myAgentic-IT-Project-team-V2.bak

# Or push to a remote
git push origin main
```

---

## 5. Common Operations

### Run a REEVALUATE cycle

After answering questionnaires or making decisions:

```
REEVALUATE
```

This triggers the Reevaluate Agent → Critic + Risk validation → updated reports.

### Add a new feature

```
FEATURE MyFeature: Description of what the feature does
```

Creates an isolated workspace in `Workitems/MyFeature/` with its own sprint
cycle.

### Check project status

- **Command Center**: Pipeline tab shows phase progress
- **MCP**: Use `get_project_status` tool in any MCP-compatible IDE
- **File**: Read `docs/session/session-state.json`

---

## 6. Security Operations

### Secret scan

The server automatically scans for secrets in all file writes. If a secret is
detected, the write is rejected with a warning.

To manually scan:

```bash
# The detectSecrets() function runs on every file mutation
# No separate command needed — it's built into the write path
```

### Updating dependencies

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Re-run tests after updating
npm test
```

---

## 7. File Locations Reference

| File                                    | Purpose                                      |
| --------------------------------------- | -------------------------------------------- |
| `docs/session/session-state.json`       | Current session state                        |
| `docs/session/session-state-audit.json` | Session audit trail                          |
| `docs/decisions.md`                     | Decisions and open questions                 |
| `BusinessDocs/`                         | Questionnaire answers and official documents |
| `docs/synthesis/`                       | Final reports and blocker matrix             |
| `docs/`                                 | User-facing documentation (GitHub Pages)     |
| `.env`                                  | Environment variables (gitignored)           |

---

_For more details, see the [User Manual](../docs/user-manual.md) and
[Technical Manual](../docs/technical-manual.md)._
