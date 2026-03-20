/**
 * Agent Performance Capture Hook (M7 / Issue #373)
 *
 * Creates an afterTransition hook that captures agent execution metrics
 * from the dispatcher's invocation log and records them into the
 * time-series metrics store.
 *
 * @module engine/agent-performance-hook
 */

import {
  type MetricsStore,
  type AgentPerformanceRecord,
  type ToolExecutionTraceRecord,
  createMetricsStore,
  recordAgentPerformance,
  recordToolExecutionTrace,
  serializeMetricsStore,
  deserializeMetricsStore,
} from '../sdlc/observability';

const METRICS_STORE_PATH = 'BusinessDocs/metrics/time-series-metrics.json';

interface PerformanceHookStore {
  exists(path: string): boolean;
  readFile(path: string): string;
  writeFile(path: string, data: string): void;
  mkdirp(path: string): void;
}

interface InvocationLogEntry {
  agentId: string;
  agentName: string;
  state: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  status: string;
  attempt: number;
  error?: string;
  provider?: string;
  model?: string;
  providerStatus?: string;
  finishReason?: string;
  providerLatencyMs?: number;
  modelAttempts?: number;
  modelRetries?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  contractValidationPassed?: boolean;
  toolTraceId?: string;
  toolInvocationCount?: number;
  toolAuditEvents?: Array<{
    toolId: string;
    operation?: string;
    durationMs?: number;
    success: boolean;
    errorCode?: string;
  }>;
}

/**
 * Create an afterTransition hook that captures agent performance.
 *
 * @param store - File store for reading/writing the metrics JSON
 * @param getInvocationLog - Function that returns the dispatcher's latest log entries
 * @param metricsPath - Override path for the time-series metrics file
 * @returns Hook function suitable for engine.hooks.afterTransition
 */
export function createAgentPerformanceHook(
  store: PerformanceHookStore,
  getInvocationLog: () => InvocationLogEntry[],
  metricsPath?: string
): (event: { from: string; to: string; timestamp: string }) => void {
  const filePath = metricsPath || METRICS_STORE_PATH;
  let processedCount = 0;

  return (_event: { from: string; to: string; timestamp: string }) => {
    const log = getInvocationLog();
    if (log.length <= processedCount) return;

    // Load or create metrics store
    let metricsStore: MetricsStore;
    try {
      const dir = filePath.replace(/[/\\][^/\\]+$/, '');
      if (dir && !store.exists(dir)) store.mkdirp(dir);
      metricsStore = store.exists(filePath)
        ? deserializeMetricsStore(store.readFile(filePath))
        : createMetricsStore();
    } catch {
      metricsStore = createMetricsStore();
    }

    // Process new log entries
    const newEntries = log.slice(processedCount);
    for (const entry of newEntries) {
      const record: AgentPerformanceRecord = {
        agent_id: entry.agentId,
        agent_name: entry.agentName,
        state: entry.state,
        started_at: entry.startTime,
        ended_at: entry.endTime || entry.startTime,
        duration_ms: entry.durationMs || 0,
        success: entry.status === 'success',
        attempt: entry.attempt,
        error: entry.error,
        provider: entry.provider,
        model: entry.model,
        provider_status: entry.providerStatus,
        finish_reason: entry.finishReason,
        provider_latency_ms: entry.providerLatencyMs,
        model_attempts: entry.modelAttempts,
        model_retries: entry.modelRetries,
        prompt_tokens: entry.promptTokens,
        completion_tokens: entry.completionTokens,
        total_tokens: entry.totalTokens,
        contract_validation_passed: entry.contractValidationPassed,
      };
      recordAgentPerformance(metricsStore, record);

      if (Array.isArray(entry.toolAuditEvents) && entry.toolAuditEvents.length > 0) {
        for (const toolEvent of entry.toolAuditEvents) {
          const toolRecord: ToolExecutionTraceRecord = {
            agent_id: entry.agentId,
            agent_name: entry.agentName,
            state: entry.state,
            tool_id: toolEvent.toolId,
            operation: toolEvent.operation,
            trace_id: entry.toolTraceId,
            duration_ms: toolEvent.durationMs || 0,
            success: toolEvent.success,
            error_code: toolEvent.errorCode,
          };
          recordToolExecutionTrace(metricsStore, toolRecord);
        }
      }
    }

    processedCount = log.length;

    // Persist
    try {
      store.writeFile(filePath, serializeMetricsStore(metricsStore));
    } catch {
      // Metrics persistence failure is non-fatal
    }
  };
}

export { METRICS_STORE_PATH };
