/**
 * Cockpit Dashboard page — Operational Cockpit combining confidence scores,
 * dependency graph, root-cause analysis, and approval workflow.
 * M27 / Operational Cockpit UI
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MissionControlHero } from '@/components/ui/mission-control-hero';
import { StatusMotif } from '@/components/ui/status-motif';
import { ControlSignalBadge } from '@/components/ui/control-signal';
import { ConfidencePanel } from '@/components/cockpit/confidence-indicators';
import { DependencyGraph } from '@/components/cockpit/dependency-graph';
import { RootCauseView } from '@/components/cockpit/root-cause-view';
import { ApprovalHistoryTimeline } from '@/components/cockpit/approval-workflow';
import { useCockpitHealth, useDependencyGraph, useRootCause, useApprovalHistory } from '@/hooks';
import type {
  CockpitHealthResponse,
  DependencyGraphResponse,
  RootCauseResponse,
  ApprovalHistoryResponse,
} from '@/lib/api-types';
import { Gauge, GitBranch, AlertTriangle, ClipboardCheck, RefreshCw } from 'lucide-react';

type Tab = 'health' | 'dependencies' | 'root-cause' | 'approvals';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'health', label: 'Health & Confidence', icon: <Gauge className="size-3" /> },
  { id: 'dependencies', label: 'Dependencies', icon: <GitBranch className="size-3" /> },
  { id: 'root-cause', label: 'Root-Cause Analysis', icon: <AlertTriangle className="size-3" /> },
  { id: 'approvals', label: 'Approval History', icon: <ClipboardCheck className="size-3" /> },
];

export default function CockpitDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('health');
  const navigate = useNavigate();

  const healthQuery = useCockpitHealth();
  const dependencyQuery = useDependencyGraph();
  const rootCauseQuery = useRootCause();
  const approvalHistoryQuery = useApprovalHistory();

  const handleRootCauseNavigate = useCallback(
    (link: string, type: string) => {
      switch (type) {
        case 'questionnaire':
          navigate(`/questionnaires${link}`);
          break;
        case 'decision':
          navigate(`/decisions${link}`);
          break;
        case 'sprint':
          navigate(`/sessions${link}`);
          break;
        default:
          navigate(link);
      }
    },
    [navigate]
  );

  return (
    <div className="p-6 space-y-6" data-testid="cockpit-dashboard-page">
      <MissionControlHero
        eyebrow="Operational cockpit"
        title="Investigate confidence, dependencies, and approvals from a single cockpit"
        description="Cockpit is the analytical control room for the platform: it combines machine confidence, dependency context, root-cause analysis, and approval history into one operator-facing surface."
        badges={
          <>
            <ControlSignalBadge signal="governed" />
            <ControlSignalBadge signal="active-agent" />
            <Badge variant="outline">Cockpit</Badge>
          </>
        }
        metrics={[
          {
            label: 'Sections',
            value: String(tabs.length),
            detail: 'Health, dependencies, root-cause, approvals',
          },
          {
            label: 'Active tab',
            value: tabs.find((tab) => tab.id === activeTab)?.label ?? 'Health',
            detail: 'Current cockpit lens',
          },
          {
            label: 'Primary use',
            value: 'Diagnosis',
            detail: 'Understand why the system behaves as it does',
          },
          {
            label: 'Operator mode',
            value: 'Investigate',
            detail: 'Use when runtime needs explanation',
          },
        ]}
        motifs={
          <>
            <StatusMotif
              kind="governance"
              title="Approval history remains visible"
              description="Cockpit analysis does not lose governance context; approvals remain part of the diagnostic story."
            />
            <StatusMotif
              kind="agent"
              title="Confidence ties back to execution"
              description="This view helps operators connect agent behavior, dependency structure, and confidence signals."
            />
            <StatusMotif
              kind="human-loop"
              title="Diagnosis informs human action"
              description="Root-cause and dependency views exist to help a person decide what to do next, not just to display data."
            />
          </>
        }
        asideTitle="Investigation path"
        asideDescription="Start with Health & Confidence, then move into Dependencies or Root-Cause Analysis when the system needs explanation rather than status tracking."
      />

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Cockpit sections"
        className="flex items-center gap-1 rounded-2xl border border-border/70 bg-card/72 p-1.5 shadow-sm backdrop-blur-sm"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`cockpit-panel-${tab.id}`}
            id={`cockpit-tab-${tab.id}`}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-background/80 text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div
        id={`cockpit-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`cockpit-tab-${activeTab}`}
      >
        {/* Health & Confidence */}
        {activeTab === 'health' && <HealthPanel query={healthQuery} />}

        {/* Dependencies */}
        {activeTab === 'dependencies' && <DependenciesPanel query={dependencyQuery} />}

        {/* Root-Cause */}
        {activeTab === 'root-cause' && (
          <RootCausePanel query={rootCauseQuery} onNavigate={handleRootCauseNavigate} />
        )}

        {/* Approval History */}
        {activeTab === 'approvals' && <ApprovalsPanel query={approvalHistoryQuery} />}
      </div>
    </div>
  );
}

/* ── Sub-panels ── */

interface QueryState<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

function HealthPanel({ query }: { query: QueryState<CockpitHealthResponse> }) {
  if (query.isLoading) return <Spinner label="Loading confidence scores…" />;
  if (query.error) return <ErrorBanner error={query.error} onRetry={query.refetch} />;
  const data = query.data;
  if (!data) return null;
  return (
    <ConfidencePanel
      sessionHealth={data.session_health}
      sprintReadiness={data.sprint_readiness}
      agentConfidence={data.agent_confidence}
    />
  );
}

function DependenciesPanel({ query }: { query: QueryState<DependencyGraphResponse> }) {
  if (query.isLoading) return <Spinner label="Loading dependency graph…" />;
  if (query.error) return <ErrorBanner error={query.error} onRetry={query.refetch} />;
  return (
    <DependencyGraph
      nodes={query.data?.nodes ?? []}
      edges={query.data?.edges ?? []}
      criticalPath={query.data?.critical_path ?? []}
    />
  );
}

function RootCausePanel({
  query,
  onNavigate,
}: {
  query: QueryState<RootCauseResponse>;
  onNavigate: (link: string, type: string) => void;
}) {
  if (query.isLoading) return <Spinner label="Loading root-cause data…" />;
  if (query.error) return <ErrorBanner error={query.error} onRetry={query.refetch} />;
  return <RootCauseView items={query.data?.items ?? []} onNavigate={onNavigate} />;
}

function ApprovalsPanel({ query }: { query: QueryState<ApprovalHistoryResponse> }) {
  if (query.isLoading) return <Spinner label="Loading approval history…" />;
  if (query.error) return <ErrorBanner error={query.error} onRetry={query.refetch} />;
  return <ApprovalHistoryTimeline />;
}

function ErrorBanner({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <AlertBanner variant="error">
      <div className="flex items-center justify-between gap-4 w-full">
        <span>{error.message}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-3 mr-1.5" /> Retry
        </Button>
      </div>
    </AlertBanner>
  );
}
