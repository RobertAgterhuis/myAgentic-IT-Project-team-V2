/**
 * Policy compliance panel — displays policy inventory and evaluation results.
 * M22-007
 */
import { useState, useMemo, useEffect } from 'react';
import { Heading, Text } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusMotif } from '@/components/ui/status-motif';
import { ControlSignalBadge } from '@/components/ui/control-signal';
import { ModalDialog } from '@/components/ui/modal-dialog';
import {
  usePolicies,
  usePolicyPacks,
  usePolicySignals,
  usePolicyEvaluation,
  useCreateException,
  useUpdatePolicy,
} from '@/hooks';
import { getPolicyColumns } from './policy-columns';
import type { PolicyEntry, PolicyResult, PolicyPackSummary, PolicySignal } from '@/lib/api-types';
import type { ColumnDef } from '@tanstack/react-table';
import { FileCheck, ShieldAlert, CheckCircle, XCircle, AlertTriangle, Play } from 'lucide-react';

/* ── Evaluation result columns (inline, small table) ── */
function EvalResultBadge({ passed, severity }: { passed: boolean; severity: string }) {
  if (passed) return <Badge variant="success">PASS</Badge>;
  if (severity === 'blocking') return <Badge variant="error">BLOCK</Badge>;
  if (severity === 'warning') return <Badge variant="warning">WARN</Badge>;
  return <Badge variant="secondary">INFO</Badge>;
}

function EditPolicyDialog({
  policy,
  onClose,
}: {
  policy: PolicyEntry | null;
  onClose: () => void;
}) {
  const updatePolicy = useUpdatePolicy();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<'global' | 'org' | 'team' | 'repo' | 'sprint'>('global');
  const [category, setCategory] = useState<
    'security' | 'quality' | 'compliance' | 'process' | 'architecture'
  >('security');
  const [severity, setSeverity] = useState<'blocking' | 'warning' | 'advisory'>('blocking');
  const [conditionType, setConditionType] = useState<
    'gate' | 'pr' | 'deploy' | 'artifact' | 'schedule'
  >('gate');
  const [conditionCheck, setConditionCheck] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    if (!policy) return;
    setName(policy.name);
    setDescription(policy.description ?? '');
    setScope(policy.scope as 'global' | 'org' | 'team' | 'repo' | 'sprint');
    setCategory(
      policy.category as 'security' | 'quality' | 'compliance' | 'process' | 'architecture'
    );
    setSeverity(policy.severity as 'blocking' | 'warning' | 'advisory');
    setConditionType(policy.condition_type as 'gate' | 'pr' | 'deploy' | 'artifact' | 'schedule');
    setConditionCheck(policy.condition_check);
    setActionMessage(policy.action_message ?? '');
  }, [policy]);

  if (!policy) return null;

  return (
    <ModalDialog
      title={`Edit ${policy.id}`}
      description="Update the policy rule stored in the policy pack."
      open={!!policy}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!name.trim() || !conditionCheck.trim()) return;
              updatePolicy.mutate(
                {
                  policy_id: policy.id,
                  name: name.trim(),
                  description: description.trim(),
                  scope,
                  category,
                  severity,
                  condition_type: conditionType,
                  condition_check: conditionCheck.trim(),
                  action_message: actionMessage.trim(),
                },
                { onSuccess: () => onClose() }
              );
            }}
            disabled={!name.trim() || !conditionCheck.trim() || updatePolicy.isPending}
            loading={updatePolicy.isPending}
          >
            Save changes
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <label className="text-sm font-medium" htmlFor="policy-name">
            Name
          </label>
          <Input id="policy-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium" htmlFor="policy-description">
            Description
          </label>
          <textarea
            id="policy-description"
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="policy-scope">
              Scope
            </label>
            <select
              id="policy-scope"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={scope}
              onChange={(e) => setScope(e.target.value as typeof scope)}
            >
              <option value="global">global</option>
              <option value="org">org</option>
              <option value="team">team</option>
              <option value="repo">repo</option>
              <option value="sprint">sprint</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="policy-category">
              Category
            </label>
            <select
              id="policy-category"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
            >
              <option value="security">security</option>
              <option value="quality">quality</option>
              <option value="compliance">compliance</option>
              <option value="process">process</option>
              <option value="architecture">architecture</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="policy-severity">
              Severity
            </label>
            <select
              id="policy-severity"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as typeof severity)}
            >
              <option value="blocking">blocking</option>
              <option value="warning">warning</option>
              <option value="advisory">advisory</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="policy-condition-type">
              Condition type
            </label>
            <select
              id="policy-condition-type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={conditionType}
              onChange={(e) => setConditionType(e.target.value as typeof conditionType)}
            >
              <option value="gate">gate</option>
              <option value="pr">pr</option>
              <option value="deploy">deploy</option>
              <option value="artifact">artifact</option>
              <option value="schedule">schedule</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="policy-condition-check">
              Condition check
            </label>
            <Input
              id="policy-condition-check"
              value={conditionCheck}
              onChange={(e) => setConditionCheck(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium" htmlFor="policy-action-message">
            Action message
          </label>
          <textarea
            id="policy-action-message"
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={actionMessage}
            onChange={(e) => setActionMessage(e.target.value)}
          />
        </div>
      </div>
    </ModalDialog>
  );
}

