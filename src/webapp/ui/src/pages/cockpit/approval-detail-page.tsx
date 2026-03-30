/**
 * Approval Detail page — full context, risk assessment, and approve/reject workflow.
 * M27-005 / Approval Workflow UI
 */
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/page-shell';
import { ApprovalDetailPanel } from '@/components/cockpit/approval-workflow';
import { MissionControlHero } from '@/components/ui/mission-control-hero';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { StatusMotif } from '@/components/ui/status-motif';
import { ControlSignalBadge } from '@/components/ui/control-signal';
import { Badge } from '@/components/ui/badge';
import { useApprovalDetail } from '@/hooks';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useApprovalDetail(id ?? '');
  const approval = data?.approval;

  const isEmpty = !isLoading && !error && !data;

  const contextItems: ContextStripItem[] = [
    { id: 'approval-id', label: 'ID', value: approval?.id ?? 'n/a', tone: 'info' },
    {
      id: 'status',
      label: 'Status',
      value: approval?.status ?? 'UNKNOWN',
      tone: approval?.status === 'PENDING' ? 'warning' : 'success',
    },
    { id: 'gate', label: 'Gate', value: approval?.gate_id ?? 'n/a' },
    { id: 'stage', label: 'Stage', value: approval?.stage ?? 'n/a' },
    ...(approval?.deliverable_quality
      ? [
          {
            id: 'quality-score',
            label: 'Quality score',
            value: String(approval.deliverable_quality.score),
            tone:
              approval.deliverable_quality.approvalSignal === 'approve'
                ? ('success' as const)
                : approval.deliverable_quality.approvalSignal === 'review'
                  ? ('warning' as const)
                  : ('critical' as const),
          },
        ]
      : []),
  ];

  return (
    <PageShell
      isLoading={isLoading}
      loadingLabel="Loading approval detail…"
      error={error as Error | null}
      onRetry={() => refetch()}
      isEmpty={isEmpty}
      emptyState={{
        icon: <ShieldCheck className="size-8" />,
        title: 'Approval not found',
        description: 'This approval may have been removed or the ID is invalid.',
        action: {
          label: 'Back to Cockpit',
          onClick: () => navigate('/cockpit'),
        },
      }}
    >
      {!data ? null : (
        <div className="page-container-wide p-6 space-y-6" data-testid="approval-detail-page">
          <PageHeader
            title="Approval Review"
            subtitle="Resolve a governed checkpoint with full approval context and required human rationale."
            chips={[
              { id: 'approval-workflow', label: 'Approval workflow', tone: 'warning' },
              { id: 'needs-human', label: 'Needs human input', tone: 'critical' },
            ]}
          />

          <ContextStrip items={contextItems} />

          <MissionControlHero
            heroId="approval-detail"
            eyebrow="Approval review"
            title="Resolve a governed checkpoint with full approval context"
            description="This review surface brings together the gate, requester, risk context, related artifacts, and required human rationale before the approval can be closed."
            badges={
              <>
                <ControlSignalBadge signal="governed" />
                <ControlSignalBadge signal="needs-human-input" />
                <Badge variant="outline">Approval</Badge>
              </>
            }
            metrics={[
              { label: 'Approval ID', value: data.approval.id, detail: 'Current decision object' },
              { label: 'Status', value: data.approval.status, detail: 'Current approval state' },
              { label: 'Gate', value: data.approval.gate_id, detail: 'Controlled checkpoint' },
              { label: 'Stage', value: data.approval.stage, detail: 'Workflow stage in review' },
              ...(data.approval.deliverable_quality
                ? [
                    {
                      label: 'Quality score',
                      value: String(data.approval.deliverable_quality.score),
                      detail: `${data.approval.deliverable_quality.approvalSignal} signal`,
                    },
                  ]
                : []),
            ]}
            motifs={
              <>
                <StatusMotif
                  kind="governance"
                  title="Approvals remain first-class controls"
                  description="The review context makes governance explicit instead of burying approval work inside generic dialogs."
                />
                <StatusMotif
                  kind="agent"
                  title="Execution context stays attached"
                  description="Gate and stage metadata keep the approval tied to the execution path that triggered it."
                />
                <StatusMotif
                  kind="human-loop"
                  title="A person closes the loop"
                  description="Comments and decision actions make the human checkpoint visible and accountable."
                />
              </>
            }
            asideTitle="Review path"
            asideDescription="Start with gate and risk context, inspect any recommended action or attached artifacts, then approve or reject with rationale."
            asideContent={
              <Button variant="outline" onClick={() => navigate('/cockpit')}>
                <ArrowLeft className="size-4 mr-2" /> Back to Cockpit
              </Button>
            }
          />

          <ApprovalDetailPanel approval={data.approval} onClose={() => navigate('/cockpit')} />
        </div>
      )}
    </PageShell>
  );
}
