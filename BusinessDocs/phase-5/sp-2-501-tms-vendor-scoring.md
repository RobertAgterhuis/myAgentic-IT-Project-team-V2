# SP-2-501 — TMS Vendor Evaluation: Scoring Matrix

> **Sprint**: SP-2 | **Item**: SP-2-501 (#117) | **Date**: 2026-03-27  
> **Evaluators**: Implementation Agent + DevOps Engineer  
> **Pilot scope**: 150 strings (EN→FR + EN→DE)

---

## 1. Evaluation Criteria (Weighted)

| #   | Criterion               | Weight | Description                                                            |
| --- | ----------------------- | ------ | ---------------------------------------------------------------------- |
| 1   | Git Integration         | 25%    | Native Git sync, branch-aware workflows, PR-based translation updates  |
| 2   | Self-Hosting Capability | 20%    | Docker support, data sovereignty, no vendor lock-in                    |
| 3   | Translation Features    | 20%    | TM, glossary, QA checks, machine translation hooks, plural/ICU support |
| 4   | Cost                    | 15%    | Licensing model, per-seat pricing, self-hosted cost structure          |
| 5   | Developer Experience    | 10%    | API quality, CLI tools, CI/CD integration, file format support         |
| 6   | Scalability             | 10%    | String volume limits, concurrent users, multi-project support          |

---

## 2. Vendor Scores (1–5 scale per criterion)

### 2.1 Weblate (Self-Hosted, Docker Trial)

| Criterion               | Score    | Evidence / Notes                                                                                                      |
| ----------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| Git Integration         | 5        | Native Git backend; VCS-based workflow with auto-commit/push; branch-aware components                                 |
| Self-Hosting Capability | 5        | Official Docker image; PostgreSQL + Redis; full data control; GPLv3 license                                           |
| Translation Features    | 4        | TM, glossary, 50+ QA checks, machine translation plugins (DeepL, Google, LibreTranslate); ICU MessageFormat via addon |
| Cost                    | 5        | Free self-hosted (GPLv3); hosted plans from €22/mo for small teams                                                    |
| Developer Experience    | 4        | REST + GraphQL API; `wlc` CLI; JSON/PO/XLIFF/Android XML/iOS Strings support                                          |
| Scalability             | 4        | Handles 1M+ strings; multi-project; celery workers for async tasks                                                    |
| **Weighted Total**      | **4.60** | (5×0.25 + 5×0.20 + 4×0.20 + 5×0.15 + 4×0.10 + 4×0.10)                                                                 |

### 2.2 Lokalize (KDE, Desktop Application)

| Criterion               | Score    | Evidence / Notes                                                      |
| ----------------------- | -------- | --------------------------------------------------------------------- |
| Git Integration         | 2        | Manual VCS workflow; no built-in Git sync; requires external scripts  |
| Self-Hosting Capability | 3        | Desktop app (no server needed); but no web-based collaboration        |
| Translation Features    | 3        | TM support, basic glossary, QA checks; limited plugin ecosystem       |
| Cost                    | 5        | Free (GPLv2); open source desktop application                         |
| Developer Experience    | 2        | PO/XLIFF focused; no REST API; CLI limited to file operations         |
| Scalability             | 2        | Single-user desktop; no concurrent collaboration; manual merge needed |
| **Weighted Total**      | **2.80** | (2×0.25 + 3×0.20 + 3×0.20 + 5×0.15 + 2×0.10 + 2×0.10)                 |

### 2.3 POEditor (Cloud SaaS)

| Criterion               | Score    | Evidence / Notes                                                                             |
| ----------------------- | -------- | -------------------------------------------------------------------------------------------- |
| Git Integration         | 3        | GitHub/GitLab integration via webhooks; not branch-aware; manual sync triggers               |
| Self-Hosting Capability | 1        | Cloud-only SaaS; no self-hosting option; data on vendor servers                              |
| Translation Features    | 4        | TM, glossary, QA checks, machine translation (Google, Microsoft, DeepL); good plural support |
| Cost                    | 3        | Free tier (1000 strings); paid from $15/mo; per-project pricing                              |
| Developer Experience    | 4        | REST API; CLI via community tools; JSON/PO/XLIFF/CSV/Android/iOS                             |
| Scalability             | 3        | Cloud-scaled; but per-project pricing limits at scale; no self-tuning                        |
| **Weighted Total**      | **2.80** | (3×0.25 + 1×0.20 + 4×0.20 + 3×0.15 + 4×0.10 + 3×0.10)                                        |

---

## 3. Summary Radar

```
              Git Integration (25%)
                    ★★★★★ Weblate
                    ★★    Lokalize
                    ★★★   POEditor

       Self-Hosting (20%)          Features (20%)
         ★★★★★ Weblate              ★★★★ Weblate
         ★★★   Lokalize             ★★★  Lokalize
         ★     POEditor             ★★★★ POEditor

            Cost (15%)            Dev Experience (10%)
         ★★★★★ Weblate              ★★★★ Weblate
         ★★★★★ Lokalize             ★★   Lokalize
         ★★★   POEditor             ★★★★ POEditor

                  Scalability (10%)
                    ★★★★ Weblate
                    ★★   Lokalize
                    ★★★  POEditor
```

---

## 4. Ranking

| Rank | Vendor      | Weighted Score  | Recommendation                                                                               |
| ---- | ----------- | --------------- | -------------------------------------------------------------------------------------------- |
| 1    | **Weblate** | **4.60 / 5.00** | **RECOMMENDED** — Best-in-class Git integration, full self-hosting, strong feature set       |
| 2    | POEditor    | 2.80 / 5.00     | ALTERNATIVE — Good features + DX, but cloud-only eliminates data sovereignty                 |
| 3    | Lokalize    | 2.80 / 5.00     | NOT RECOMMENDED — Desktop-only, no collaboration; suitable only for single-translator setups |

---

## 5. Weblate Pilot Trial — Acceptance Criteria Status

| #   | Acceptance Criterion                                       | Status      | Notes                                                    |
| --- | ---------------------------------------------------------- | ----------- | -------------------------------------------------------- |
| 1   | 3 vendors evaluated with weighted scoring matrix           | ✅ COMPLETE | See Section 2 above                                      |
| 2   | Pilot cycle: 150 strings EN→FR + EN→DE translated          | ⏳ PENDING  | Strings prepared in `locales/en-US/`; Docker stack ready |
| 3   | Git-based workflow validated (push/pull translation files) | ⏳ PENDING  | Requires Docker trial execution                          |
| 4   | TM + glossary + QA checks validated                        | ⏳ PENDING  | Requires Docker trial execution                          |
| 5   | Vendor recommendation documented                           | ✅ COMPLETE | Weblate RECOMMENDED                                      |
| 6   | Integration plan for Phase 5 sprints                       | ⏳ PENDING  | Blocked by pilot results                                 |

---

## 6. Recommendation

**Weblate** is the recommended TMS vendor for the Agentic SDLC Platform.

### Rationale

1. **Git-native workflow** aligns with our CI/CD pipeline and branch-based
   development model
2. **Full self-hosting** via Docker satisfies data sovereignty requirements
   (G-SEC-25)
3. **Feature completeness** covers all P0 and P1 integration requirements
4. **Zero licensing cost** for self-hosted deployment
5. **Proven scale** — handles 1M+ strings, supporting our target locales (en-US,
   de-DE, fr-FR, ja-JP, zh-CN)

### Next Steps

1. Execute Docker trial:
   `docker compose -f docker-compose.weblate.yml --env-file .env.weblate up -d`
2. Import `locales/en-US/*.json` as source strings
3. Configure FR + DE target languages
4. Execute pilot translation cycle (machine translation + manual review)
5. Validate Git push/pull workflow with `feature/sprint-2-implementation` branch
6. Document pilot findings and finalize integration plan

---

_Generated: 2026-03-27 | SP-2-501 | Sprint 2 Day 3_
