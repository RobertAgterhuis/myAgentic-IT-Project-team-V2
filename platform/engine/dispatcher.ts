/**
 * Agent Invocation Dispatcher (FEAT-05-B)
 *
 * Given a state transition, selects the correct agent, injects context
 * (predecessor outputs + questionnaire answers), invokes the agent,
 * validates the deliverable, and logs the result.
 *
 * AC-1: Receives agent ID, platform, predecessor paths, questionnaire inputs
 * AC-2: Platform routing (Copilot, Claude, OpenAI)
 * AC-3: Context injection from predecessor files
 * AC-4: Questionnaire injection
 * AC-5: Deliverable validation against contract
 * AC-6: Timeout handling
 * AC-7: Retry logic
 * AC-8: Logging
 */

import path from 'node:path';
import { STATES } from './state-machine';
import type { JobQueue, JobType } from './jobs/job-types';
import type { AgentRuntimeAdapter, RuntimeAdapterResult } from './agent-runtime-adapter';
import agentsSchema from '../schema/agents.json';

// ─── Error Severity Classification (M5 / Evolution 5) ───────

enum ErrorSeverity {
  TRANSIENT = 'TRANSIENT',
  RECOVERABLE = 'RECOVERABLE',
  FATAL = 'FATAL',
}

const TRANSIENT_PATTERNS: RegExp[] = [
  /timeout/i,
  /ETIMEDOUT/,
  /ECONNRESET/,
  /ECONNREFUSED/,
  /rate.?limit/i,
  /\b429\b/,
  /\b503\b/,
  /network/i,
];

const FATAL_PATTERNS: RegExp[] = [
  /auth(?:entication|orization)?.?fail/i,
  /\b401\b/,
  /\b403\b/,
  /state.?corrupt/i,
  /contract.?violation/i,
];

interface DispatcherStore {
  exists(path: string): boolean;
  read(path: string): string;
}

interface AgentRef {
  id: string;
  name: string;
}

interface PredecessorContractSummary {
  source: string;
  headingCount: number;
  headings: string[];
  hasHandoffChecklist: boolean;
  checklist: {
    total: number;
    checked: number;
    completionRatio: number;
  } | null;
}

export interface AgentExecutionContext {
  [key: string]: unknown;
  agentId: string;
  skillFile: string;
  predecessorOutputs: Record<string, string>;
  predecessorContracts: PredecessorContractSummary[];
  questionnaireInput: string | null;
  ragContext: {
    query: string;
    collections: string[];
    matches: Array<{
      text: string;
      source_path: string;
      start_line: number | null;
      collection: string;
      score: number;
    }>;
  } | null;
  sessionState: unknown;
  workspaceId: string | null;
  gitService?: unknown;
}

interface CanonicalSchemaAgent {
  id?: unknown;
  name?: unknown;
  phase?: unknown;
}

interface InvocationEntry {
  agentId: string;
  agentName: string;
  platform: string;
  state: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  status: string;
  attempt: number;
  error?: string;
  outputPath?: string;
  errorSeverity?: string;
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
  confidence?: number;
  uncertainty_reasons?: string[];
  needs_human_review?: boolean;
}

interface ConfidenceAssessment {
  confidence: number;
  uncertainty_reasons: string[];
  needs_human_review: boolean;
}

function evaluatePredecessorContractContinuity(context: Record<string, unknown>): string[] {
  const contracts = context.predecessorContracts;
  if (!Array.isArray(contracts) || contracts.length === 0) return [];

  const warnings: string[] = [];
  for (const contract of contracts) {
    if (!contract || typeof contract !== 'object') continue;

    const row = contract as {
      source?: unknown;
      hasHandoffChecklist?: unknown;
      checklist?: { total?: unknown; checked?: unknown } | null;
    };

    if (row.hasHandoffChecklist !== true || !row.checklist) continue;

    const total =
      typeof row.checklist.total === 'number' && Number.isFinite(row.checklist.total)
        ? row.checklist.total
        : 0;
    const checked =
      typeof row.checklist.checked === 'number' && Number.isFinite(row.checklist.checked)
        ? row.checklist.checked
        : 0;

    if (total > 0 && checked < total) {
      const source = typeof row.source === 'string' ? row.source : 'unknown-source';
      warnings.push(
        `Predecessor handoff checklist incomplete: ${source} (${checked}/${total} checked)`
      );
    }
  }

  return warnings;
}

function shouldEnforcePredecessorContractContinuity(
  config: Record<string, unknown>,
  state: string,
  agentId: string
): boolean {
  const mode = config.enforcePredecessorContractContinuity;
  if (mode === true) return true;
  if (mode === false || mode === undefined || mode === null) return false;

  if (typeof mode === 'object' && !Array.isArray(mode)) {
    const typed = mode as { states?: unknown; agents?: unknown };
    const hasStateFilter = Array.isArray(typed.states);
    const hasAgentFilter = Array.isArray(typed.agents);

    const stateMatch = hasStateFilter
      ? (typed.states as unknown[]).some((entry) => entry === state)
      : false;
    const agentMatch = hasAgentFilter
      ? (typed.agents as unknown[]).some((entry) => entry === agentId)
      : false;

    if (hasStateFilter || hasAgentFilter) {
      return stateMatch || agentMatch;
    }
  }

  return false;
}

