/**
 * Agent Execute Modal — triggers ad-hoc execution of a single agent (M31-001, M31-006).
 * Includes inline log panel (M31-007) and output viewer (M31-008).
 */
import { useState, useRef, useEffect } from 'react';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { useExecuteAgent, useCancelAgentJob } from '@/hooks';
import { Play, CheckCircle, XCircle, StopCircle, Copy, Download, ChevronDown } from 'lucide-react';
import type { AgentDetailEntry, AgentExecutionResult, ExecutionLogEntry } from '@/lib/api-types';

interface AgentExecuteModalProps {
  agent: AgentDetailEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecutionStart?: () => void;
  onExecutionEnd?: () => void;
}

export function AgentExecuteModal({
  agent,
  open,
  onOpenChange,
  onExecutionStart,
  onExecutionEnd,
}: AgentExecuteModalProps) {
  const [predecessorPaths, setPredecessorPaths] = useState('');
  const [questionnairePath, setQuestionnairePath] = useState('');
  const [result, setResult] = useState<AgentExecutionResult | null>(null);

  const executeAgent = useExecuteAgent();
  const cancelJob = useCancelAgentJob();

  const handleExecute = () => {
    setResult(null);
    onExecutionStart?.();
    const paths = predecessorPaths
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);

    executeAgent.mutate(
      {
        agentId: agent.id,
        payload: {
          context: {
            predecessorPaths: paths.length > 0 ? paths : undefined,
            questionnairePath: questionnairePath.trim() || undefined,
          },
        },
      },
      {
        onSuccess: (data) => {
          setResult(data.execution);
          onExecutionEnd?.();
        },
        onError: () => {
          onExecutionEnd?.();
        },
      }
    );
  };

  const handleCancel = () => {
    if (result?.job_id) {
      cancelJob.mutate(result.job_id);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setResult(null);
      setPredecessorPaths('');
      setQuestionnairePath('');
    }
    onOpenChange(isOpen);
  };

  return (
    <ModalDialog
      open={open}
      onOpenChange={handleClose}
      title={`Execute: ${agent.name}`}
      description={`Run agent ${agent.id} (${agent.name}) manually outside the orchestrator flow.`}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Close
          </Button>
          {executeAgent.isPending && result?.status === 'running' && (
            <Button variant="outline" onClick={handleCancel} disabled={cancelJob.isPending}>
              <StopCircle className="size-3 mr-1.5" /> Cancel
            </Button>
          )}
          <Button onClick={handleExecute} disabled={executeAgent.isPending}>
            {executeAgent.isPending ? (
              <>
                <Spinner className="size-3 mr-1.5" /> Executing…
              </>
            ) : (
              <>
                <Play className="size-3 mr-1.5" /> Execute Agent
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Agent info */}
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="info">{agent.phase}</Badge>
          <span className="text-muted-foreground">ID: {agent.id}</span>
        </div>

        {/* Optional context inputs */}
        <div className="space-y-3">
          <InputField
            label="Questionnaire Path (optional)"
            placeholder="BusinessDocs/questionnaire-answers.md"
            value={questionnairePath}
            onChange={(e) => setQuestionnairePath(e.target.value)}
            helperText="Path to questionnaire answers file for context injection."
          />

          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="predecessor-paths">
              Predecessor Paths (optional)
            </label>
            <textarea
              id="predecessor-paths"
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="One path per line, e.g.&#10;BusinessDocs/Phase1-Business/01-business-analyst.md&#10;BusinessDocs/Phase1-Business/02-domain-expert.md"
              value={predecessorPaths}
              onChange={(e) => setPredecessorPaths(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paths to predecessor agent output files for context injection.
            </p>
          </div>
        </div>

        {/* Execution log panel (M31-007) */}
        {result && result.logs.length > 0 && <ExecutionLogPanel logs={result.logs} />}

        {/* Execution result / output viewer (M31-008) */}
        {result && (
          <div className="mt-4" data-testid="execution-result">
            {result.status === 'completed' ? (
              <ExecutionOutputViewer result={result} />
            ) : result.status === 'cancelled' ? (
              <AlertBanner variant="warning">
                <div className="flex items-center gap-2">
                  <StopCircle className="size-4" />
                  <span>Execution cancelled</span>
                </div>
              </AlertBanner>
            ) : (
              <AlertBanner variant="error">
                <div className="flex items-center gap-2">
                  <XCircle className="size-4" />
                  <span>Failed: {result.error ?? 'Unknown error'}</span>
                </div>
              </AlertBanner>
            )}
          </div>
        )}

        {/* Mutation error */}
        {executeAgent.isError && !result && (
          <AlertBanner variant="error">{(executeAgent.error as Error).message}</AlertBanner>
        )}
      </div>
    </ModalDialog>
  );
}

/* ── Execution Log Panel (M31-007) ──────────────────────────── */

const logLevelColors: Record<string, string> = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

function ExecutionLogPanel({ logs }: { logs: ExecutionLogEntry[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40);
  };

  return (
    <div className="border rounded-md">
      <button
        type="button"
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium bg-muted/50 hover:bg-muted"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span>Execution Log ({logs.length} entries)</span>
        <ChevronDown className={`size-3 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
      </button>
      {!collapsed && (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="max-h-50 overflow-y-auto bg-zinc-950 p-2 font-mono text-xs"
          data-testid="execution-log-panel"
        >
          {logs.map((entry, i) => (
            <div key={i} className="flex gap-2 leading-5">
              <span className="text-zinc-500 shrink-0">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span
                className={`shrink-0 uppercase ${logLevelColors[entry.level] ?? 'text-zinc-400'}`}
              >
                [{entry.level}]
              </span>
              <span className="text-zinc-200">{entry.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Execution Output Viewer (M31-008) ──────────────────────── */

function ExecutionOutputViewer({ result }: { result: AgentExecutionResult }) {
  const [copied, setCopied] = useState(false);
  const confidencePercent =
    typeof result.confidence === 'number' && Number.isFinite(result.confidence)
      ? `${Math.round(Math.max(0, Math.min(1, result.confidence)) * 100)}%`
      : null;
  const uncertaintyLines = Array.isArray(result.uncertainty_reasons)
    ? result.uncertainty_reasons.filter((reason) => typeof reason === 'string' && reason.length > 0)
    : [];

  const summary = [
    `Agent: ${result.agent_name} (${result.agent_id})`,
    `Status: ${result.status}`,
    `Duration: ${((result.duration_ms ?? 0) / 1000).toFixed(1)}s`,
    result.output_path ? `Output: ${result.output_path}` : null,
    confidencePercent ? `Confidence: ${confidencePercent}` : null,
    typeof result.needs_human_review === 'boolean'
      ? `Needs human review: ${result.needs_human_review ? 'yes' : 'no'}`
      : null,
    uncertaintyLines.length > 0 ? `Uncertainty: ${uncertaintyLines.join('; ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.agent_id}-execution-${result.job_id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <AlertBanner variant="success">
        <div className="flex items-center gap-2">
          <CheckCircle className="size-4" />
          <span>
            Completed in {((result.duration_ms ?? 0) / 1000).toFixed(1)}s
            {result.output_path && (
              <span className="text-xs ml-2 text-muted-foreground">→ {result.output_path}</span>
            )}
          </span>
          {confidencePercent && (
            <Badge variant={result.needs_human_review ? 'warning' : 'success'}>
              Confidence {confidencePercent}
            </Badge>
          )}
        </div>
      </AlertBanner>

      {uncertaintyLines.length > 0 && (
        <AlertBanner variant="warning">
          <div className="text-xs space-y-1">
            {uncertaintyLines.map((reason) => (
              <div key={reason}>{reason}</div>
            ))}
          </div>
        </AlertBanner>
      )}

      {/* Toolbar */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={handleCopy}>
          <Copy className="size-3 mr-1" />
          {copied ? 'Copied!' : 'Copy'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={handleDownload}
        >
          <Download className="size-3 mr-1" /> Download
        </Button>
      </div>

      {/* Output preview */}
      <pre
        className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap"
        data-testid="execution-output"
      >
        {summary}
      </pre>
    </div>
  );
}
