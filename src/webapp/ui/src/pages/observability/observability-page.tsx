/**
 * Observability page — unified view for Drift, KPIs, Velocity, Agent Performance, Traceability.
 * Merges content from the former Metrics, Analytics, and Traceability pages.
 * M15 / Issue #M15-032
 */
import { useState, useMemo, lazy, Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { PageShell } from '@/components/ui/page-shell';
import { QueueTriageList, type QueueTriageItem } from '@/components/ui/queue-triage-list';
import { OperationalCard } from '@/components/ui/operational-card';
import { useObservabilityContracts } from '@/hooks';

const MetricsPage = lazy(() => import('@/pages/metrics/metrics-page'));
const AnalyticsTrendsPage = lazy(() => import('@/pages/analytics/analytics-trends-page'));
const TraceabilityExplorerPage = lazy(
  () => import('@/pages/traceability/traceability-explorer-page')
);

type Tab = 'drift' | 'analytics' | 'traceability' | 'alerts' | 'streams';

const tabs: { id: Tab; label: string }[] = [
  { id: 'drift', label: 'Drift & KPIs' },
  { id: 'analytics', label: 'Analytics & Velocity' },
  { id: 'traceability', label: 'Traceability' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'streams', label: 'Telemetry Streams' },
];

function TabSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Spinner label="Loading…" />
    </div>
  );
}

