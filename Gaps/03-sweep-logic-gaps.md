# Sweep 3 — Logic Gaps & Unhandled Paths

## Findings

[🔴 CRITICAL] LOGIC GAP: src/webapp/ui/src/hooks/use-observability-contracts.ts:143-153
What exists: Aggregates drift/trends/rag freshness via `Promise.allSettled` and builds a telemetry contract.
What's missing: Endpoint compatibility check for drift route plus hard failure signaling to the user when all sources fail.
Trigger condition: Drift endpoint requested at `/v1/drift` while backend exposes `/api/drift`.
Likely failure mode: Silent fallback to static sample contract (`sampleObservabilityTelemetryContract`), producing believable but synthetic observability data.

Relevant snippet:

```ts
const [driftRes, trendsRes, ragFreshnessRes] = await Promise.allSettled([
  apiGet<DriftResponse>('/v1/drift'),
  apiGet<TimestampedResponse<AnalyticsTrendsData>>('/v1/analytics/trends'),
  apiGet<ObservabilityRagFreshnessResponse>('/v1/observability/rag-freshness'),
]);
...
if (!drift && !trends && !ragFreshness) {
  return sampleObservabilityTelemetryContract;
}
```

[🟠 MAJOR] LOGIC GAP: src/webapp/ui/src/hooks/use-audit-evidence.ts:153-158
What exists: Pulls artifacts and approvals, then builds evidence aggregation.
What's missing: Error propagation/visibility; all errors collapse into static sample data.
Trigger condition: Any backend/API failure for artifacts or approvals.
Likely failure mode: Silent false-positive UI state (appears healthy with demo-like audit entries).

Relevant snippet:

```ts
try {
  const [artifactRes, approvalRes] = await Promise.all([
    apiGet<ArtifactListResponse>('/v1/artifacts'),
    apiGet<ApprovalsListResponse>('/v1/approvals'),
  ]);
  return buildAuditAggregation(artifactRes.artifacts, approvalRes.approvals);
} catch {
  return sampleAuditEvidenceAggregation;
}
```

[🟡 MODERATE] LOGIC GAP: src/webapp/routes/auth.ts:566-576 vs src/webapp/auth.ts:1544-1546
What exists: Config validation endpoint computes `allConfigured` as GitHub AND Entra required.
What's missing: Alignment with actual auth boot condition (GitHub OR Entra).
Trigger condition: Deployments intentionally configured with one provider.
Likely failure mode: Misleading setup diagnostics; users are told setup is incomplete when it is operational.

[🟠 MAJOR] LOGIC GAP: src/webapp/auth.ts:899
What exists: Provider interface defines token refresh.
What's missing: GitHub refresh implementation.
Trigger condition: Any feature path attempting OAuth refresh for GitHub provider.
Likely failure mode: Runtime exception and forced re-authentication (or auth workflow break).
