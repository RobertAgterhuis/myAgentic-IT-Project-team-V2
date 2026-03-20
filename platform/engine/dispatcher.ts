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
import type { AgentRuntimeAdapter } from './agent-runtime-adapter';

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
  confidence?: number;
  uncertainty_reasons?: string[];
  needs_human_review?: boolean;
}

interface ConfidenceAssessment {
  confidence: number;
  uncertainty_reasons: string[];
  needs_human_review: boolean;
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
// Maps state → list of agents to invoke (in order)

const PHASE_AGENTS = Object.freeze({
  [STATES.ONBOARDING]: [{ id: '25', name: 'Onboarding Agent' }],
  [STATES.PHASE_1]: [
    { id: '01', name: 'Business Analyst' },
    { id: '02', name: 'Domain Expert' },
    { id: '03', name: 'Sales Strategist' },
    { id: '04', name: 'Financial Analyst' },
    { id: '34', name: 'Product Manager' },
  ],
  [STATES.CRITIC_1]: [
    { id: '18', name: 'Critic Agent' },
    { id: '19', name: 'Risk Agent' },
  ],
  [STATES.PHASE_2]: [
    { id: '05', name: 'Software Architect' },
    { id: '06', name: 'Senior Developer' },
    { id: '07', name: 'DevOps Engineer' },
    { id: '08', name: 'Security Architect' },
    { id: '09', name: 'Data Architect' },
    { id: '33', name: 'Legal Counsel' },
  ],
  [STATES.CRITIC_2]: [
    { id: '18', name: 'Critic Agent' },
    { id: '19', name: 'Risk Agent' },
  ],
  [STATES.PHASE_3]: [
    { id: '10', name: 'UX Researcher' },
    { id: '11', name: 'UX Designer' },
    { id: '12', name: 'UI Designer' },
    { id: '13', name: 'Accessibility Specialist' },
    { id: '32', name: 'Content Strategist' },
    { id: '35', name: 'Localization Specialist' },
  ],
  [STATES.CRITIC_3]: [
    { id: '18', name: 'Critic Agent' },
    { id: '19', name: 'Risk Agent' },
  ],
  [STATES.PHASE_4]: [
    { id: '14', name: 'Brand Strategist' },
    { id: '15', name: 'Growth Marketer' },
    { id: '16', name: 'CRO Specialist' },
    { id: '30', name: 'Brand & Assets Agent' },
    { id: '31', name: 'Storybook Agent' },
  ],
  [STATES.CRITIC_4]: [
    { id: '18', name: 'Critic Agent' },
    { id: '19', name: 'Risk Agent' },
  ],
  [STATES.SYNTHESIS]: [{ id: '17', name: 'Synthesis Agent' }],
  [STATES.SPRINT_GATE]: [{ id: '00', name: 'Orchestrator (Sprint Gate)' }],
  [STATES.PHASE_5_EXECUTING]: [
    { id: '20', name: 'Implementation Agent' },
    { id: '21', name: 'Test Agent' },
    { id: '38', name: 'Architecture Compliance Reviewer' },
    { id: '22', name: 'PR/Review Agent' },
    { id: '29', name: 'KPI Agent' },
    { id: '26', name: 'Documentation Agent' },
    { id: '27', name: 'GitHub Integration Agent' },
    { id: '28', name: 'Retrospective Agent' },
  ],
});

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
  ) => Promise<unknown>;
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
      ) => Promise<unknown>;
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

  /**
   * Build agent invocation context.
   * AC-3: Reads predecessor output files and injects as context.
   * AC-4: Loads questionnaire answers.
   *
   * @param {string} agentId
   * @param {object} options
   * @param {string[]} [options.predecessorPaths] - Paths to predecessor outputs
   * @param {string} [options.questionnairePath] - Path to questionnaire answers
   * @param {object} [options.sessionState] - Current session state
   * @returns {object} Assembled context object
   */
  buildContext(agentId: string, options: Record<string, unknown> = {}) {
    const {
      predecessorPaths = [],
      questionnairePath,
      sessionState,
    } = options as {
      predecessorPaths?: string[];
      questionnairePath?: string;
      sessionState?: unknown;
    };
    const context: {
      agentId: string;
      skillFile: string;
      predecessorOutputs: Record<string, string>;
      questionnaireInput: string | null;
      sessionState: unknown;
    } = {
      agentId,
      skillFile: path.join(this._config.skillsDir as string, `${agentId}-*.md`),
      predecessorOutputs: {},
      questionnaireInput: null,
      sessionState: sessionState || null,
    };

    // AC-3: Load predecessor outputs
    for (const p of predecessorPaths as string[]) {
      if (this._store.exists(p)) {
        context.predecessorOutputs[p] = this._store.read(p);
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
        const result = await this._withTimeout(
          this._invoker(agent, platform, context) as Promise<unknown>,
          config.timeoutMs as number
        );
        const runtimeResult = result as {
          outputPath?: string;
          response?: {
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
            contractValidation?: { status?: string };
            requestedAt?: string;
            completedAt?: string;
          };
        };
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
          entry.contractValidationPassed = response.contractValidation?.status === 'passed';
          entry.providerLatencyMs =
            Number.isFinite(requestedAtMs) && Number.isFinite(completedAtMs)
              ? Math.max(0, completedAtMs - requestedAtMs)
              : undefined;
        }

        const confidence = assessConfidence(response, attempt, true);
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

  /**
   * Dispatch all agents for a given state sequentially.
   * @param {string} state
   * @param {object} contextOptions - Options for buildContext
   * @param {object} [agentConfigs] - Map of agentId → config overrides
   * @param {object} [dispatchOptions] - { onFailure: 'continue'|'abort'|'escalate' }
   * @returns {Promise<{completed: string[], failed: string[], results: object[], escalated: boolean}>}
   */
  async dispatchState(
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
  _withTimeout(promise: Promise<unknown>, ms: number) {
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
      const r = await this.dispatchState(state, contextOptions, agentConfigs, dispatchOptions);
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
