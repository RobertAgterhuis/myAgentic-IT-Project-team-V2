# Aider Integration

All 61 Agency agents are consolidated into a single `CONVENTIONS.md` file.
Aider reads this file automatically when it's present in your project root.

## Install

```bash
# Run from your project root
cd /your/project
/path/to/agency-agents/scripts/install.sh --tool aider
```

## Activate an Agent

In your Aider session, reference the agent by name:

```
Use the Frontend Developer agent to refactor this component.
```

```
Apply the Reality Checker agent to verify this is production-ready.
```

## Manual Usage

You can also pass the conventions file directly:

```bash
aider --read CONVENTIONS.md
```

## Regenerate

```bash
./scripts/convert.sh --tool aider
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
