# Security Sweep 11: XSS and Content Sanitization

## Scope

- Rendering of markdown/help content in UI
- HTML sanitization strategy and robustness
- Markdown parser configuration in backend utilities

## Findings

### 1) UI renders HTML through dangerouslySetInnerHTML

- Severity: MAJOR
- Evidence:
  - src/webapp/ui/src/components/help-panel/help-panel.tsx:149
- Detail:
  - Help content is inserted as raw HTML into the DOM.

### 2) Sanitization uses regex-based stripping, which is fragile

- Severity: MAJOR
- Evidence:
  - src/webapp/services/help-service.ts:508
  - src/webapp/services/help-service.ts:511
- Detail:
  - Sanitizer removes event attributes and JS-like href/src via regex replacement.
- Risk:
  - Regex sanitization is historically bypass-prone for complex/encoded/mutation payloads.

### 3) Markdown rendering in help service disables raw HTML

- Severity: DEFENSE
- Evidence:
  - src/webapp/services/help-service.ts:74
- Detail:
  - Markdown-it is configured with `html: false`, reducing direct HTML injection at source.

### 4) Separate markdown parser allows HTML tokens

- Severity: MODERATE
- Evidence:
  - src/webapp/models/markdown-parser.ts:15
- Detail:
  - Another markdown utility is configured with `html: true`.
- Risk:
  - If reused in rendering paths in future changes, this can become a latent XSS source.

## Recommended Fixes

1. Replace regex sanitizer with a hardened sanitizer library policy in the server path (strict allowlist).
2. Add security tests with known XSS mutation payload corpus.
3. Add static lint rule forbidding `dangerouslySetInnerHTML` except in explicitly approved wrappers.

## Verdict for this area

- Current pipeline has partial safeguards, but sanitizer strategy is brittle and should be upgraded to robust, policy-driven sanitization.
