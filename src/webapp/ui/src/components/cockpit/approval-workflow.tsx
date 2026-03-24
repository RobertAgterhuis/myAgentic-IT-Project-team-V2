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
import { ControlSignalBadge } from '@/components/ui/control-signal';
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
  ExternalLink,
} from 'lucide-react';

function qualityVariant(signal: 'approve' | 'review' | 'block'): 'success' | 'warning' | 'error' {
  if (signal === 'approve') return 'success';
  if (signal === 'review') return 'warning';
  return 'error';
}

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
    <Card
      elevation="raised"
      tone="info"
      className="overflow-hidden p-5 space-y-5"
      data-testid="approval-detail"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ControlSignalBadge signal="governed" />
            {approval.status === 'PENDING' && <ControlSignalBadge signal="needs-human-input" />}
          </div>
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            <Heading level={3}>Approval Request</Heading>
          </div>
          <Text muted className="max-w-2xl text-sm">
            Review the gate, risk context, artifacts, and recommendation before completing the human
            checkpoint.
          </Text>
        </div>
        <Badge variant="warning" className="text-xs">
          {approval.status}
        </Badge>
      </div>

      {/* Context */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
          <Text className="text-xs font-semibold text-muted-foreground">Gate</Text>
          <Text className="text-sm">{approval.gate_id}</Text>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
          <Text className="text-xs font-semibold text-muted-foreground">Stage</Text>
          <Text className="text-sm">{approval.stage}</Text>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
          <Text className="text-xs font-semibold text-muted-foreground">Requested by</Text>
          <Text className="text-sm">{approval.requested_by}</Text>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
          <Text className="text-xs font-semibold text-muted-foreground">Requested at</Text>
          <Text className="text-sm">{new Date(approval.requested_at).toLocaleString()}</Text>
        </div>

        <div className="space-y-3 md:col-span-2">
          {approvalDetail?.context && (
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <Text className="text-xs font-semibold text-muted-foreground">Context</Text>
              <Text className="text-sm whitespace-pre-wrap">{approvalDetail.context}</Text>
            </div>
          )}

          {approvalDetail?.risk_assessment && (
            <div className="rounded-2xl border border-warning/20 bg-warning/8 p-4">
              <Text className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="size-3" /> Risk Assessment
              </Text>
              <Text className="text-sm">{approvalDetail.risk_assessment}</Text>
            </div>
          )}

          {approvalDetail?.recommended_action && (
            <div className="rounded-2xl border border-info/20 bg-info/10 p-4">
              <Text className="text-xs font-semibold text-info-foreground/85">
                Recommended Action
              </Text>
              <Text className="text-sm text-info-foreground">
                {approvalDetail.recommended_action}
              </Text>
            </div>
          )}

          {approvalDetail?.deliverable_quality && (
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Text className="text-xs font-semibold text-muted-foreground">
                    Deliverable Quality
                  </Text>
                  <Text className="text-sm">{approvalDetail.deliverable_quality.summary}</Text>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">score {approvalDetail.deliverable_quality.score}</Badge>
                  <Badge
                    variant={qualityVariant(approvalDetail.deliverable_quality.approvalSignal)}
                  >
                    {approvalDetail.deliverable_quality.approvalSignal}
                  </Badge>
                </div>
              </div>
              <Text className="text-xs text-muted-foreground">
                Source artifact: {approvalDetail.deliverable_quality.source_artifact}
              </Text>
              <div className="grid gap-2 md:grid-cols-2">
                {approvalDetail.deliverable_quality.metrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="rounded-xl border border-border/60 bg-background/80 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Text className="text-xs font-semibold text-muted-foreground">
                        {metric.label}
                      </Text>
                      <Badge variant="secondary">{metric.score}</Badge>
                    </div>
                    <Text className="text-xs mt-1">{metric.detail}</Text>
                  </div>
                ))}
              </div>
            </div>
          )}

          {approvalDetail?.related_artifacts && approvalDetail.related_artifacts.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
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

          {approvalDetail?.similar_overrides && approvalDetail.similar_overrides.length > 0 && (
            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 space-y-2">
              <Text className="text-xs font-semibold text-muted-foreground">
                Similar Past Overrides
              </Text>
              {approvalDetail.similar_overrides.map((lesson) => (
                <div
                  key={lesson.id}
                  className="rounded-xl border border-border/60 bg-background/80 p-3 space-y-1"
                >
                  <Text className="text-xs">{lesson.summary}</Text>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px]">
                      score {lesson.score.toFixed(2)}
                    </Badge>
                    {lesson.workspace_id && (
                      <Badge variant="outline" className="text-[10px]">
                        workspace {lesson.workspace_id}
                      </Badge>
                    )}
                    <a
                      href={lesson.citation_url}
                      className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                    >
                      {lesson.citation_label}
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Side-by-side comparison for reevaluations */}
          {approvalDetail?.comparison && (
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
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
                  <Card elevation="flat" className="p-3 bg-background/70">
                    <Text className="text-[10px] font-semibold text-muted-foreground mb-1">
                      Before
                    </Text>
                    <pre className="text-[10px] whitespace-pre-wrap">
                      {approvalDetail.comparison.before}
                    </pre>
                  </Card>
                  <Card elevation="flat" className="p-3 bg-background/70">
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
      </div>

      {/* Comment + Actions */}
      {approval.status === 'PENDING' && (
        <div className="space-y-3 rounded-2xl border border-border/60 bg-background/65 p-4">
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
              className="mt-1 min-h-20 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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
        <div
          key={entry.id}
          className="flex items-start gap-3 rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-info/6 p-4 shadow-sm backdrop-blur-sm"
        >
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
