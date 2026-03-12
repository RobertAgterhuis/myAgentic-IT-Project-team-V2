# SP-2-501 TMS Vendor Evaluation Kickoff

**Story:** SP-2-501 (#117)  
**Sprint:** Sprint 2 (March 25 – April 7, 2026)  
**Track:** UX / Localization  
**Owner:** Localization Specialist  
**Status:** 🔄 IN PROGRESS (Day 1 — 25%)  
**Predecessor:** SP-1-501 (Accessibility Pre-Audit) ✅, BLK-2-501 (TMS
Procurement Decision) ✅  
**Estimated Days:** 4+ (evaluation through April 1, setup through April 7)  
**Decision Target:** April 1, 2026  
**Blocker Resolution:** BLK-2-501 — OSS-first approach confirmed

---

## 1. Evaluation Objective

Select a Translation Management System (TMS) for the Agentic SDLC Platform's
6-locale localization infrastructure (EN, DE, FR, JA, ZH + 1 flexible). Decision
informed by BLK-2-501 resolution: **Open Source-first** with commercial
fallback.

### Target Locales (from Compliance Checklist §6.1)

| Locale | Language             | Priority    | i18n Status                  |
| ------ | -------------------- | ----------- | ---------------------------- |
| en-US  | English              | P0 (source) | ✅ Source language           |
| de-DE  | German               | P1          | ⚠️ PENDING — TMS integration |
| fr-FR  | French               | P1          | ⚠️ PENDING — TMS integration |
| ja-JP  | Japanese             | P1          | ⚠️ PENDING — TMS integration |
| zh-CN  | Chinese (Simplified) | P1          | ⚠️ PENDING — TMS integration |
| TBD    | Flexible slot        | P2          | ⚠️ PENDING                   |

---

## 2. Vendors Under Evaluation

Three vendors shortlisted per BLK-2-501 resolution:

### Vendor 1: Weblate (Primary Candidate)

| Criterion           | Detail                                             |
| ------------------- | -------------------------------------------------- |
| **Type**            | Self-hosted, Python-based, FOSS (GPLv3)            |
| **Cost**            | Free (self-hosted); $0-500/mo hosting only         |
| **Git Integration** | Native git integration (push/pull), CI/CD webhooks |
| **Self-Hosting**    | Docker deployment (aligns with existing infra)     |
| **API**             | REST API for automation                            |
| **WCAG Support**    | Accessible translation interface                   |
| **Community**       | Large, active open-source community                |
| **Concern**         | Requires infrastructure maintenance                |

### Vendor 2: Lokalize

| Criterion           | Detail                                    |
| ------------------- | ----------------------------------------- |
| **Type**            | FOSS translation collaboration tool       |
| **Cost**            | Free                                      |
| **Git Integration** | Manual/scriptable                         |
| **Self-Hosting**    | Desktop application                       |
| **API**             | Limited                                   |
| **WCAG Support**    | Good                                      |
| **Community**       | KDE community, moderate                   |
| **Concern**         | Limited enterprise features, desktop-only |

### Vendor 3: POEditor (Freemium)

| Criterion           | Detail                                      |
| ------------------- | ------------------------------------------- |
| **Type**            | Cloud SaaS with free tier                   |
| **Cost**            | Free tier (limited) / $50-200/mo commercial |
| **Git Integration** | API-first, GitHub integration               |
| **Self-Hosting**    | ❌ Cloud-only                               |
| **API**             | REST API, webhooks                          |
| **WCAG Support**    | Standard web UI                             |
| **Community**       | Moderate, commercial support available      |
| **Concern**         | Free tier limits: 1 language + 1 translator |

---

## 3. Evaluation Criteria & Scoring Matrix

| Criterion                | Weight | Description                                                                | Measurement                |
| ------------------------ | ------ | -------------------------------------------------------------------------- | -------------------------- |
| **Git/CI Integration**   | 25%    | Native git workflow, CI pipeline triggers, PR-based translations           | Feature checklist (0-10)   |
| **Self-Hosting**         | 20%    | Docker deployment, data residency, infrastructure alignment                | Yes/No + complexity (0-10) |
| **Feature Completeness** | 20%    | Translation memory, glossary, QA checks, plural forms, context screenshots | Feature count (0-10)       |
| **Cost Efficiency**      | 15%    | Total cost for 6 locales, 5000+ strings                                    | $/month calculation        |
| **Dev Experience**       | 10%    | API quality, documentation, setup time, CLI tools                          | Qualitative (0-10)         |
| **Scalability**          | 10%    | Concurrent translators, project count, string limits                       | Capacity assessment (0-10) |

### Scoring Template (to be completed during evaluation)

| Vendor   | Git/CI (25%) | Self-Host (20%) | Features (20%) | Cost (15%) | DevExp (10%) | Scale (10%) | **Total** |
| -------- | ------------ | --------------- | -------------- | ---------- | ------------ | ----------- | --------- |
| Weblate  | —            | —               | —              | —          | —            | —           | —         |
| Lokalize | —            | —               | —              | —          | —            | —           | —         |
| POEditor | —            | —               | —              | —          | —            | —           | —         |

---

## 4. Test Data Set

### Pilot Translation Scope

Per BLK-2-501 Phase 2: "Create test data set (100-200 strings) for pilot"

| Category               | String Count | Examples                              |
| ---------------------- | ------------ | ------------------------------------- |
| UI labels              | 50           | Button text, menu items, form labels  |
| Validation messages    | 30           | Error messages, success messages      |
| Documentation snippets | 40           | Tooltip text, help text, descriptions |
| Pluralization cases    | 20           | "1 item" / "N items" patterns         |
| Date/number formats    | 10           | Locale-specific formatting            |
| **Total**              | **150**      |                                       |

### Pilot Languages

| Language           | Rationale                                           |
| ------------------ | --------------------------------------------------- |
| **French (fr-FR)** | Latin script, moderate complexity (gender, plurals) |
| **German (de-DE)** | Latin script, compound words, case system           |

---

## 5. Evaluation Timeline

| Date           | Activity                                          | Owner                   | Output                     |
| -------------- | ------------------------------------------------- | ----------------------- | -------------------------- |
| Mar 25 (Day 1) | Evaluation kickoff, criteria defined              | Localization Specialist | This document              |
| Mar 26 (Day 2) | Weblate Docker trial setup                        | Localization Specialist | Setup notes                |
| Mar 27 (Day 3) | Lokalize + POEditor evaluation                    | Localization Specialist | Feature comparison         |
| Mar 28 (Day 4) | Pilot translation cycle (150 strings, EN→FR+DE)   | Localization Specialist | Translation quality report |
| Mar 31-Apr 1   | Scoring matrix completion, vendor recommendation  | Localization Specialist | Decision document          |
| Apr 2-4        | Selected TMS setup + initial locale configuration | Localization Specialist | TMS operational            |
| Apr 7          | Integration with CI pipeline documented           | Localization Specialist | SP-2-501 DONE              |

---

## 6. Integration Requirements (for selected TMS)

| Requirement           | Priority | Description                                                  |
| --------------------- | -------- | ------------------------------------------------------------ |
| Git-based workflow    | P0       | Source strings committed to repo, translations pulled via CI |
| CI/CD triggers        | P0       | Translation status check as part of build pipeline           |
| Translation memory    | P1       | Reuse across versions and similar strings                    |
| Glossary support      | P1       | Consistent terminology across locales                        |
| QA checks             | P1       | Missing translations, placeholder validation, length checks  |
| Webhook notifications | P2       | Notify team on translation completion                        |
| Context screenshots   | P2       | Visual context for translators                               |

### Localization Workflow (target state)

```
Developer writes source strings (en-US)
  → Commit to repo
    → TMS detects new/changed strings (webhook or CI trigger)
      → Translator works in TMS interface
        → Translation complete → TMS pushes to branch
          → PR with translations → CI runs locale QA checks
            → Merge → Deployed with next release
```

---

## 7. Acceptance Criteria

- [ ] 3 vendors evaluated against 6 weighted criteria
- [ ] Scoring matrix completed with justification
- [ ] Pilot translation cycle executed (150 strings, EN→FR + EN→DE)
- [ ] Vendor recommendation document produced (by April 1)
- [ ] Selected TMS deployed and operational (by April 7)
- [ ] Git integration workflow documented
- [ ] CI pipeline integration spec documented

---

## Day 1 Progress

- ✅ Evaluation criteria and scoring matrix defined (§3)
- ✅ Test data set scope specified (§4)
- ✅ Evaluation timeline mapped to Sprint 2 cadence (§5)
- ✅ Integration requirements documented (§6)
- ✅ Localization workflow target state defined (§6)
- ⬜ Weblate Docker trial setup (Day 2)
- ⬜ Lokalize + POEditor hands-on evaluation (Day 3)
- ⬜ Pilot translation cycle (Day 4)
- ⬜ Final scoring + vendor decision (April 1)
