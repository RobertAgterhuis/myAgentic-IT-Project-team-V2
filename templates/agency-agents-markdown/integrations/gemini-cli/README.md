# Gemini CLI Integration

Packages all 61 Agency agents as a Gemini CLI extension. The extension
installs to `~/.gemini/extensions/agency-agents/`.

## Install

```bash
# Generate the Gemini CLI integration files first
./scripts/convert.sh --tool gemini-cli

# Then install the extension
./scripts/install.sh --tool gemini-cli
```

## Activate a Skill

In Gemini CLI, reference an agent by name:

```
Use the frontend-developer skill to help me build this UI.
```

## Extension Structure

```
~/.gemini/extensions/agency-agents/
  gemini-extension.json
  skills/
    frontend-developer/SKILL.md
    backend-architect/SKILL.md
    reality-checker/SKILL.md
    ...
```

## Regenerate

```bash
./scripts/convert.sh --tool gemini-cli
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
