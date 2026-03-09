# Cross-Team Blocker Matrix - AUDIT

## Metadata
- Mode: `AUDIT`
- Date: `2026-03-09`
- Source inputs:
  - `.github/docs/phase-1/critic-validation-recheck.md`
  - `.github/docs/phase-1/critic-risk-validation-audit.md`
  - `.github/docs/phase-2/critic-risk-validation-audit.md`
  - `.github/docs/phase-3/critic-validation-recheck.md`
  - `.github/docs/phase-3/critic-risk-validation-audit.md`
  - `.github/docs/phase-4/critic-validation-recheck.md`
  - `.github/docs/phase-4/*-audit.json`

## Classification Rules
- `BLOCKING`: Must be resolved before GA or before dependent work can be completed safely.
- `ADVISORY`: Important risk/debt that should be scheduled; does not hard-block GA if constraints are acknowledged.

## Matrix
| ID | From Team | To Team | Classification | Severity | Blocker | Dependency Outcome | Source |
|---|---|---|---|---|---|---|---|
| CTB-A-001 | Security | DevOps | BLOCKING | CRITICAL | AuthN/AuthZ + TLS + rate limiting + CORS not finalized | Docker/team deployment cannot proceed safely | `.github/docs/phase-2/critic-risk-validation-audit.md:299` |
| CTB-A-002 | Security | Data | BLOCKING | CRITICAL | Encryption-at-rest + key management undefined | Sensitive data cannot be considered protected for team mode | `.github/docs/phase-2/critic-risk-validation-audit.md:300` |
| CTB-A-003 | Legal | Security, Data | BLOCKING | CRITICAL | Privacy policy + ROPA + DSAR process missing | GA compliance posture not auditable | `.github/docs/phase-2/critic-risk-validation-audit.md:301` |
| CTB-A-004 | Legal | Data, Security | BLOCKING | CRITICAL | Retention policy by data category missing | Deletion/retention obligations cannot be executed | `.github/docs/phase-2/critic-risk-validation-audit.md:302` |
| CTB-A-005 | Business/Product | Tech, Marketing | BLOCKING | CRITICAL | GA acceptance criteria unresolved | Go/no-go and launch sequence remain ambiguous | `.github/docs/phase-1/critic-risk-validation-audit.md:144` |
| CTB-A-006 | Domain/Architecture | Product, Tech | BLOCKING | CRITICAL | Event catalog/pub-sub automation gap | Unattended SI-1 execution remains blocked | `.github/docs/phase-1/02-domain-expert-audit.md:523` |
| CTB-A-007 | UX Research | Product, Marketing | BLOCKING | HIGH | External user validation not executed | UX/growth assumptions remain weakly evidenced | `.github/docs/phase-3/critic-risk-validation-audit.md:154` |
| CTB-A-008 | UX/Product | Marketing, KPI | BLOCKING | HIGH | Feedback loop mechanism undecided | Post-GA prioritization and KPI loops cannot stabilize | `.github/docs/phase-3/critic-risk-validation-audit.md:165` |
| CTB-A-009 | DevOps | Data, Architecture | ADVISORY | MEDIUM | Performance baseline absent | Scaling decisions remain assumption-driven | `.github/docs/phase-2/critic-risk-validation-audit.md:303` |
| CTB-A-010 | Senior Dev | DevOps | ADVISORY | MEDIUM | Lint gate missing in CI | Quality drift risk continues | `.github/docs/phase-2/critic-risk-validation-audit.md:304` |
| CTB-A-011 | DevOps | Security, Data | ADVISORY | MEDIUM | Docker target architecture under-specified | Implementation planning uncertainty | `.github/docs/phase-2/critic-risk-validation-audit.md:305` |
| CTB-A-012 | Content UX | Marketing | ADVISORY | MEDIUM | Documentation discoverability/governance split | Onboarding/conversion efficiency erosion risk | `.github/docs/phase-3/critic-risk-validation-audit.md:186` |
| CTB-A-013 | Localization UX | Tech | ADVISORY | MEDIUM | i18n scaffolding debt | Future non-English rollout cost and delay risk | `.github/docs/phase-3/critic-risk-validation-audit.md:197` |
| CTB-A-014 | Brand | UX, Marketing | ADVISORY | HIGH | Canonical naming drift across docs/UI | Trust and recognition consistency risk | `.github/docs/phase-4/14-brand-strategist-audit.json` |
| CTB-A-015 | Growth | Product, KPI | ADVISORY | HIGH | Acquisition/channel baseline missing | Weak post-GA growth attribution | `.github/docs/phase-4/15-growth-marketer-audit.json` |
| CTB-A-016 | CRO | Tech, Marketing | ADVISORY | CRITICAL | Funnel events incomplete + experiment power inputs missing | Conversion optimization cannot be statistically trusted | `.github/docs/phase-4/16-cro-specialist-audit.json` |

## Machine-Readable Blocker Index
```json
{
  "blocking": [
    "CTB-A-001",
    "CTB-A-002",
    "CTB-A-003",
    "CTB-A-004",
    "CTB-A-005",
    "CTB-A-006",
    "CTB-A-007",
    "CTB-A-008"
  ],
  "advisory": [
    "CTB-A-009",
    "CTB-A-010",
    "CTB-A-011",
    "CTB-A-012",
    "CTB-A-013",
    "CTB-A-014",
    "CTB-A-015",
    "CTB-A-016"
  ]
}
```

## Handoff Checklist
- [x] Included blocker classification (`BLOCKING` vs `ADVISORY`)
- [x] Included cross-team ownership and dependency direction
- [x] Used validated findings and recheck-approved artifacts only
- [x] Included machine-readable section
- [x] Deliverable written to `.github/docs/synthesis/cross-team-blocker-matrix-audit.md`
