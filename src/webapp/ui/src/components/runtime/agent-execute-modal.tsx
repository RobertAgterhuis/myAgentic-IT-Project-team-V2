/**
 * Agent Execute Modal — triggers ad-hoc execution of a single agent (M31-001).
 */
import { useState } from 'react';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { useExecuteAgent } from '@/hooks';
import { Play, CheckCircle, XCircle } from 'lucide-react';
import type { AgentDetailEntry, AgentExecutionResult } from '@/lib/api-types';

interface AgentExecuteModalProps {
  agent: AgentDetailEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentExecuteModal({ agent, open, onOpenChange }: AgentExecuteModalProps) {
  const [predecessorPaths, setPredecessorPaths] = useState('');
  const [questionnairePath, setQuestionnairePath] = useState('');
  const [result, setResult] = useState<AgentExecutionResult | null>(null);

  const executeAgent = useExecuteAgent();

  const handleExecute = () => {
    setResult(null);
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
        onSuccess: (data) => setResult(data.execution),
      }
    );
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
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="One path per line, e.g.&#10;BusinessDocs/Phase1-Business/01-business-analyst.md&#10;BusinessDocs/Phase1-Business/02-domain-expert.md"
              value={predecessorPaths}
              onChange={(e) => setPredecessorPaths(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paths to predecessor agent output files for context injection.
            </p>
          </div>
        </div>

        {/* Execution result */}
        {result && (
          <div className="mt-4" data-testid="execution-result">
            {result.status === 'completed' ? (
              <AlertBanner variant="success">
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-4" />
                  <span>
                    Completed in {((result.duration_ms ?? 0) / 1000).toFixed(1)}s
                    {result.output_path && (
                      <span className="text-xs ml-2 text-muted-foreground">
                        → {result.output_path}
                      </span>
                    )}
                  </span>
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
