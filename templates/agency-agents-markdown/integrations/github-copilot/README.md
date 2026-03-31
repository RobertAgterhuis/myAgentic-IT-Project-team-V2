# GitHub Copilot Integration

The Agency works with GitHub Copilot out of the box. No conversion needed —
agents use the existing `.md` + YAML frontmatter format.

## Install

```bash
# Copy all agents to your GitHub Copilot agents directories
./scripts/install.sh --tool copilot

# Or manually copy a category
cp engineering/*.md ~/.github/agents/
cp engineering/*.md ~/.copilot/agents/
```

## Activate an Agent

In any GitHub Copilot session, reference an agent by name:

```
Activate Frontend Developer and help me build a React component.
```

```
Use the Reality Checker agent to verify this feature is production-ready.
```

## Agent Directory

Agents are organized into divisions. See the [main README](../../README.md) for
the full current roster.

## HANDOFF CHECKLIST

- [ ] All required sections are completed and contain substantive content
- [ ] Agent deliverable is written to disk (not only in chat output)
- [ ] All findings include source references (code location, document page, etc.)
- [ ] No contradictory statements within the deliverable
- [ ] UNCERTAIN: items documented for any unverified claims
- [ ] INSUFFICIENT_DATA: items documented for missing required information
- [ ] Output is machine-readable and ready as input for next agent
- [ ] No generic statements; all findings are concrete and specific
