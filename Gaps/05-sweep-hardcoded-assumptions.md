# Sweep 5 — Hardcoded Values & Hidden Assumptions

## Findings

[🟠 MAJOR] HARDCODED: src/webapp/routes/subscribe.ts:21
Value: `https://api.buttondown.email/v1/subscribers`
Should be: Configurable base URL (env var) for ESP endpoint and region/service migration.
Risk: Vendor lock and brittle behavior across environments (sandbox/proxy/self-host).

[🟡 MODERATE] HARDCODED: src/webapp/routes/subscribe.ts:182
Value: `setTimeout(() => controller.abort(), 10_000)`
Should be: Configurable timeout via env/runtime config.
Risk: Too short/too long under variable network conditions; avoidable request failures.

[🟡 MODERATE] HARDCODED: src/webapp/routes/subscribe.ts:22
Value: `VALID_SEGMENTS = ['engineering-leaders', 'product-managers', 'developers', 'evaluators']`
Should be: Managed taxonomy/config source.
Risk: Segment rollout requires code deploy; runtime cannot adapt to business changes.

[🟡 MODERATE] HARDCODED: src/webapp/routes/chat.ts:72-83
Value: Default threshold/topK/refresh/tokens/temperature/tool rounds (`0.12`, `4`, `60000`, `1024`, `0.2`, `4`)
Should be: Centralized, documented config profile with environment-specific overrides.
Risk: Behavior drift across environments and difficult tuning provenance.

[🔵 MINOR] HARDCODED: src/webapp/app.ts:78-79
Value: `requestTimeout: 30000`, `keepAliveTimeout: 5000`
Should be: Config-driven transport profile.
Risk: Runtime behavior needs code changes for load-profile adjustments.

[🟡 MODERATE] HARDCODED/DOC GAP: src/webapp/\*_/_.ts process.env usage vs env examples
Value: 28 referenced vars missing from `.env.example` / `.env.weblate.example` (e.g., `API_KEY`, `BUTTONDOWN_API_KEY`, `ENV_SCOPE`, `RAG_PROFILE_CONFIG`, `CHAT_*`, `ORCHESTRATOR_AUTO_GATE_MODE`)
Should be: Explicitly documented in env templates or operational docs.
Risk: Misconfiguration and non-reproducible local/prod behavior.
