# Windsurf Integration

All 61 Agency agents are consolidated into a single `.windsurfrules` file.
Rules are **project-scoped** — install them from your project root.

## Install

```bash
# Run from your project root
cd /your/project
/path/to/agency-agents/scripts/install.sh --tool windsurf
```

## Activate an Agent

In Windsurf, reference an agent by name in your prompt:

```
Use the Frontend Developer agent to build this component.
```

## Regenerate

```bash
./scripts/convert.sh --tool windsurf
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
