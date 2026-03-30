# OpenClaw Integration

OpenClaw agents are installed as workspaces containing `SOUL.md`, `AGENTS.md`,
and `IDENTITY.md` files. The installer copies each workspace into
`~/.openclaw/agency-agents/` and registers it when the `openclaw` CLI is
available.

Before installing, generate the OpenClaw workspaces:

```bash
./scripts/convert.sh --tool openclaw
```

## Install

```bash
./scripts/install.sh --tool openclaw
```

## Activate an Agent

After installation, agents are available by `agentId` in OpenClaw sessions.

If the OpenClaw gateway is already running, restart it after installation:

```bash
openclaw gateway restart
```

## Regenerate

```bash
./scripts/convert.sh --tool openclaw
```

## HANDOFF CHECKLIST

- [ ] All required sections are completed and contain substantive content
- [ ] Agent deliverable is written to disk (not only in chat output)
- [ ] All findings include source references (code location, document page, etc.)
- [ ] No contradictory statements within the deliverable
- [ ] UNCERTAIN: items documented for any unverified claims
- [ ] INSUFFICIENT_DATA: items documented for missing required information
- [ ] Output is machine-readable and ready as input for next agent
- [ ] No generic statements; all findings are concrete and specific