interface InvocationResponseContract {
  provider?: string;
  model?: string;
  status?: string;
  finishReason?: string;
  attempts?: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  toolTraceId?: string;
  toolInvocationCount?: number;
  toolAuditEvents?: Array<{
    toolId: string;
    operation?: string;
    durationMs?: number;
    success: boolean;
    errorCode?: string;
  }>;
  contractValidation?: { status?: string };
  requestedAt?: string;
  completedAt?: string;
}

interface NormalizedInvocationResult {
  outputPath?: string;
  response?: InvocationResponseContract;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOptionalString(
  source: Record<string, unknown>,
  key: string,
  errorPrefix: string
): string | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new Error(`${errorPrefix}.${key} must be a string`);
  }
  return value;
}

function readOptionalNumber(
  source: Record<string, unknown>,
  key: string,
  errorPrefix: string
): number | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${errorPrefix}.${key} must be a finite number`);
  }
  return value;
}

function normalizeToolAuditEvents(
  value: unknown,
  errorPrefix: string
): InvocationResponseContract['toolAuditEvents'] {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`${errorPrefix}.toolAuditEvents must be an array`);
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`${errorPrefix}.toolAuditEvents[${index}] must be an object`);
    }
    const toolId = readOptionalString(item, 'toolId', `${errorPrefix}.toolAuditEvents[${index}]`);
    const success = item.success;
    if (!toolId) {
      throw new Error(`${errorPrefix}.toolAuditEvents[${index}].toolId is required`);
    }
    if (typeof success !== 'boolean') {
      throw new Error(`${errorPrefix}.toolAuditEvents[${index}].success must be boolean`);
    }
    return {
      toolId,
      operation: readOptionalString(item, 'operation', `${errorPrefix}.toolAuditEvents[${index}]`),
      durationMs: readOptionalNumber(
        item,
        'durationMs',
        `${errorPrefix}.toolAuditEvents[${index}]`
      ),
      success,
      errorCode: readOptionalString(item, 'errorCode', `${errorPrefix}.toolAuditEvents[${index}]`),
    };
  });
}

function normalizeInvocationResponse(value: unknown): InvocationResponseContract | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throw new Error('Invocation result response must be an object');
  }

  const usageRaw = value.usage;
  let usage: InvocationResponseContract['usage'];
  if (usageRaw !== undefined) {
    if (!isRecord(usageRaw)) {
      throw new Error('Invocation result response.usage must be an object');
    }
    usage = {
      promptTokens: readOptionalNumber(
        usageRaw,
        'promptTokens',
        'Invocation result response.usage'
      ),
      completionTokens: readOptionalNumber(
        usageRaw,
        'completionTokens',
        'Invocation result response.usage'
      ),
      totalTokens: readOptionalNumber(usageRaw, 'totalTokens', 'Invocation result response.usage'),
    };
  }

  const contractValidationRaw = value.contractValidation;
  let contractValidation: InvocationResponseContract['contractValidation'];
  if (contractValidationRaw !== undefined) {
    if (!isRecord(contractValidationRaw)) {
      throw new Error('Invocation result response.contractValidation must be an object');
    }
    contractValidation = {
      status: readOptionalString(
        contractValidationRaw,
        'status',
        'Invocation result response.contractValidation'
      ),
    };
  }

  return {
    provider: readOptionalString(value, 'provider', 'Invocation result response'),
    model: readOptionalString(value, 'model', 'Invocation result response'),
    status: readOptionalString(value, 'status', 'Invocation result response'),
    finishReason: readOptionalString(value, 'finishReason', 'Invocation result response'),
    attempts: readOptionalNumber(value, 'attempts', 'Invocation result response'),
    usage,
    toolTraceId: readOptionalString(value, 'toolTraceId', 'Invocation result response'),
    toolInvocationCount: readOptionalNumber(
      value,
      'toolInvocationCount',
      'Invocation result response'
    ),
    toolAuditEvents: normalizeToolAuditEvents(value.toolAuditEvents, 'Invocation result response'),
    contractValidation,
    requestedAt: readOptionalString(value, 'requestedAt', 'Invocation result response'),
    completedAt: readOptionalString(value, 'completedAt', 'Invocation result response'),
  };
}

function summarizePredecessorContract(source: string, content: string): PredecessorContractSummary {
  const headings = (content.match(/^#{1,6}\s+.+$/gm) || [])
    .map((line) => line.replace(/^#{1,6}\s+/, '').trim())
    .filter((line) => line.length > 0)
    .slice(0, 12);

  const checklistItems = content.match(/^\s*-\s*\[(?: |x|X)\]\s+.+$/gm) || [];
  const checkedItems = content.match(/^\s*-\s*\[(?:x|X)\]\s+.+$/gm) || [];

  return {
    source,
    headingCount: headings.length,
    headings,
    hasHandoffChecklist: /(^|\n)\s*##\s+HANDOFF\s+CHECKLIST\b/im.test(content),
    checklist:
      checklistItems.length > 0
        ? {
            total: checklistItems.length,
            checked: checkedItems.length,
            completionRatio:
              checklistItems.length > 0
                ? Math.round((checkedItems.length / checklistItems.length) * 100) / 100
                : 0,
          }
        : null,
  };
}

function normalizeInvocationResult(result: unknown): NormalizedInvocationResult {
  if (!isRecord(result)) {
    throw new Error('Invocation result must be an object');
  }

  const outputPathRaw = result.outputPath;
  if (outputPathRaw !== undefined && typeof outputPathRaw !== 'string') {
    throw new Error('Invocation result outputPath must be a string');
  }

  return {
    outputPath: outputPathRaw,
    response: normalizeInvocationResponse(result.response),
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function assessConfidence(
  response:
    | {
        status?: string;
        finishReason?: string;
        attempts?: number;
        usage?: { totalTokens?: number };
        contractValidation?: { status?: string };
      }
    | undefined,
  attempt: number,
  success: boolean,
  error?: string
): ConfidenceAssessment {
  if (!success) {
    return {
      confidence: 0,
      uncertainty_reasons: [error || 'Agent invocation failed'],
      needs_human_review: true,
    };
  }

  const uncertaintyReasons: string[] = [];
  let score = 0.55;

  if (!response) {
    uncertaintyReasons.push('Runtime telemetry unavailable');
  } else {
    if (response.status === 'success') {
      score += 0.1;
    } else {
      uncertaintyReasons.push('Provider status missing or non-success');
    }

    if (response.contractValidation?.status === 'passed') {
      score += 0.2;
    } else {
      uncertaintyReasons.push('Contract validation status not confirmed');
    }

    if (response.finishReason === 'stop') {
      score += 0.1;
    } else if (response.finishReason) {
      uncertaintyReasons.push(`Non-standard finish reason: ${response.finishReason}`);
    }

    const retries = Math.max(0, (response.attempts ?? attempt) - 1);
    if (retries > 0) {
      score -= Math.min(0.25, retries * 0.08);
      uncertaintyReasons.push(`Model required ${retries} retr${retries === 1 ? 'y' : 'ies'}`);
    }

    if ((response.usage?.totalTokens ?? 0) === 0) {
      uncertaintyReasons.push('Token usage signal is empty');
    }
  }

  const confidence = Math.round(clamp01(score) * 100) / 100;
  const needs_human_review = confidence < 0.6 || uncertaintyReasons.length > 0;
  return {
    confidence,
    uncertainty_reasons: uncertaintyReasons,
    needs_human_review,
  };
}

// ─── Agent Registry ──────────────────────────────────────────
// Maps runtime state → list of agents to invoke (in order).
// The source of truth is platform/schema/agents.json.

const RUNTIME_TO_SCHEMA_PHASE = Object.freeze({
  [STATES.ONBOARDING]: 'ONBOARDING',
  [STATES.PHASE_1]: 'PHASE_1',
  [STATES.PHASE_2]: 'PHASE_2',
  [STATES.PHASE_3]: 'PHASE_3',
  [STATES.PHASE_4]: 'PHASE_4',
  [STATES.SYNTHESIS]: 'SYNTHESIS',
  [STATES.SPRINT_GATE]: 'SPRINT_GATE',
  [STATES.PHASE_5_EXECUTING]: 'PHASE_5_EXECUTING',
} as Record<string, string>);

const RUNTIME_STATES_WITH_AGENTS = Object.freeze([
  STATES.ONBOARDING,
  STATES.PHASE_1,
  STATES.CRITIC_1,
  STATES.PHASE_2,
  STATES.CRITIC_2,
  STATES.PHASE_3,
  STATES.CRITIC_3,
  STATES.PHASE_4,
  STATES.CRITIC_4,
  STATES.SYNTHESIS,
  STATES.SPRINT_GATE,
  STATES.PHASE_5_EXECUTING,
]);

function toAgentRef(row: CanonicalSchemaAgent): AgentRef {
  if (typeof row.id !== 'string' || typeof row.name !== 'string') {
    throw new Error('Invalid agents schema row: expected string id and name');
  }
  return { id: row.id, name: row.name };
}

function freezePhaseMap(phaseMap: Record<string, AgentRef[]>): Record<string, AgentRef[]> {
  for (const [state, agents] of Object.entries(phaseMap)) {
    const frozenAgents = Object.freeze(
      agents.map((a) => Object.freeze({ ...a }))
    ) as unknown as AgentRef[];
    phaseMap[state] = frozenAgents;
  }
  return Object.freeze(phaseMap);
}

function serializePhaseMap(phaseMap: Record<string, AgentRef[]>) {
  return RUNTIME_STATES_WITH_AGENTS.map((state) => ({
    state,
    agents: (phaseMap[state] || []).map((a) => ({ id: a.id, name: a.name })),
  }));
}

function compileAgentPhaseMap(schemaDoc: unknown = agentsSchema): Record<string, AgentRef[]> {
  const doc = schemaDoc as { agents?: unknown };
  if (!doc || !Array.isArray(doc.agents)) {
    throw new Error('Invalid agents schema: expected top-level agents array');
  }

  const schemaByPhase = new Map<string, AgentRef[]>();
  for (const rawAgent of doc.agents as CanonicalSchemaAgent[]) {
    if (!rawAgent || typeof rawAgent.phase !== 'string') {
      throw new Error('Invalid agents schema row: expected string phase');
    }
    const list = schemaByPhase.get(rawAgent.phase) || [];
    list.push(toAgentRef(rawAgent));
    schemaByPhase.set(rawAgent.phase, list);
  }

  const criticRiskAgents = schemaByPhase.get('CRITIC_RISK') || [];
  const runtimePhaseMap: Record<string, AgentRef[]> = {
    [STATES.CRITIC_1]: criticRiskAgents.map((a) => ({ ...a })),
    [STATES.CRITIC_2]: criticRiskAgents.map((a) => ({ ...a })),
    [STATES.CRITIC_3]: criticRiskAgents.map((a) => ({ ...a })),
    [STATES.CRITIC_4]: criticRiskAgents.map((a) => ({ ...a })),
  };

  for (const [runtimeState, schemaPhase] of Object.entries(RUNTIME_TO_SCHEMA_PHASE)) {
    runtimePhaseMap[runtimeState] = (schemaByPhase.get(schemaPhase) || []).map((a) => ({ ...a }));
  }

  return freezePhaseMap(runtimePhaseMap);
}

function assertRuntimeSchemaParity(
  runtimePhaseMap: Record<string, AgentRef[]>,
  schemaDoc: unknown = agentsSchema
): void {
  const compiled = compileAgentPhaseMap(schemaDoc);
  const runtimeSnapshot = JSON.stringify(serializePhaseMap(runtimePhaseMap));
  const compiledSnapshot = JSON.stringify(serializePhaseMap(compiled));

  if (runtimeSnapshot !== compiledSnapshot) {
    throw new Error('Runtime/schema parity violation for dispatcher phase-agent map');
  }
}

const PHASE_AGENTS = compileAgentPhaseMap();
assertRuntimeSchemaParity(PHASE_AGENTS);

// ─── Supported Platforms ─────────────────────────────────────
const PLATFORMS = Object.freeze({
  COPILOT: 'copilot',
  CLAUDE: 'claude',
  OPENAI: 'openai',
});

// ─── Parallel Execution Groups ───────────────────────────────
// Maps state → list of groups. Each group is an array of agent IDs
// that can execute concurrently. Groups run serially — outputs of
// one group feed into the next as predecessor paths.

const AGENT_GROUPS: Record<string, string[][]> = Object.freeze({
  [STATES.ONBOARDING]: [['25']],
  [STATES.PHASE_1]: [['01', '02', '03', '04', '34']],
  [STATES.CRITIC_1]: [['18', '19']],
  [STATES.PHASE_2]: [['05', '06', '07', '08', '09', '33']],
  [STATES.CRITIC_2]: [['18', '19']],
  [STATES.PHASE_3]: [['10', '11', '12', '13', '32', '35']],
  [STATES.CRITIC_3]: [['18', '19']],
  [STATES.PHASE_4]: [['14', '15', '16', '30', '31']],
  [STATES.CRITIC_4]: [['18', '19']],
  [STATES.SYNTHESIS]: [['17']],
  [STATES.SPRINT_GATE]: [['00']],
  // PHASE_5: implementation/test/review can run together; then the
  // reporting agents run after they have something to work from.
  [STATES.PHASE_5_EXECUTING]: [
    ['20', '21', '38'],
    ['22', '29', '26', '27', '28'],
  ],
} as Record<string, string[][]>);

const DEFAULT_PARALLEL_DISPATCH_STATES = new Set<string>([STATES.PHASE_1]);

// ─── Default Configuration ───────────────────────────────────
const DEFAULT_CONFIG = Object.freeze({
  platform: PLATFORMS.COPILOT,
  timeoutMs: 300000, // 5 minutes default
  maxRetries: 2,
  retryDelayMs: 5000,
  backoffBaseMs: 2000,
  backoffCapMs: 30000,
  skillsDir: 'templates/sdlc/agents',
  docsDir: 'docs',
  maxConcurrency: 3, // bounded parallelism ceiling per group
  enforcePredecessorContractContinuity: false,
});

// ─── Invocation Log Entry ────────────────────────────────────

/**
 * @typedef {object} InvocationLogEntry
 * @property {string} agentId
 * @property {string} agentName
 * @property {string} platform
 * @property {string} state
 * @property {string} startTime
 * @property {string} [endTime]
 * @property {number} [durationMs]
 * @property {'success'|'failure'|'timeout'|'retry'} status
 * @property {string} [error]
 * @property {number} attempt
 * @property {string} [outputPath]
 */

// ─── Dispatcher Class ────────────────────────────────────────

class Dispatcher {
  _store: DispatcherStore;
  _config: Record<string, unknown>;
  _phaseAgents: Record<string, AgentRef[]>;
  _invoker: (
    agent: AgentRef,
    platform: string,
    context: Record<string, unknown>
  ) => Promise<RuntimeAdapterResult>;
  _onLog: (...args: unknown[]) => void;
  _log: InvocationEntry[];
  _jobQueue: JobQueue | null;
  _adapter: AgentRuntimeAdapter | null;

  /**
   * @param {object} options
   * @param {object} options.store - File store abstraction (read/write/exists)
   * @param {object} [options.config] - Override default config
   * @param {Function} [options.invoker] - Platform invocation function (for testability)
   * @param {Function} [options.onLog] - Callback for invocation log entries
   */
  constructor(options: Record<string, unknown> = {}) {
    const {
      store,
      config = {},
      invoker,
      onLog,
      phaseAgents,
      jobQueue,
    } = options as {
      store?: DispatcherStore;
      config?: Record<string, unknown>;
      invoker?: (
        agent: AgentRef,
        platform: string,
        context: Record<string, unknown>
      ) => Promise<RuntimeAdapterResult>;
      onLog?: (...args: unknown[]) => void;
      phaseAgents?: Record<string, AgentRef[]>;
      jobQueue?: JobQueue;
    };

    if (!store) throw new Error('Dispatcher requires a store');

    const { adapter } = options as { adapter?: AgentRuntimeAdapter };
    this._store = store;
    this._config = { ...DEFAULT_CONFIG, ...(config as Record<string, unknown>) };
    this._phaseAgents = phaseAgents || PHASE_AGENTS;
    this._adapter = adapter ?? null;
    this._invoker = invoker || this._defaultInvoker.bind(this);
    this._onLog = onLog || (() => {});
    this._log = [];
    this._jobQueue = jobQueue || null;
  }

  /** @returns {InvocationLogEntry[]} Full invocation log */
  get log() {
    return [...this._log];
  }

  /**
   * Get the agents assigned to a given state.
   * @param {string} state
   * @returns {Array<{id: string, name: string}>}
   */
  getAgentsForState(state: string) {
    return this._phaseAgents[state] || [];
  }

  _shouldUseDefaultParallelDispatch(state: string): boolean {
    if (!DEFAULT_PARALLEL_DISPATCH_STATES.has(state)) {
      return false;
    }

    const groups = AGENT_GROUPS[state];
    const stateAgents = this.getAgentsForState(state);
    if (!groups || groups.length === 0 || stateAgents.length === 0) {
      return false;
    }

    const availableIds = new Set(stateAgents.map((agent) => agent.id));
    const groupedIds = new Set(groups.flat());
    if (groupedIds.size <= 1) {
      return false;
    }

    for (const agentId of groupedIds) {
      if (!availableIds.has(agentId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Build agent invocation context.
   * AC-3: Reads predecessor output files and injects as context.
   * AC-4: Loads questionnaire answers.
   *
   * @param {string} agentId
   * @param {object} options
   * @param {string[]} [options.predecessorPaths] - Paths to predecessor outputs
   * @param {string} [options.questionnairePath] - Path to questionnaire answers
   * @param {object} [options.ragContext] - Retrieved RAG context injected into runtime
   * @param {object} [options.sessionState] - Current session state
   * @returns {object} Assembled context object
   */
  buildContext(agentId: string, options: Record<string, unknown> = {}) {
    const {
      predecessorPaths = [],
      questionnairePath,
      ragContext,
      sessionState,
      workspaceId,
      gitService,
    } = options as {
      predecessorPaths?: string[];
      questionnairePath?: string;
      ragContext?: AgentExecutionContext['ragContext'];
      sessionState?: unknown;
      workspaceId?: string;
      gitService?: unknown;
    };
    const context: AgentExecutionContext = {
      agentId,
      skillFile: path.join(this._config.skillsDir as string, `${agentId}-*.md`),
      predecessorOutputs: {},
      predecessorContracts: [],
      questionnaireInput: null,
      ragContext: ragContext || null,
      sessionState: sessionState || null,
      workspaceId: workspaceId || null,
      gitService,
    };

    // AC-3: Load predecessor outputs
    for (const p of predecessorPaths as string[]) {
      if (this._store.exists(p)) {
        const output = this._store.read(p);
        context.predecessorOutputs[p] = output;
        context.predecessorContracts.push(summarizePredecessorContract(p, output));
      }
    }

    // AC-4: Load questionnaire answers
    if (questionnairePath && this._store.exists(questionnairePath as string)) {
      context.questionnaireInput = this._store.read(questionnairePath as string);
    }

    return context;
  }

  /**
   * Enqueue an agent invocation as a background job.
   * Returns the job ID — callers can poll queue.status(id) for result.
   * Only available when a jobQueue is configured.
   */
  async enqueueInvocation(
    agent: AgentRef,
    state: string,
    context: Record<string, unknown>,
    agentConfig: Record<string, unknown> = {}
  ): Promise<{ jobId: string }> {
    if (!this._jobQueue) {
      throw new Error('No job queue configured — use invoke() for direct execution');
    }

    const config = { ...this._config, ...agentConfig };
    const job = await this._jobQueue.enqueue({
      type: 'agent-invocation' as JobType,
      payload: {
        agentId: agent.id,
        agentName: agent.name,
        platform: (agentConfig.platform || config.platform) as string,
        state,
        context,
      },
      priority: (agentConfig.priority as number) || 5,
      retryCount: 0,
      maxRetries: (config.maxTransientRetries ?? config.maxRetries ?? 2) as number,
    });

    return { jobId: job.id };
  }

  /**
   * Invoke a single agent with retry and timeout handling.
   * AC-1, AC-2, AC-5, AC-6, AC-7, AC-8
   *
   * @param {object} agent - { id, name }
   * @param {string} state - Current state
   * @param {object} context - Built context from buildContext()
   * @param {object} [agentConfig] - Per-agent config overrides
   * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
   */
  async invoke(
    agent: AgentRef,
    state: string,
    context: Record<string, unknown>,
    agentConfig: Record<string, unknown> = {}
  ) {
    const config = { ...this._config, ...agentConfig };
    const platform = (agentConfig.platform || config.platform) as string;
    let lastError: { message: string } | null = null;

    // maxTransientRetries governs classified-TRANSIENT retries; fall back to legacy maxRetries
    const maxRetries = (config.maxTransientRetries ?? config.maxRetries ?? 3) as number;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      const entry: InvocationEntry = {
        agentId: agent.id,
        agentName: agent.name,
        platform,
        state,
        startTime: new Date().toISOString(),
        status: 'success',
        attempt,
      };

      try {
        const rawResult = await this._withTimeout(
          this._invoker(agent, platform, context),
          config.timeoutMs as number
        );
        const runtimeResult = normalizeInvocationResult(rawResult);
        const response = runtimeResult.response;

        entry.endTime = new Date().toISOString();
        entry.durationMs = +new Date(entry.endTime) - +new Date(entry.startTime);
        entry.outputPath = runtimeResult.outputPath as string;
        entry.status = 'success';
        if (response) {
          const requestedAtMs = response.requestedAt ? +new Date(response.requestedAt) : NaN;
          const completedAtMs = response.completedAt ? +new Date(response.completedAt) : NaN;
          entry.provider = response.provider;
          entry.model = response.model;
          entry.providerStatus = response.status;
          entry.finishReason = response.finishReason;
          entry.modelAttempts = response.attempts;
          entry.modelRetries = Math.max(0, (response.attempts || 1) - 1);
          entry.promptTokens = response.usage?.promptTokens;
          entry.completionTokens = response.usage?.completionTokens;
          entry.totalTokens = response.usage?.totalTokens;
          entry.toolTraceId = response.toolTraceId;
          entry.toolInvocationCount = response.toolInvocationCount;
          entry.toolAuditEvents = response.toolAuditEvents;
          entry.contractValidationPassed = response.contractValidation?.status === 'passed';
          entry.providerLatencyMs =
            Number.isFinite(requestedAtMs) && Number.isFinite(completedAtMs)
              ? Math.max(0, completedAtMs - requestedAtMs)
              : undefined;
        }

        const continuityWarnings = evaluatePredecessorContractContinuity(context);
        const enforceContinuity = shouldEnforcePredecessorContractContinuity(
          config,
          state,
          agent.id
        );
        const baseConfidence = assessConfidence(response, attempt, true);
        const confidence =
          continuityWarnings.length > 0
            ? {
                confidence: Math.max(0, Math.round((baseConfidence.confidence - 0.15) * 100) / 100),
                uncertainty_reasons: [...baseConfidence.uncertainty_reasons, ...continuityWarnings],
                needs_human_review: true,
              }
            : baseConfidence;

        if (enforceContinuity && continuityWarnings.length > 0) {
          const continuityError = continuityWarnings.join('; ');
          entry.status = 'failure';
          entry.error = continuityError;
          entry.errorSeverity = ErrorSeverity.RECOVERABLE;
          entry.confidence = confidence.confidence;
          entry.uncertainty_reasons = confidence.uncertainty_reasons;
          entry.needs_human_review = true;
          this._logEntry(entry);

          return {
            success: false,
            error: continuityError,
            severity: ErrorSeverity.RECOVERABLE,
            degraded: true,
            confidence: confidence.confidence,
            uncertainty_reasons: confidence.uncertainty_reasons,
            needs_human_review: true,
          };
        }

        entry.confidence = confidence.confidence;
        entry.uncertainty_reasons = confidence.uncertainty_reasons;
        entry.needs_human_review = confidence.needs_human_review;

        this._logEntry(entry);
        return {
          success: true,
          outputPath: runtimeResult.outputPath,
          response: runtimeResult.response,
          confidence: confidence.confidence,
          uncertainty_reasons: confidence.uncertainty_reasons,
          needs_human_review: confidence.needs_human_review,
        };
      } catch (err) {
        lastError = err as { message: string };
        const severity = Dispatcher.classifyError(err as { message: string });
        entry.endTime = new Date().toISOString();
        entry.durationMs = +new Date(entry.endTime) - +new Date(entry.startTime);
        entry.error = (err as { message: string }).message;
        entry.status =
          (err as { message: string }).message === 'TIMEOUT'
            ? 'timeout'
            : severity === ErrorSeverity.FATAL
              ? 'failure'
              : attempt <= maxRetries
                ? 'retry'
                : 'failure';
        entry.errorSeverity = severity;

        const confidence = assessConfidence(
          undefined,
          attempt,
          false,
          (err as { message: string }).message
        );
        entry.confidence = confidence.confidence;
        entry.uncertainty_reasons = confidence.uncertainty_reasons;
        entry.needs_human_review = confidence.needs_human_review;

        this._logEntry(entry);

        // FATAL → halt immediately, no retry
        if (severity === ErrorSeverity.FATAL) {
          return {
            success: false,
            error: lastError.message,
            severity: ErrorSeverity.FATAL,
            confidence: confidence.confidence,
            uncertainty_reasons: confidence.uncertainty_reasons,
            needs_human_review: confidence.needs_human_review,
          };
        }

        // TRANSIENT / RECOVERABLE → retry with backoff (if attempts remain)
        if (attempt <= maxRetries) {
          const base = (config.backoffBaseMs || DEFAULT_CONFIG.backoffBaseMs) as number;
          const cap = (config.backoffCapMs || DEFAULT_CONFIG.backoffCapMs) as number;
          const delay = Math.min(base * Math.pow(2, attempt - 1), cap);
          await this._delay(delay);
        }
      }
    }

    // All retries exhausted
    const finalSeverity = lastError ? Dispatcher.classifyError(lastError) : ErrorSeverity.FATAL;
    const confidence = assessConfidence(
      undefined,
      maxRetries + 1,
      false,
      lastError ? lastError.message : 'Unknown error'
    );
    return {
      success: false,
      error: lastError ? lastError.message : 'Unknown error',
      severity:
        finalSeverity === ErrorSeverity.RECOVERABLE
          ? ErrorSeverity.RECOVERABLE
          : ErrorSeverity.FATAL,
      degraded: finalSeverity === ErrorSeverity.RECOVERABLE ? true : undefined,
      confidence: confidence.confidence,
      uncertainty_reasons: confidence.uncertainty_reasons,
      needs_human_review: confidence.needs_human_review,
    };
  }

  async _dispatchStateSequential(
    state: string,
    contextOptions: Record<string, unknown> = {},
    agentConfigs: Record<string, Record<string, unknown>> = {},
    dispatchOptions: Record<string, unknown> = {}
  ) {
    const { onFailure = 'continue' } = dispatchOptions;
    const agents = this.getAgentsForState(state);
    const completed: string[] = [];
    const failed: string[] = [];
    const results: Array<Record<string, unknown>> = [];
    let escalated = false;

    for (const agent of agents) {
      const context = this.buildContext(agent.id, contextOptions);
      const agentConfig = agentConfigs[agent.id] || {};
      const result = await this.invoke(agent, state, context, agentConfig);

      results.push({ agent, ...result });

      if (result.success) {
        completed.push(agent.id);
        // Add output to contextOptions.predecessorPaths for next agent
        if (result.outputPath) {
          const paths = (contextOptions.predecessorPaths || []) as string[];
          paths.push(result.outputPath as string);
          contextOptions.predecessorPaths = paths;
        }
      } else {
        failed.push(agent.id);
        if (onFailure === 'abort') {
          break;
        }
        if (onFailure === 'escalate') {
          escalated = true;
          break;
        }
      }
    }

    return { completed, failed, results, escalated };
  }

  /**
   * Dispatch agents for a state.
   *
   * PHASE_1 defaults to bounded parallel dispatch because its agents are
   * independent in the merged milestone dependency model. States that still
   * rely on ordered predecessor chaining continue to use the sequential path.
   *
   * @param {string} state
   * @param {object} contextOptions - Options for buildContext
   * @param {object} [agentConfigs] - Map of agentId → config overrides
   * @param {object} [dispatchOptions] - { onFailure: 'continue'|'abort'|'escalate', forceSequential?: boolean }
   * @returns {Promise<{completed: string[], failed: string[], results: object[], escalated: boolean}>}
   */
  async dispatchState(
    state: string,
    contextOptions: Record<string, unknown> = {},
    agentConfigs: Record<string, Record<string, unknown>> = {},
    dispatchOptions: Record<string, unknown> = {}
  ) {
    if (dispatchOptions.forceSequential !== true && this._shouldUseDefaultParallelDispatch(state)) {
      return this.dispatchStateParallel(state, contextOptions, agentConfigs, dispatchOptions);
    }

    return this._dispatchStateSequential(state, contextOptions, agentConfigs, dispatchOptions);
  }

  // ─── Internal ────────────────────────────────────────────

  static _classifyError(err: { message: string }, attempt: number, maxRetries: number) {
    if (err.message === 'TIMEOUT') return 'timeout';
    return attempt <= maxRetries ? 'retry' : 'failure';
  }

  /**
   * Classify an error into TRANSIENT, RECOVERABLE, or FATAL severity.
   */
  static classifyError(err: { message: string }): ErrorSeverity {
    const msg = err.message || '';
    if (FATAL_PATTERNS.some((p) => p.test(msg))) return ErrorSeverity.FATAL;
    if (TRANSIENT_PATTERNS.some((p) => p.test(msg))) return ErrorSeverity.TRANSIENT;
    return ErrorSeverity.RECOVERABLE;
  }

  /** @private — Default invoker (no-op for testing) */
  async _defaultInvoker(_agent: AgentRef, _platform: string, _context: Record<string, unknown>) {
    if (this._adapter) {
      return this._adapter.invoke(_agent, _platform, _context);
    }
    throw new Error(
      'No runtime adapter configured. Set AGENT_RUNTIME_ADAPTER or pass an adapter to Dispatcher.'
    );
  }

  /** @private — Promise with timeout */
  _withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    if (ms <= 0) return promise;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
      promise
        .then((val) => {
          clearTimeout(timer);
          resolve(val);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /** @private */
  _delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** @private */
  _logEntry(entry: InvocationEntry) {
    this._log.push(entry);
    this._onLog(entry);
  }

  // ─── Bounded Parallelism ─────────────────────────────────────

  /**
   * Run a list of agents as a bounded-parallel group.
   *
   * Agents within the group execute concurrently up to `maxConcurrency`.
   * A semaphore gates admission so that at most `maxConcurrency` invocations
   * run at any one time. All agents share the same `contextOptions` (predecessor
   * paths from previous groups are already included by the caller).
   *
   * @returns {Promise<{results, concurrency, waitMs}>}
   *   results              — per-agent invocation results (in submission order)
   *   concurrency          — high-water mark of simultaneously active agents
   *   waitMs               — total accumulated queue-wait time across all agents
   * @private
   */
  async _runBoundedGroup(
    groupIds: string[],
    state: string,
    contextOptions: Record<string, unknown>,
    agentConfigs: Record<string, Record<string, unknown>>,
    maxConcurrency: number
  ): Promise<{
    results: Array<Record<string, unknown>>;
    concurrency: number;
    waitMs: number;
  }> {
    const phaseAgents = this._phaseAgents[state] || [];
    const agentMap = new Map<string, AgentRef>(phaseAgents.map((a) => [a.id, a]));

    let activeCount = 0;
    let highWaterMark = 0;
    let totalWaitMs = 0;
    const semaphoreQueue: Array<() => void> = [];

    const acquire = async (): Promise<void> => {
      if (activeCount < maxConcurrency) {
        activeCount++;
        highWaterMark = Math.max(highWaterMark, activeCount);
        return;
      }
      const waitStart = Date.now();
      await new Promise<void>((resolve) => semaphoreQueue.push(resolve));
      totalWaitMs += Date.now() - waitStart;
      activeCount++;
      highWaterMark = Math.max(highWaterMark, activeCount);
    };

    const release = (): void => {
      activeCount--;
      const next = semaphoreQueue.shift();
      if (next) next();
    };

    const tasks = groupIds.map(async (agentId) => {
      const agent = agentMap.get(agentId);
      if (!agent) {
        return {
          agent: { id: agentId, name: agentId },
          success: false,
          error: `Agent '${agentId}' not found in registry for state '${state}'`,
        };
      }

      await acquire();
      try {
        const context = this.buildContext(agentId, contextOptions);
        const agentConfig = agentConfigs[agentId] || {};
        const result = await this.invoke(agent, state, context, agentConfig);
        return { agent, ...result };
      } finally {
        release();
      }
    });

    const settled = await Promise.allSettled(tasks);
    const results: Array<Record<string, unknown>> = [];
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value as Record<string, unknown>);
      } else {
        results.push({
          agent: { id: 'unknown', name: 'unknown' },
          success: false,
          error: String(outcome.reason),
        });
      }
    }

    return { results, concurrency: highWaterMark, waitMs: totalWaitMs };
  }

  /**
   * Dispatch agents for a state using bounded parallel execution groups.
   *
   * Groups defined in AGENT_GROUPS run serially — the predecessor paths
   * collected from one group are passed to the next. Within each group,
   * agents run concurrently up to `maxConcurrency` (default from config).
   * States without a group config fall back to sequential `dispatchState()`.
   *
   * Returned result includes observability fields:
   *   concurrencyHighWaterMark — peak simultaneous agent executions
   *   totalWaitMs              — sum of time agents spent waiting to acquire a slot
   *
   * @param {string} state
   * @param {object} contextOptions - Options for buildContext
   * @param {object} [agentConfigs] - Per-agent config overrides
   * @param {object} [dispatchOptions] - { onFailure, maxConcurrency }
   */
  async dispatchStateParallel(
    state: string,
    contextOptions: Record<string, unknown> = {},
    agentConfigs: Record<string, Record<string, unknown>> = {},
    dispatchOptions: Record<string, unknown> = {}
  ): Promise<{
    completed: string[];
    failed: string[];
    results: Array<Record<string, unknown>>;
    escalated: boolean;
    concurrencyHighWaterMark: number;
    totalWaitMs: number;
  }> {
    const groups = AGENT_GROUPS[state];
    if (!groups) {
      const r = await this._dispatchStateSequential(
        state,
        contextOptions,
        agentConfigs,
        dispatchOptions
      );
      return { ...r, concurrencyHighWaterMark: 1, totalWaitMs: 0 };
    }

    const { onFailure = 'continue', maxConcurrency: overrideConcurrency } = dispatchOptions as {
      onFailure?: string;
      maxConcurrency?: number;
    };
    const maxConcurrency: number =
      overrideConcurrency ?? (this._config.maxConcurrency as number) ?? 3;

    const completed: string[] = [];
    const failed: string[] = [];
    const results: Array<Record<string, unknown>> = [];
    let escalated = false;
    let concurrencyHighWaterMark = 0;
    let totalWaitMs = 0;

    let predecessorPaths: string[] = [...((contextOptions.predecessorPaths as string[]) || [])];

    for (const group of groups) {
      if (escalated) break;

      const groupContext: Record<string, unknown> = {
        ...contextOptions,
        predecessorPaths: [...predecessorPaths],
      };

      const groupResult = await this._runBoundedGroup(
        group,
        state,
        groupContext,
        agentConfigs,
        maxConcurrency
      );

      concurrencyHighWaterMark = Math.max(concurrencyHighWaterMark, groupResult.concurrency);
      totalWaitMs += groupResult.waitMs;

      let aborted = false;
      for (const r of groupResult.results) {
        results.push(r);
        const agentId = (r.agent as AgentRef).id;
        if ((r as { success: boolean }).success) {
          completed.push(agentId);
          if (r.outputPath) {
            predecessorPaths.push(r.outputPath as string);
          }
        } else {
          failed.push(agentId);
          if (onFailure === 'abort') {
            aborted = true;
            break;
          }
          if (onFailure === 'escalate') {
            escalated = true;
            aborted = true;
            break;
          }
        }
      }
      if (aborted) break;
    }

    return { completed, failed, results, escalated, concurrencyHighWaterMark, totalWaitMs };
  }
}

export {
  compileAgentPhaseMap,
  assertRuntimeSchemaParity,
  PHASE_AGENTS,
  AGENT_GROUPS,
  PLATFORMS,
  DEFAULT_CONFIG,
  Dispatcher,
  ErrorSeverity,
  TRANSIENT_PATTERNS,
  FATAL_PATTERNS,
};
export type { AgentRuntimeAdapter };
