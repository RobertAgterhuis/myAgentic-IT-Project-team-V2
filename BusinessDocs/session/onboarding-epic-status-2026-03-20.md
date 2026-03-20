# Epic E-D1 Status Check (2026-03-20)

## Scope Reference (Repo)

- Epic E-D1: Product Onboarding and First-Run Success (Dimension D1). Source: sdlc-audit/improvement-synthesis-milestones-epics-stories-issues-2026-03-19.md:L294-L308
- Story S-D1-1: Add first-run diagnostics wizard (auth/provider/storage/queue checks). Source: sdlc-audit/improvement-synthesis-milestones-epics-stories-issues-2026-03-19.md:L300
- Issues:
  - I-D1-001: Build onboarding diagnostics endpoint + UI setup flow. Source: sdlc-audit/improvement-synthesis-milestones-epics-stories-issues-2026-03-19.md:L306
  - I-D1-002: Add profile-specific setup checklists and remediation hints. Source: sdlc-audit/improvement-synthesis-milestones-epics-stories-issues-2026-03-19.md:L307
  - I-D1-003: Add one-click environment validation report export. Source: sdlc-audit/improvement-synthesis-milestones-epics-stories-issues-2026-03-19.md:L308

## Implementation Evidence (Repo)

- Diagnostics endpoint added for onboarding validation payload. Source: src/webapp/routes/orchestrator.ts:L202-L254
- UI types + hooks wired for onboarding diagnostics and gate diagnostics. Source: src/webapp/ui/src/lib/api-types.ts:L340-L399; src/webapp/ui/src/hooks/use-orchestrator.ts:L132-L219
- Diagnostics wizard with checklist, remediation hints, and export. Source: src/webapp/ui/src/components/onboarding/onboarding-diagnostics-wizard.tsx:L1-L260
- Wizard surfaced in Overview for first-run/onboarding sessions. Source: src/webapp/ui/src/pages/overview/overview-page.tsx:L25-L251

## Status Assessment (Repo Evidence Only)

- I-D1-001: Implemented in code (endpoint + UI flow). Sources: src/webapp/routes/orchestrator.ts:L202-L254; src/webapp/ui/src/components/onboarding/onboarding-diagnostics-wizard.tsx:L1-L260
- I-D1-002: Implemented in code (profile-specific checklist + remediation hints). Source: src/webapp/ui/src/components/onboarding/onboarding-diagnostics-wizard.tsx:L70-L191
- I-D1-003: Implemented in code (export report). Source: src/webapp/ui/src/components/onboarding/onboarding-diagnostics-wizard.tsx:L200-L224

## Open Issues (GitHub)

- INSUFFICIENT_DATA: Current open/closed status of Epic #695 and child issues in GitHub is not available from repository files. GitHub issue state requires live query. Source: no repo evidence for issue status.

## Next Action Needed

- If you want a definitive answer on open GitHub issues for Epic E-D1, authorize a GitHub issue query (repo owner/name + permission to access issues).
