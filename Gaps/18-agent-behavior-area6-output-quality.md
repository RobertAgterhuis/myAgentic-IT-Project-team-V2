# Agentic Behavior Audit — Area 6: Output Quality Assessment

## Evidence Basis

- Real produced artifacts (Agent 06 sandbox lane): BusinessDocs/session/agent-runs/\*.md
- Session-state and gate outcomes: BusinessDocs/session/session-state.json:32
- Prompt contracts for output expectations: templates/sdlc/contracts/agent-handoff-contract.md:77

## OUTPUT QUALITY: code generation artifact — Agent 06

- Source: BusinessDocs/session/agent-runs/2026-04-01T11-01-35-252Z-06.md
- Correctness: 5/10 — syntactically coherent sentence-level artifact, but minimal substance.
- Specificity: 3/10 — repeated generic sandbox step language.
- Completeness: 2/10 — lacks rich implementation reasoning and acceptance coverage.
- Actionability: 4/10 — indicates action happened, but insufficient for robust engineering handoff.
- Overall: 🟠 UNRELIABLE
- Biggest quality gap: low semantic depth despite repeated successful step completion markers.

## OUTPUT QUALITY: planning artifact — Agent 06

- Source: BusinessDocs/session/agent-runs/2026-04-01T11-01-32-438Z-06.md
- Correctness: 5/10
- Specificity: 2/10
- Completeness: 2/10
- Actionability: 3/10
- Overall: 🟠 UNRELIABLE
- Biggest quality gap: plan markers are present but decision rationale and scope decomposition are missing.

## OUTPUT QUALITY: PR draft artifact — Agent 06

- Source: BusinessDocs/session/agent-runs/2026-04-01T11-01-38-553Z-06.md
- Correctness: 6/10 — references concrete artifact path.
- Specificity: 5/10 — better than plan/code step markers due to concrete output location.
- Completeness: 3/10 — no quality checks or acceptance mapping.
- Actionability: 6/10 — path is actionable for follow-up.
- Overall: 🟡 FRAGILE
- Biggest quality gap: insufficient narrative of why changes satisfy intended story outcomes.

## OUTPUT QUALITY: sprint/session progression evidence

- Source: BusinessDocs/session/run-history.json:1, BusinessDocs/session/session-state.json:32
- Correctness: 6/10 — transitions and failures captured.
- Specificity: 5/10 — gate failures quantified by violation count.
- Completeness: 4/10 — violation details and semantic diagnosis are sparse in top-level artifacts.
- Actionability: 6/10 — enough to trigger re-runs/review.
- Overall: 🟡 FRAGILE
- Biggest quality gap: failure telemetry is quantitative but not deeply diagnostic.

## Area 6 Verdict

Observed outputs show active orchestration but inconsistent semantic richness. The strongest quality signal is structural traceability, while weakest is high-value reasoning content in generated artifacts.