export default function ObservabilityPage() {
  const [activeTab, setActiveTab] = useState<Tab>('drift');
  const { data, isLoading, error, refetch } = useObservabilityContracts();
  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? 'Unknown';

  const ragFreshnessStream = useMemo(
    () => (data?.streams ?? []).find((stream) => stream.id === 'stream-rag-freshness') ?? null,
    [data?.streams]
  );

  const ragFreshnessAlerts = useMemo(
    () => (data?.alerts ?? []).filter((alert) => alert.source === 'rag-freshness'),
    [data?.alerts]
  );

  const ragStatus = useMemo<'healthy' | 'warning' | 'critical'>(() => {
    if (ragFreshnessAlerts.some((entry) => entry.severity === 'critical')) return 'critical';
    if (ragFreshnessAlerts.some((entry) => entry.severity === 'warning')) return 'warning';
    return 'healthy';
  }, [ragFreshnessAlerts]);

  const contextItems = useMemo<ContextStripItem[]>(
    () => [
      { id: 'active-view', label: 'Active view', value: activeTabLabel, tone: 'info' },
      { id: 'available-views', label: 'Views', value: String(tabs.length) },
      {
        id: 'open-alerts',
        label: 'Open alerts',
        value: String(data?.summary.open_alerts ?? 0),
        tone: (data?.summary.open_alerts ?? 0) > 0 ? 'warning' : 'success',
      },
      {
        id: 'streams',
        label: 'Telemetry streams',
        value: String(data?.summary.stream_count ?? 0),
        tone: 'info',
      },
      { id: 'loading-mode', label: 'Load mode', value: 'Lazy modules' },
    ],
    [activeTabLabel, data?.summary.open_alerts, data?.summary.stream_count]
  );

  // All alerts (for Alerts tab) and all streams (for Streams tab)
  const allAlertItems = useMemo<QueueTriageItem[]>(
    () =>
      (data?.alerts ?? []).map((alert) => ({
        id: alert.id,
        title: alert.message,
        subtitle: `${alert.source} · ${alert.status}`,
        statusLabel: alert.severity,
        statusTone:
          alert.severity === 'critical'
            ? 'critical'
            : alert.severity === 'warning'
              ? 'warning'
              : 'info',
        priority:
          alert.severity === 'critical' ? 'high' : alert.severity === 'warning' ? 'medium' : 'low',
        meta: [
          {
            id: `${alert.id}-first`,
            label: 'First seen',
            value: new Date(alert.first_seen).toLocaleString(),
          },
          {
            id: `${alert.id}-last`,
            label: 'Last seen',
            value: new Date(alert.last_seen).toLocaleString(),
          },
        ],
      })),
    [data?.alerts]
  );

  return (
    <PageShell
      isLoading={isLoading}
      loadingLabel="Loading observability contracts…"
      error={error as Error | null}
      onRetry={() => refetch()}
    >
      <div className="p-6 space-y-6" data-testid="observability-page">
        <PageHeader
          title="Observability"
          subtitle="Drift detection, velocity trends, agent analytics, and traceability"
          chips={[
            { id: 'unified-view', label: 'Unified runtime view', tone: 'info' },
            { id: 'cross-signals', label: 'Cross-signal telemetry' },
          ]}
        />

        <ContextStrip items={contextItems} />

        {/* Tab bar */}
        <div
          role="tablist"
          aria-label="Observability tabs"
          className="flex items-center gap-1 border-b"
        >
          {tabs.map((tab) =>
            activeTab === tab.id ? (
              <button
                key={tab.id}
                role="tab"
                aria-selected="true"
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                className="px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px border-primary text-foreground"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ) : (
              <button
                key={tab.id}
                role="tab"
                aria-selected="false"
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                className="px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            )
          )}
        </div>

        {/* Tab panels */}
        <div
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          className={activeTab === 'alerts' || activeTab === 'streams' ? undefined : '-mx-6 -mt-6'}
        >
          <Suspense fallback={<TabSpinner />}>
            {activeTab === 'drift' && <MetricsPage />}
            {activeTab === 'analytics' && <AnalyticsTrendsPage />}
            {activeTab === 'traceability' && <TraceabilityExplorerPage />}
            {activeTab === 'alerts' && (
              <div className="space-y-4 pt-2">
                <QueueTriageList
                  title="All alerts"
                  description="Full alert feed from drift detection and runtime telemetry sources."
                  items={allAlertItems}
                  emptyTitle="No alerts"
                  emptyDescription="No current alert signals require intervention."
                />
              </div>
            )}
            {activeTab === 'streams' && (
              <div className="space-y-4 pt-2">
                <section aria-label="RAG freshness" className="space-y-3">
                  <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                    RAG Freshness
                  </h3>
                  <OperationalCard
                    title="RAG index freshness"
                    subtitle={
                      ragStatus === 'critical'
                        ? 'Critical freshness issues detected'
                        : ragStatus === 'warning'
                          ? 'Freshness drift detected'
                          : 'Collections are healthy'
                    }
                    statusLabel={ragStatus.toUpperCase()}
                    statusTone={
                      ragStatus === 'critical'
                        ? 'critical'
                        : ragStatus === 'warning'
                          ? 'warning'
                          : 'success'
                    }
                    meta={[
                      {
                        id: 'rag-health-ratio',
                        label: 'Healthy ratio',
                        value:
                          ragFreshnessStream && Number.isFinite(ragFreshnessStream.latest)
                            ? `${ragFreshnessStream.latest}%`
                            : 'n/a',
                      },
                      {
                        id: 'rag-samples',
                        label: 'Collections monitored',
                        value: String(ragFreshnessStream?.sample_count ?? 0),
                      },
                      {
                        id: 'rag-stale',
                        label: 'Stale/missing alerts',
                        value: String(ragFreshnessAlerts.length),
                      },
                      {
                        id: 'rag-updated',
                        label: 'Generated',
                        value: data?.generated_at
                          ? new Date(data.generated_at).toLocaleString()
                          : 'n/a',
                      },
                    ]}
                  />
                </section>

                <p className="text-sm text-muted-foreground">
                  Live telemetry streams ingested from all connected agent runtimes. Each card
                  represents one instrumented signal channel.
                </p>
                {(data?.streams?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No telemetry streams available.
                  </p>
                ) : (
                  <section
                    aria-label="Telemetry streams"
                    className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                  >
                    {data?.streams.map((stream) => (
                      <OperationalCard
                        key={stream.id}
                        title={stream.name}
                        subtitle={`${stream.sample_count} samples`}
                        statusLabel={stream.kind}
                        statusTone={stream.kind === 'errors' ? 'warning' : 'info'}
                        meta={[
                          {
                            id: `${stream.id}-latest`,
                            label: 'Latest',
                            value: `${stream.latest} ${stream.unit}`,
                          },
                          { id: `${stream.id}-unit`, label: 'Unit', value: stream.unit },
                          {
                            id: `${stream.id}-alerts`,
                            label: 'Correlated alerts',
                            value: String(
                              (data?.alerts ?? []).filter((a) => a.source === stream.name).length
                            ),
                          },
                        ]}
                      />
                    ))}
                  </section>
                )}
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </PageShell>
  );
}
