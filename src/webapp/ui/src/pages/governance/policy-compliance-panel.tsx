/**
 * Policy compliance panel — displays policy inventory and evaluation results.
 * M22-007
 */
import { useState, useMemo } from 'react';
import { Heading, Text } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/ui/metric-card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePolicies, usePolicyEvaluation, useCreateException } from '@/hooks';
import { policyColumns } from './policy-columns';
import type { PolicyResult } from '@/lib/api-types';
import { FileCheck, ShieldAlert, CheckCircle, XCircle, AlertTriangle, Play } from 'lucide-react';

/* ── Evaluation result columns (inline, small table) ── */
function EvalResultBadge({ passed, severity }: { passed: boolean; severity: string }) {
  if (passed) return <Badge variant="success">PASS</Badge>;
  if (severity === 'blocking') return <Badge variant="error">BLOCK</Badge>;
  if (severity === 'warning') return <Badge variant="warning">WARN</Badge>;
  return <Badge variant="secondary">INFO</Badge>;
}

export default function PolicyCompliancePanel() {
  const { data, isLoading, error } = usePolicies();
  const evalMutation = usePolicyEvaluation();
  const exceptionMutation = useCreateException();

  const [exceptionPolicyId, setExceptionPolicyId] = useState<string | null>(null);
  const [exceptionReason, setExceptionReason] = useState('');
  const [exceptionApprovedBy, setExceptionApprovedBy] = useState('');

  const policies = useMemo(() => data?.policies ?? [], [data]);

  const counts = useMemo(() => {
    const security = policies.filter((p) => p.category === 'security').length;
    const quality = policies.filter((p) => p.category === 'quality').length;
    const blocking = policies.filter((p) => p.severity === 'blocking').length;
    return { total: policies.length, security, quality, blocking };
  }, [policies]);

  const evaluationResults = evalMutation.data?.evaluation?.results ?? [];
  const evaluationSummary = evalMutation.data?.evaluation?.summary;

  function handleRunEvaluation() {
    const checks: Record<string, boolean> = {};
    for (const p of policies) {
      checks[p.condition_check] = true;
    }
    evalMutation.mutate({
      context_type: 'gate',
      scope: 'sprint',
      checks,
    });
  }

  function handleCreateException(policyId: string) {
    if (!exceptionReason.trim() || !exceptionApprovedBy.trim()) return;
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    exceptionMutation.mutate(
      {
        policy_id: policyId,
        reason: exceptionReason,
        approved_by: exceptionApprovedBy,
        expires,
      },
      {
        onSuccess: () => {
          setExceptionPolicyId(null);
          setExceptionReason('');
          setExceptionApprovedBy('');
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading policy data…" />
      </div>
    );
  }

  if (error) {
    return (
      <AlertBanner variant="error">Failed to load policies: {(error as Error).message}</AlertBanner>
    );
  }

  return (
    <div className="space-y-6" data-testid="policy-compliance-panel">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Policies"
          value={counts.total}
          icon={<FileCheck className="size-4" />}
          trend="neutral"
        />
        <MetricCard
          label="Security"
          value={counts.security}
          icon={<ShieldAlert className="size-4" />}
          trend="neutral"
        />
        <MetricCard
          label="Quality"
          value={counts.quality}
          icon={<CheckCircle className="size-4" />}
          trend="neutral"
        />
        <MetricCard
          label="Blocking"
          value={counts.blocking}
          icon={<AlertTriangle className="size-4" />}
          trend={counts.blocking > 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* Policy inventory table */}
      <section aria-label="Policy inventory">
        <div className="flex items-center justify-between mb-3">
          <Heading level={3}>
            <FileCheck className="size-4 inline mr-2" />
            Policy Inventory
          </Heading>
          <Button
            size="sm"
            onClick={handleRunEvaluation}
            disabled={evalMutation.isPending || policies.length === 0}
          >
            <Play className="size-3 mr-1.5" />
            {evalMutation.isPending ? 'Evaluating…' : 'Run Evaluation'}
          </Button>
        </div>
        {policies.length === 0 ? (
          <EmptyState
            icon={<FileCheck className="size-12" />}
            title="No policies defined"
            description="Policy packs will appear once configured in platform/sdlc/policies/."
          />
        ) : (
          <DataTable
            columns={policyColumns}
            data={policies}
            enableSorting
            enablePagination
            emptyTitle="No policies"
          />
        )}
      </section>

      {/* Evaluation results */}
      {evaluationResults.length > 0 && (
        <section aria-label="Evaluation results">
          <Heading level={3} className="mb-3">
            <ShieldAlert className="size-4 inline mr-2" />
            Evaluation Results
          </Heading>

          {evaluationSummary && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
              <MetricCard label="Total" value={evaluationSummary.total} trend="neutral" />
              <MetricCard label="Passed" value={evaluationSummary.passed} trend="up" />
              <MetricCard
                label="Failed"
                value={evaluationSummary.failed}
                trend={evaluationSummary.failed > 0 ? 'down' : 'neutral'}
              />
              <MetricCard label="Skipped" value={evaluationSummary.skipped} trend="neutral" />
              <MetricCard
                label="Blocking"
                value={evaluationSummary.blocking_failures}
                trend={evaluationSummary.blocking_failures > 0 ? 'down' : 'neutral'}
              />
            </div>
          )}

          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="p-2">Policy</th>
                  <th className="p-2">Severity</th>
                  <th className="p-2">Result</th>
                  <th className="p-2">Reason</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {evaluationResults.map((r: PolicyResult) => (
                  <tr key={r.policy_id} className="border-b last:border-0">
                    <td className="p-2">
                      <span className="font-mono text-xs">{r.policy_id}</span>
                      <Text muted className="text-xs">
                        {r.policy_name}
                      </Text>
                    </td>
                    <td className="p-2">
                      <Badge
                        variant={
                          r.severity === 'blocking'
                            ? 'error'
                            : r.severity === 'warning'
                              ? 'warning'
                              : 'secondary'
                        }
                      >
                        {r.severity}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <EvalResultBadge passed={r.passed} severity={r.severity} />
                    </td>
                    <td className="p-2 text-xs text-muted-foreground max-w-xs truncate">
                      {r.reason}
                      {r.exception_applied && (
                        <Badge variant="info" className="ml-1 text-xs">
                          EXC
                        </Badge>
                      )}
                    </td>
                    <td className="p-2">
                      {!r.passed && exceptionPolicyId !== r.policy_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExceptionPolicyId(r.policy_id)}
                        >
                          Add Exception
                        </Button>
                      )}
                      {exceptionPolicyId === r.policy_id && (
                        <div className="flex items-center gap-1">
                          <Input
                            placeholder="Reason…"
                            value={exceptionReason}
                            onChange={(e) => setExceptionReason(e.target.value)}
                            className="h-7 text-xs w-28"
                            aria-label="Exception reason"
                          />
                          <Input
                            placeholder="Approved by…"
                            value={exceptionApprovedBy}
                            onChange={(e) => setExceptionApprovedBy(e.target.value)}
                            className="h-7 text-xs w-24"
                            aria-label="Approved by"
                          />
                          <Button
                            size="sm"
                            disabled={
                              !exceptionReason.trim() ||
                              !exceptionApprovedBy.trim() ||
                              exceptionMutation.isPending
                            }
                            onClick={() => handleCreateException(r.policy_id)}
                          >
                            <CheckCircle className="size-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setExceptionPolicyId(null);
                              setExceptionReason('');
                              setExceptionApprovedBy('');
                            }}
                          >
                            <XCircle className="size-3" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
