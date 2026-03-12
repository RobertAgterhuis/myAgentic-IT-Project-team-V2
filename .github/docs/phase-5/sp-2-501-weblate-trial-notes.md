# SP-2-501 — Weblate Docker Trial Notes

> **Sprint**: SP-2 | **Item**: SP-2-501 (#117) | **Date**: 2026-03-27  
> **Status**: TRIAL_READY — Docker stack + pilot strings prepared

---

## 1. Trial Setup

### 1.1 Docker Stack

| Service        | Image                    | Port | Purpose             |
|----------------|--------------------------|------|---------------------|
| weblate        | weblate/weblate:5.4      | 8081 | Translation UI + API|
| weblate-db     | postgres:16-alpine       | —    | Persistent storage  |
| weblate-cache  | redis:7-alpine           | —    | Cache + task broker |

**File**: `docker-compose.weblate.yml`  
**Env**: `.env.weblate` (copy from `.env.weblate.example`)

### 1.2 Pilot String Inventory

| File                   | Namespace             | Count | Category                                |
|------------------------|-----------------------|-------|-----------------------------------------|
| `ui-labels.json`       | UI Labels             | 50    | Navigation, buttons, form labels        |
| `validation-messages.json` | Validation/Errors | 30    | Form validation, error states, success  |
| `doc-snippets.json`    | Documentation         | 40    | Onboarding, dashboard, phases, sprints  |

**Total**: 120 keys  
**Note**: doc-snippets.json includes 10 ICU MessageFormat plurals + 7 format strings = 17 advanced patterns  
**Target languages**: FR (fr-FR), DE (de-DE)

### 1.3 String Categories for Evaluation

- **Simple labels** (50): Navigation items, buttons, form labels — baseline TM accuracy
- **Validation messages** (30): Variable interpolation (`{maxSize}`, `{seconds}`), technical context
- **Documentation snippets** (23): Long-form prose, brand terminology, product descriptions
- **Plural forms** (10): ICU `{count, plural, one {…} other {…}}` — plural handling capability
- **Format strings** (7): ICU `{date, date, short}`, `{value, number, percent}` — locale-aware formatting

---

## 2. Evaluation Protocol

### 2.1 Setup Phase (Day 3–4)
1. ✅ Docker Compose file created
2. ✅ Environment example file created
3. ✅ Pilot strings prepared in `locales/en-US/`
4. ✅ Vendor scoring matrix completed
5. ⏳ Docker stack launch + admin configuration
6. ⏳ Project creation + source string import

### 2.2 Translation Phase (Day 5–7)
1. Configure machine translation backend (LibreTranslate or DeepL API)
2. Run auto-translation for FR + DE
3. Manual review pass (10% sample for quality assessment)
4. QA checks execution (placeholders, length, terminology)
5. Export translated files to `locales/fr-FR/` and `locales/de-DE/`

### 2.3 Integration Phase (Day 7–8)
1. Test Git push workflow (Weblate → repo)
2. Test Git pull workflow (repo → Weblate)
3. Validate merge conflict resolution
4. Test glossary + TM persistence across sessions
5. Measure API response times for CI/CD integration feasibility

### 2.4 Scoring Phase (Day 8)
1. Complete acceptance criteria matrix
2. Write integration plan for remaining sprints
3. Document lessons learned
4. Archive trial data

---

## 3. Integration Requirements Checklist

| Priority | Requirement                          | Evaluation Method               | Status      |
|----------|--------------------------------------|---------------------------------|-------------|
| P0       | Git-based workflow (push/pull)       | Branch sync test                | ⏳ PENDING  |
| P0       | JSON file format support             | Import/export `locales/en-US/`  | ⏳ PENDING  |
| P1       | Translation Memory                   | Cross-file TM match test        | ⏳ PENDING  |
| P1       | Glossary                             | Brand term consistency test     | ⏳ PENDING  |
| P1       | QA checks (placeholders, length)     | Intentional error detection     | ⏳ PENDING  |
| P1       | ICU MessageFormat support            | Plural + format string test     | ⏳ PENDING  |
| P2       | Webhook notifications                | Push event → CI trigger test    | ⏳ PENDING  |
| P2       | REST API for automation              | Programmatic string management  | ⏳ PENDING  |

---

## 4. Risk Log

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Weblate Docker startup > 5min on CI runner | Low | Medium | Use health checks + start_period; pre-pull images |
| ICU MessageFormat not fully supported | Medium | Low | Weblate addons handle ICU; fallback: extract plurals to separate keys |
| Git sync conflicts during concurrent edits | Medium | Low | Use Weblate's "lock on edit" + branch protection rules |
| PostgreSQL data loss in trial | Low | Low | Trial data is disposable; production will use managed DB |

---

*Generated: 2026-03-27 | SP-2-501 | Sprint 2 Day 3*
