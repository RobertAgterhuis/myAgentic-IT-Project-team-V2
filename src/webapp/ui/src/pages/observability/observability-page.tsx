/**
 * Observability page — unified view for Drift, KPIs, Velocity, Agent Performance, Traceability.
 * Merges content from the former Metrics, Analytics, and Traceability pages.
 * M15 / Issue #M15-032
 */
import { useState, useMemo, lazy, Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';

const MetricsPage = lazy(() => import('@/pages/metrics/metrics-page'));
const AnalyticsTrendsPage = lazy(() => import('@/pages/analytics/analytics-trends-page'));
const TraceabilityExplorerPage = lazy(
  () => import('@/pages/traceability/traceability-explorer-page')
);

type Tab = 'drift' | 'analytics' | 'traceability';

const tabs: { id: Tab; label: string }[] = [
  { id: 'drift', label: 'Drift & KPIs' },
  { id: 'analytics', label: 'Analytics & Velocity' },
  { id: 'traceability', label: 'Traceability' },
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
  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? 'Unknown';

  const contextItems = useMemo<ContextStripItem[]>(
    () => [
      { id: 'active-view', label: 'Active view', value: activeTabLabel, tone: 'info' },
      { id: 'available-views', label: 'Views', value: String(tabs.length) },
      { id: 'loading-mode', label: 'Load mode', value: 'Lazy modules' },
    ],
    [activeTabLabel]
  );

  return (
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
        className="-mx-6 -mt-6"
      >
        <Suspense fallback={<TabSpinner />}>
          {activeTab === 'drift' && <MetricsPage />}
          {activeTab === 'analytics' && <AnalyticsTrendsPage />}
          {activeTab === 'traceability' && <TraceabilityExplorerPage />}
        </Suspense>
      </div>
    </div>
  );
}
