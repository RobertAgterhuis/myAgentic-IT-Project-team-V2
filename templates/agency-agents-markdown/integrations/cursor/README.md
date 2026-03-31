# Cursor Integration

Converts all 61 Agency agents into Cursor `.mdc` rule files. Rules are
**project-scoped** — install them from your project root.

## Install

```bash
# Run from your project root
cd /your/project
/path/to/agency-agents/scripts/install.sh --tool cursor
```

This creates `.cursor/rules/<agent-slug>.mdc` files in your project.

## Activate a Rule

In Cursor, reference an agent in your prompt:

```
@frontend-developer Review this React component for performance issues.
```

Or enable a rule as always-on by editing its frontmatter:

```yaml
---
description: Expert frontend developer...
globs: '**/*.tsx,**/*.ts'
alwaysApply: true
---
```

## Regenerate

```bash
./scripts/convert.sh --tool cursor
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