const packColumns: ColumnDef<PolicyPackSummary, unknown>[] = [
  {
    accessorKey: 'pack_name',
    header: 'Pack',
    cell: ({ row }) => (
      <div className="space-y-1">
        <div className="font-medium">{row.original.pack_name}</div>
        <div className="text-xs text-muted-foreground font-mono">{row.original.pack_id}</div>
      </div>
    ),
  },
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ getValue }) => <Badge variant="secondary">{(getValue() as string) || 'n/a'}</Badge>,
  },
  {
    accessorKey: 'policy_count',
    header: 'Policies',
    cell: ({ getValue }) => <span className="font-medium">{getValue() as number}</span>,
  },
  {
    accessorKey: 'categories',
    header: 'Categories',
    cell: ({ getValue }) => {
      const values = (getValue() as string[]) || [];
      return (
        <div className="flex flex-wrap gap-1">
          {values.map((value) => (
            <Badge key={value} variant="secondary">
              {value}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: 'severities',
    header: 'Severities',
    cell: ({ getValue }) => {
      const values = (getValue() as string[]) || [];
      return (
        <div className="flex flex-wrap gap-1">
          {values.map((value) => (
            <Badge key={value} variant={value === 'blocking' ? 'error' : 'secondary'}>
              {value}
            </Badge>
          ))}
        </div>
      );
    },
  },
];

function SignalRow({ signal }: { signal: PolicySignal }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-card/70 px-3 py-2">
      <div>
        <div className="text-sm font-medium">{signal.check}</div>
        <div className="text-xs text-muted-foreground">{signal.source}</div>
        {signal.details ? (
          <div className="text-xs text-muted-foreground">{signal.details}</div>
        ) : null}
      </div>
      <Badge variant={signal.passed ? 'success' : 'error'}>{signal.passed ? 'PASS' : 'FAIL'}</Badge>
    </div>
  );
}

export default function PolicyCompliancePanel() {
  const { data, isLoading, error } = usePolicies();
  const packsQuery = usePolicyPacks();
  const signalsQuery = usePolicySignals();
  const evalMutation = usePolicyEvaluation();
  const exceptionMutation = useCreateException();

  const [exceptionPolicyId, setExceptionPolicyId] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<PolicyEntry | null>(null);
  const [exceptionReason, setExceptionReason] = useState('');
  const [exceptionApprovedBy, setExceptionApprovedBy] = useState('');

  const policies = useMemo(() => data?.policies ?? [], [data]);
  const columns = useMemo(() => getPolicyColumns(setEditingPolicy), []);
  const packs = useMemo(() => packsQuery.data?.packs ?? [], [packsQuery.data]);
  const signals = useMemo(() => signalsQuery.data?.signals ?? [], [signalsQuery.data]);
  const missingSignals = useMemo(() => signalsQuery.data?.missing ?? [], [signalsQuery.data]);

  const signalSummary = useMemo(() => {
    const connected = signalsQuery.data ? Object.keys(signalsQuery.data.checks).length : 0;
    const missing = missingSignals.length;
    return { connected, total: connected + missing };
  }, [signalsQuery.data, missingSignals]);

  const counts = useMemo(() => {
    const security = policies.filter((p) => p.category === 'security').length;
    const quality = policies.filter((p) => p.category === 'quality').length;
    const blocking = policies.filter((p) => p.severity === 'blocking').length;
    return { total: policies.length, security, quality, blocking };
  }, [policies]);

  const evaluationResults = evalMutation.data?.evaluation?.results ?? [];
  const evaluationSummary = evalMutation.data?.evaluation?.summary;

  async function handleRunEvaluation() {
    const resolved = await signalsQuery.refetch();
    const checks = resolved.data?.checks ?? {};
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
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <Heading level={3} className="text-lg">
              Policy Packs
            </Heading>
            <Text className="text-sm text-muted-foreground">
              {packs.length} active packs across the governance baseline.
            </Text>
          </div>
          <Badge variant="secondary">{packs.length} packs</Badge>
        </div>
        <div className="mt-4">
          <DataTable
            columns={packColumns}
            data={packs}
            loading={packsQuery.isLoading}
            enableFiltering
            filterPlaceholder="Filter packs"
            emptyTitle="No policy packs"
            emptyDescription="Add policy packs under platform/sdlc/policies to load them here."
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <Heading level={3} className="text-lg">
              Policy Signals
            </Heading>
            <Text className="text-sm text-muted-foreground">
              Connected {signalSummary.connected} of {signalSummary.total} checks.
            </Text>
          </div>
          <Badge variant={signalSummary.connected > 0 ? 'success' : 'warning'}>
            {signalSummary.connected > 0 ? 'Signals active' : 'Signals missing'}
          </Badge>
        </div>
        <div className="mt-4 grid gap-2">
          {signals.length > 0 ? (
            signals.map((signal) => <SignalRow key={signal.check} signal={signal} />)
          ) : (
            <EmptyState
              title="No signals resolved"
              description="Connect policy checks to metrics or logs to enable live evaluation."
            />
          )}
        </div>
        {missingSignals.length > 0 ? (
          <div className="mt-4 rounded-lg border border-border/70 bg-muted/40 p-3">
            <div className="text-xs font-medium text-muted-foreground">
              Missing signals ({missingSignals.length})
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {missingSignals.slice(0, 10).map((check) => (
                <Badge key={check} variant="secondary">
                  {check}
                </Badge>
              ))}
              {missingSignals.length > 10 ? (
                <Badge variant="secondary">+{missingSignals.length - 10} more</Badge>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
        <Card elevation="flat" className="p-5 bg-card/76">
          <div className="flex flex-wrap items-center gap-2">
            <ControlSignalBadge signal="governed" />
            {counts.blocking > 0 && <ControlSignalBadge signal="needs-human-input" />}
            <Badge variant="outline">Policy assurance</Badge>
          </div>
          <Heading level={3} className="mt-3">
            Policy controls stay visible as operational evidence
          </Heading>
          <Text muted className="mt-2 max-w-2xl text-sm">
            Run evaluations, inspect blocking rules, and add exceptions only with explicit rationale
            so compliance remains part of delivery operations.
          </Text>
        </Card>
        <StatusMotif
          kind="governance"
          title="Systemic assurance"
          description="Use this panel when the question is whether the system conforms to policy, not just whether one approval is blocked."
        />
      </div>

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
            columns={columns}
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

          <div className="rounded-[26px] border border-border/70 bg-linear-to-br from-card via-card to-info/6 p-1 shadow-sm backdrop-blur-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-background/70 text-left">
                  <th className="p-2">Policy</th>
                  <th className="p-2">Severity</th>
                  <th className="p-2">Result</th>
                  <th className="p-2">Reason</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {evaluationResults.map((r: PolicyResult) => (
                  <tr
                    key={r.policy_id}
                    className="border-b border-border/60 last:border-0 hover:bg-background/60"
                  >
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

      <EditPolicyDialog policy={editingPolicy} onClose={() => setEditingPolicy(null)} />
    </div>
  );
}
