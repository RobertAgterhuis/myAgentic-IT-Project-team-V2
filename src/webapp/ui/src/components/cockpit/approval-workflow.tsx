/**
 * ApprovalWorkflow — enhanced approval detail with context and required-comment flow.
 * M27-005 / Human-approval workflow UI
 */
import { useState } from 'react';
import { Heading, Text } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import {
  useApprovalDetail,
  useApprovalHistory,
  useApproveWithComment,
  useRejectWithComment,
} from '@/hooks';
import type { ApprovalEntry, ApprovalHistoryEntry } from '@/lib/api-types';
import {
  CheckCircle,
  XCircle,
  Shield,
  AlertTriangle,
  MessageSquare,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/* ── Approval Detail Panel ── */

interface ApprovalDetailPanelProps {
  approval: ApprovalEntry;
  onClose?: () => void;
}

export function ApprovalDetailPanel({ approval, onClose }: ApprovalDetailPanelProps) {
  const { data: detail, isLoading } = useApprovalDetail(approval.id);
  const approveMutation = useApproveWithComment();
  const rejectMutation = useRejectWithComment();
  const [comment, setComment] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  const handleApprove = () => {
    if (!comment.trim()) return;
    approveMutation.mutate({ id: approval.id, reason: comment.trim() });
    setComment('');
    onClose?.();
  };

  const handleReject = () => {
    if (!comment.trim()) return;
    rejectMutation.mutate({ id: approval.id, reason: comment.trim() });
    setComment('');
    onClose?.();
  };

  if (isLoading) {
    return <Spinner label="Loading approval details…" />;
  }

  const approvalDetail = detail?.approval;

  return (
    <Card elevation="flat" className="p-5 space-y-4" data-testid="approval-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          <Heading level={3}>Approval Request</Heading>
        </div>
        <Badge variant="warning" className="text-xs">
          {approval.status}
        </Badge>
      </div>

      {/* Context */}
      <div className="space-y-3">
        <div>
          <Text className="text-xs font-semibold text-muted-foreground">Gate</Text>
          <Text className="text-sm">{approval.gate_id}</Text>
        </div>
        <div>
          <Text className="text-xs font-semibold text-muted-foreground">Stage</Text>
          <Text className="text-sm">{approval.stage}</Text>
        </div>
        <div>
          <Text className="text-xs font-semibold text-muted-foreground">Requested by</Text>
          <Text className="text-sm">{approval.requested_by}</Text>
        </div>
        <div>
          <Text className="text-xs font-semibold text-muted-foreground">Requested at</Text>
          <Text className="text-sm">{new Date(approval.requested_at).toLocaleString()}</Text>
        </div>

        {approvalDetail?.context && (
          <div>
            <Text className="text-xs font-semibold text-muted-foreground">Context</Text>
            <Text className="text-sm whitespace-pre-wrap">{approvalDetail.context}</Text>
          </div>
        )}

        {approvalDetail?.risk_assessment && (
          <div>
            <Text className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="size-3" /> Risk Assessment
            </Text>
            <Text className="text-sm">{approvalDetail.risk_assessment}</Text>
          </div>
        )}

        {approvalDetail?.recommended_action && (
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3">
            <Text className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              Recommended Action
            </Text>
            <Text className="text-sm text-blue-700 dark:text-blue-300">
              {approvalDetail.recommended_action}
            </Text>
          </div>
        )}

        {approvalDetail?.related_artifacts && approvalDetail.related_artifacts.length > 0 && (
          <div>
            <Text className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <FileText className="size-3" /> Related Artifacts
            </Text>
            <div className="flex flex-wrap gap-1 mt-1">
              {approvalDetail.related_artifacts.map((a, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] font-mono">
                  {a}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Side-by-side comparison for reevaluations */}
        {approvalDetail?.comparison && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
              className="text-xs"
            >
              {showComparison ? (
                <ChevronUp className="size-3 mr-1" />
              ) : (
                <ChevronDown className="size-3 mr-1" />
              )}
              {showComparison ? 'Hide' : 'Show'} Comparison
            </Button>
            {showComparison && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Card elevation="flat" className="p-3">
                  <Text className="text-[10px] font-semibold text-muted-foreground mb-1">
                    Before
                  </Text>
                  <pre className="text-[10px] whitespace-pre-wrap">
                    {approvalDetail.comparison.before}
                  </pre>
                </Card>
                <Card elevation="flat" className="p-3">
                  <Text className="text-[10px] font-semibold text-muted-foreground mb-1">
                    After
                  </Text>
                  <pre className="text-[10px] whitespace-pre-wrap">
                    {approvalDetail.comparison.after}
                  </pre>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comment + Actions */}
      {approval.status === 'PENDING' && (
        <div className="space-y-3 pt-3 border-t">
          <div>
            <label
              htmlFor="approval-comment"
              className="text-xs font-semibold text-muted-foreground flex items-center gap-1"
            >
              <MessageSquare className="size-3" /> Comment (required)
            </label>
            <textarea
              id="approval-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Provide your rationale…"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-20"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleApprove}
              disabled={!comment.trim() || approveMutation.isPending}
            >
              <CheckCircle className="size-3 mr-1" />
              {approveMutation.isPending ? 'Approving…' : 'Approve'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={!comment.trim() || rejectMutation.isPending}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="size-3 mr-1" />
              {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
            </Button>
          </div>
          {!comment.trim() && (
            <p className="text-[10px] text-amber-600">
              A comment is required before approving or rejecting.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── Approval History Timeline ── */

interface ApprovalHistoryTimelineProps {
  className?: string;
}

export function ApprovalHistoryTimeline({ className }: ApprovalHistoryTimelineProps) {
  const { data, isLoading, error } = useApprovalHistory();

  if (isLoading) return <Spinner label="Loading approval history…" />;
  if (error) {
    return (
      <AlertBanner variant="error">
        Failed to load approval history: {(error as Error).message}
      </AlertBanner>
    );
  }

  const history = data?.history ?? [];

  if (history.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="size-12" />}
        title="No approval history"
        description="Approval decisions will appear here."
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-2 ${className ?? ''}`} data-testid="approval-history">
      {history.map((entry: ApprovalHistoryEntry) => (
        <div key={entry.id} className="flex items-start gap-3 rounded-lg border p-3">
          {entry.action === 'APPROVED' ? (
            <CheckCircle className="size-4 text-green-500 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge
                variant={entry.action === 'APPROVED' ? 'success' : 'error'}
                className="text-[10px]"
              >
                {entry.action}
              </Badge>
              <span className="text-xs text-muted-foreground">by {entry.user}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(entry.decided_at).toLocaleString()}
              </span>
            </div>
            <p className="text-sm mt-1">{entry.reason}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
