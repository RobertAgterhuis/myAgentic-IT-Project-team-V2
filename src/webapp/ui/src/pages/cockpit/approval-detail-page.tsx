/**
 * Approval Detail page — full context, risk assessment, and approve/reject workflow.
 * M27-005 / Approval Workflow UI
 */
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { ApprovalDetailPanel } from '@/components/cockpit/approval-workflow';
import { MissionControlHero } from '@/components/ui/mission-control-hero';
import { StatusMotif } from '@/components/ui/status-motif';
import { ControlSignalBadge } from '@/components/ui/control-signal';
import { Badge } from '@/components/ui/badge';
import { useApprovalDetail } from '@/hooks';
import { ArrowLeft, ShieldCheck, RefreshCw } from 'lucide-react';

export default function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useApprovalDetail(id ?? '');

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading approval detail…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <AlertBanner variant="error">
          <div className="flex items-center justify-between gap-4 w-full">
            <span>Failed to load approval: {(error as Error).message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3 mr-1.5" /> Retry
            </Button>
          </div>
        </AlertBanner>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<ShieldCheck className="size-8" />}
          title="Approval not found"
          description="This approval may have been removed or the ID is invalid."
        />
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => navigate('/cockpit')}>
            <ArrowLeft className="size-4 mr-2" /> Back to Cockpit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="approval-detail-page">
      <MissionControlHero
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
  );
}
