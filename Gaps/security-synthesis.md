# Security & Prompt Injection Synthesis

## Severity Count

| Severity                     | Count |
| ---------------------------- | ----- |
| CRITICAL                     | 2     |
| MAJOR                        | 8     |
| MODERATE                     | 4     |
| MINOR                        | 0     |
| DEFENSE (Positive Controls)  | 7     |
| TOTAL FINDINGS (non-defense) | 14    |

## Area Matrix

| Area                         | File                                            | Critical Risks                                                                                         |
| ---------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Prompt/tool-loop injection   | 07-security-prompt-and-tool-loop.md             | Prompt-content trust boundary is weak when user/citation/tool data is merged into conversational turns |
| Governance/action abuse      | 08-security-governance-and-action-abuse.md      | High-impact actions are chat-reachable; confirmation is metadata-driven                                |
| Tool guard policy            | 09-security-tool-execution-guard-gaps.md        | Fail-open behavior on missing/incomplete manifests                                                     |
| Auth/session/CSRF            | 10-security-auth-session-and-csrf.md            | API-key fallback mode is coarse if full auth is absent                                                 |
| XSS/sanitization             | 11-security-xss-and-content-sanitization.md     | Regex sanitizer + raw HTML insertion path                                                              |
| Secrets/supply-chain/runtime | 12-security-secrets-supply-chain-and-runtime.md | Local secret hygiene + UI dependency advisories + dual-process runtime coupling                        |

## Top 10 Findings

1. CRITICAL: Fail-open when runtime manifests are missing (`src/webapp/tool-execution-guard.ts:109`).
2. CRITICAL: Fail-open when managed server record is absent (`src/webapp/tool-execution-guard.ts:117`).
3. MAJOR: Prompt injection path from direct user/citation interpolation (`src/webapp/routes/chat.ts:646`, `src/webapp/routes/chat.ts:684`, `src/webapp/routes/chat.ts:696`).
4. MAJOR: Tool result reinjection as user-role message (`src/webapp/routes/chat.ts:892`).
5. MAJOR: Chat actions can perform approve/reject/queue operations (`src/webapp/routes/chat.ts:1468`, `src/webapp/routes/chat.ts:1481`, `src/webapp/routes/chat.ts:1505`).
6. MAJOR: Identity-policy ambiguity via caller-provided `agent_id` for guard evaluation (`src/webapp/tool-execution-guard.ts:274`, `src/webapp/mcp-server.ts:241`).
7. MAJOR: `dangerouslySetInnerHTML` rendering path in help panel (`src/webapp/ui/src/components/help-panel/help-panel.tsx:149`).
8. MAJOR: Regex-based HTML sanitizer is bypass-prone over time (`src/webapp/services/help-service.ts:508`, `src/webapp/services/help-service.ts:511`).
9. MAJOR: UI dependency vulnerabilities include high-severity transitive packages (`npm audit --prefix src/webapp/ui --json`).
10. MODERATE: API-key fallback protection in non-local mode if auth middleware is absent (`src/webapp/app.ts:186`, `src/webapp/app.ts:189`).

## Chained Attack Narratives

### Chain A: Prompt Injection to Governance Action Pressure

1. Attacker-controlled content enters user message or retrieved citation text.
2. Model behavior is nudged through untrusted text inside prompt assembly.
3. Model proposes risky action envelopes.
4. Operator is socially engineered to confirm high-impact chat actions.

### Chain B: Guardrail Drift to Tool Policy Bypass

1. Runtime manifest is missing or incomplete during deployment drift.
2. Tool-execution guard returns allow (`null`) due to fail-open path.
3. Restricted operations proceed without intended policy checks.

### Chain C: Sanitization Weakness to Browser-Side Script Execution

1. Crafted markdown/help content bypasses regex sanitizer edge case.
2. Rendered HTML is inserted into DOM via `dangerouslySetInnerHTML`.
3. Browser executes injected script in application origin context.

## Final Verdict

Security posture is mixed: strong baseline controls exist (CSRF checks, role enforcement, security headers), but there are two systemic high-consequence issues that dominate risk:

- fail-open tool-governance behavior
- weak trust-boundary handling across prompt/tool/html content paths

## Estimated Remediation Effort

- Critical fixes (fail-open to deny-by-default, identity binding): 3-5 engineering days
- Prompt/tool trust-boundary hardening and tests: 4-7 engineering days
- Sanitization modernization and XSS regression suite: 3-5 engineering days
- Dependency remediation and compatibility pass: 2-4 engineering days

Total for high-priority security closure: approximately 2-4 weeks with one focused engineer (or 1-2 weeks with two engineers).
