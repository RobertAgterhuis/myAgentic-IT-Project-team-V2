/**
 * Approval Detail page — full context, risk assessment, and approve/reject workflow.
 * M27-005 / Approval Workflow UI
 */
import { useParams, useNavigate } from 'react-router-dom';
import { Heading } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { ApprovalDetailPanel } from '@/components/cockpit/approval-workflow';
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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cockpit')}>
          <ArrowLeft className="size-4" />
        </Button>
        <Heading level={1}>Approval Review</Heading>
      </div>

      <ApprovalDetailPanel approval={data.approval} onClose={() => navigate('/cockpit')} />
    </div>
  );
}
