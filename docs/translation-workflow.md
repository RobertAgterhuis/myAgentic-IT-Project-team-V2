# Translation Workflow

> **Owner**: Content Strategist + Localization Specialist
> **TMS**: Weblate 5.4 (self-hosted via Docker)
> **Locales**: en-US (source), fr-FR, de-DE

## Overview

All user-facing strings are stored in `locales/{lang}/` as JSON files.
Weblate manages the translation lifecycle: string ingestion, translator
assignment, review, and export.

```
Developer adds/changes en-US string
  → push to Weblate (manual or CI)
  → Translator updates fr-FR / de-DE in Weblate UI
  → pull from Weblate to locales/ (manual or CI)
  → PR created with updated translations
  → CI validates key parity + quality (Job 7)
```

## Locale File Structure

```
locales/
├── en-US/          # Source language (127 keys)
│   ├── ui-labels.json            # 49 keys — UI strings
│   ├── validation-messages.json  # 30 keys — form/input validation
│   └── doc-snippets.json         # 48 keys — documentation snippets
├── fr-FR/          # French translations
│   └── (same 3 files)
└── de-DE/          # German translations
    └── (same 3 files)
```

## Setup (First Time)

### 1. Start Weblate

```bash
cp .env.weblate.example .env.weblate
# Edit .env.weblate — set WEBLATE_ADMIN_PASSWORD and WEBLATE_DB_PASSWORD
docker compose -f docker-compose.weblate.yml up -d
```

Access Weblate at `http://localhost:8081`.

### 2. Create Project in Weblate

1. Log in as admin
2. Create project: **agentic-sdlc**
3. Add 3 components (one per JSON file):
   - **ui-labels** → source: `locales/en-US/ui-labels.json`
   - **validation-messages** → source: `locales/en-US/validation-messages.json`
   - **doc-snippets** → source: `locales/en-US/doc-snippets.json`
4. Add target languages: French (fr_FR), German (de_DE)

### 3. Push Source Strings

```bash
WEBLATE_URL=http://localhost:8081 \
WEBLATE_TOKEN=<your-api-token> \
node scripts/weblate-sync.js push
```

## Daily Workflow

### Adding New Strings

1. Add the key to `locales/en-US/<component>.json`
2. Push to Weblate: `node scripts/weblate-sync.js push`
3. Translators are notified of new strings in Weblate UI
4. After translation, pull: `node scripts/weblate-sync.js pull`
5. Validate: `node scripts/weblate-sync.js validate`

### Pulling Translations

```bash
WEBLATE_URL=http://localhost:8081 \
WEBLATE_TOKEN=<your-api-token> \
node scripts/weblate-sync.js pull
```

### Offline Validation

Validate key parity without Weblate connection:

```bash
node scripts/weblate-sync.js validate
# or
npm run test:translations
```

## CI Integration

**Job 7 (Translation Validation)** runs on every PR and push to main:

- Validates all 3 locale directories exist
- Checks key parity across all languages (127 keys each)
- Verifies placeholder preservation (`{maxSize}`, `{seconds}`, etc.)
- Validates ICU MessageFormat patterns
- Checks for copy-paste detection (translated ≠ source)
- Ensures JSON validity and brand term consistency

The job is defined in both `.github/workflows/ci.yml` and
`.github/workflows/ci-pipeline.yml`.

## Quality Gates

| Check                    | Enforced | Threshold |
| ------------------------ | -------- | --------- |
| Key parity (all locales) | CI       | 100%      |
| Placeholder preservation | CI       | 100%      |
| ICU pattern validity     | CI       | 100%      |
| No copy-paste            | CI       | 100%      |
| JSON well-formed         | CI       | 100%      |
| Brand terms consistent   | CI       | 100%      |

## Troubleshooting

| Issue                        | Resolution                                                  |
| ---------------------------- | ----------------------------------------------------------- |
| Missing key in target locale | Add key to en-US, push to Weblate, translate                |
| Extra key in target locale   | Remove the extra key or add to en-US source                 |
| Placeholder mismatch         | Check original en-US string for `{placeholder}`             |
| Weblate connection refused   | Ensure `docker compose -f docker-compose.weblate.yml up -d` |
| API 403                      | Check `WEBLATE_TOKEN` is correct                            |
