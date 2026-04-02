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

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { STATES } from './state-machine';
import type { JobQueue, JobType } from './jobs/job-types';
import type { AgentRuntimeAdapter, RuntimeAdapterResult } from './agent-runtime-adapter';
import { evaluateAgentBudget } from './context-budgeter';
import {
  assertRuntimeSchemaParity,
  compileAgentPhaseMap,
  PHASE_AGENTS,
  type AgentRef,
} from './agent-phase-map';
import { loadFlows } from './flow-loader';
import type { RuntimePackGraph } from './runtime-pack';
import { createSelfRevisionService, type SelfRevisionEvent } from './self-revision';
import type { VerifierFinding } from './verifier-pass';

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
  readFile?(path: string, encoding?: string): string;
  writeFile?(path: string, data: string, encoding?: string): void;
  mkdirp?(path: string): void;
}

interface AgentPrioritySignal {
  impactScore?: number;
  urgencyScore?: number;
  riskScore?: number;
  costScore?: number;
}

interface PredecessorContractSummary {
  source: string;
  headingCount: number;
  headings: string[];
  keySections: string[];
  evidenceRefs: string[];
  hasHandoffChecklist: boolean;
  checklist: {
    total: number;
    checked: number;
    completionRatio: number;
  } | null;
  provenance: {
    sourcePath: string;
    contentSha256: string;
    extractedAt: string;
  };
}

interface RuntimePackManifestSummary {
  manifest_version: string;
  pack_id: string;
  pack_name: string;
  version: string;
}

interface RevisionRuntimeContext {
  eventId: string;
  attempt: number;
  maxAttempts: number;
  trigger: 'verifier-findings' | 'quality-below-threshold' | 'manual';
  instructions: Array<{ heading: string; directive: string }>;
  findingsAddressed: string[];
  estimatedImpact: 'high' | 'medium' | 'low';
  priorFailure?: string;
  previousOutputPath?: string;
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
  runtimePackManifest: RuntimePackManifestSummary | null;
  revisionContext?: RevisionRuntimeContext | null;
  gitService?: unknown;
  executionPolicy?: 'standard' | 'fast-path';
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
  revisionEventId?: string;
  revisionAttempt?: number;
  revisionStatus?: string;
  stopReason?: string;
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

function computePriorityScore(signal?: AgentPrioritySignal): number {
  if (!signal) return 0.5;
  const impact = clamp01(signal.impactScore ?? 0.5);
  const urgency = clamp01(signal.urgencyScore ?? 0.5);
  const risk = clamp01(signal.riskScore ?? 0.5);
  const cost = clamp01(signal.costScore ?? 0.5);
  return (
    Math.round(clamp01(impact * 0.4 + urgency * 0.35 + risk * 0.2 - cost * 0.15) * 1000) / 1000
  );
}

function orderByRuntimePriority(
  agentIds: string[],
  signals: Record<string, AgentPrioritySignal> = {}
): string[] {
  return [...agentIds].sort((left, right) => {
    const delta = computePriorityScore(signals[right]) - computePriorityScore(signals[left]);
    if (delta !== 0) return delta;
    return left.localeCompare(right);
  });
}

function resolveCapabilityAssignment(
  requestedAgentId: string,
  phaseAgents: AgentRef[],
  capabilityRequirements: Record<string, string> = {},
  capabilityMap: Record<string, string[]> = {},
  availability: Record<string, boolean> = {}
): AgentRef | undefined {
  const requestedAgent = phaseAgents.find((agent) => agent.id === requestedAgentId);
  const requestedAvailable = availability[requestedAgentId] !== false;
  const requiredCapability = capabilityRequirements[requestedAgentId];

  if (requestedAgent && requestedAvailable) {
    return requestedAgent;
  }

  if (!requiredCapability) {
    return requestedAgent;
  }

  return phaseAgents
    .filter((agent) => availability[agent.id] !== false)
    .find((agent) => (capabilityMap[agent.id] || []).includes(requiredCapability));
}

interface InvocationResponseContract {
  provider?: string;
  model?: string;
  status?: string;
  finishReason?: string;
  attempts?: number;
  deliverableQuality?: {
    score?: number;
    approvalSignal?: string;
    summary?: string;
  };
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

interface RevisionTriggerDecision {
  trigger: 'verifier-findings' | 'quality-below-threshold';
  qualityScore?: number;
  qualityThreshold?: number;
  verifierFindings?: VerifierFinding[];
  summary: string;
}

const REVISION_ELIGIBLE_ERROR_PATTERN =
  /contract validation|validation finding|required markers|required sections|checklist|quality/i;

function normalizePercentValue(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return value <= 1 ? value * 100 : value;
}

function buildRevisionFindingFromError(message: string): VerifierFinding[] {
  return [
    {
      ruleId: 'RV-VALIDATION',
      severity: 'high',
      description: message,
      suggestedFix:
        'Address the failed contract, checklist, or evidence requirement before reinvocation.',
    },
  ];
}

function deriveRevisionDecisionFromResponse(
  response: InvocationResponseContract | undefined,
  qualityThreshold: number
): RevisionTriggerDecision | null {
  if (!response) {
    return null;
  }

  const qualityScore = normalizePercentValue(response?.deliverableQuality?.score, 100);
  const approvalSignal = response?.deliverableQuality?.approvalSignal;
  const hasContractValidation = response.contractValidation !== undefined;
  const contractPassed = response.contractValidation?.status === 'passed';
  const contractFailed = response.contractValidation?.status === 'failed';
  const hasQualitySignal = response.deliverableQuality !== undefined;

  if (!hasContractValidation && !hasQualitySignal) {
    return null;
  }

  if (
    (!hasContractValidation || contractPassed) &&
    (!hasQualitySignal || (approvalSignal === 'approve' && qualityScore >= qualityThreshold))
  ) {
    return null;
  }

  if (hasContractValidation && contractFailed) {
    return {
      trigger: 'verifier-findings',
      qualityScore,
      qualityThreshold,
      verifierFindings: buildRevisionFindingFromError(
        'Contract validation did not pass for the invocation output.'
      ),
      summary: 'Contract validation failed and requires a bounded self-revision pass.',
    };
  }

  if (hasQualitySignal && (approvalSignal !== 'approve' || qualityScore < qualityThreshold)) {
    return {
      trigger: 'quality-below-threshold',
      qualityScore,
      qualityThreshold,
      summary: `Deliverable quality remained below threshold (${qualityScore.toFixed(0)}% < ${qualityThreshold.toFixed(0)}%).`,
    };
  }

  return null;
}

function deriveRevisionDecisionFromError(
  message: string,
  severity: ErrorSeverity,
  qualityThreshold: number
): RevisionTriggerDecision | null {
  if (severity !== ErrorSeverity.RECOVERABLE || !REVISION_ELIGIBLE_ERROR_PATTERN.test(message)) {
    return null;
  }

  return {
    trigger: 'verifier-findings',
    qualityThreshold,
    verifierFindings: buildRevisionFindingFromError(message),
    summary: `Recoverable validation failure detected: ${message}`,
  };
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

  const deliverableQualityRaw = value.deliverableQuality;
  let deliverableQuality: InvocationResponseContract['deliverableQuality'];
  if (deliverableQualityRaw !== undefined) {
    if (!isRecord(deliverableQualityRaw)) {
      throw new Error('Invocation result response.deliverableQuality must be an object');
    }
    deliverableQuality = {
      score: readOptionalNumber(
        deliverableQualityRaw,
        'score',
        'Invocation result response.deliverableQuality'
      ),
      approvalSignal: readOptionalString(
        deliverableQualityRaw,
        'approvalSignal',
        'Invocation result response.deliverableQuality'
      ),
      summary: readOptionalString(
        deliverableQualityRaw,
        'summary',
        'Invocation result response.deliverableQuality'
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
    deliverableQuality,
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
  const evidenceRefs = Array.from(
    new Set([
      ...(content.match(/questionnaire:\[[^\]]+\]/gi) || []).map((ref) => ref.toLowerCase()),
      ...(
        content.match(
          /(?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_.-]+\.(?:md|ts|tsx|js|json|mjs|yml|yaml|ps1)/g
        ) || []
      ).map((ref) => ref.toLowerCase()),
    ])
  ).slice(0, 25);

  return {
    source,
    headingCount: headings.length,
    headings,
    keySections: headings.slice(0, 8),
    evidenceRefs,
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
    provenance: {
      sourcePath: source,
      contentSha256: createHash('sha256').update(content).digest('hex'),
      extractedAt: new Date().toISOString(),
    },
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
  error?: string,
  threshold: number = 0.6
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
  const needs_human_review = confidence < threshold || uncertaintyReasons.length > 0;
  return {
    confidence,
    uncertainty_reasons: uncertaintyReasons,
    needs_human_review,
  };
}

function createFallbackParallelGroups(phaseAgents: Record<string, AgentRef[]>) {
  return Object.fromEntries(
    Object.entries(phaseAgents)
      .filter(([, agents]) => agents.length > 0)
      .map(([state, agents]) => [state, [agents.map((agent) => agent.id)]])
  );
}

function loadDefaultRuntimeGraph(): RuntimePackGraph | null {
  const flowsPath = path.join(__dirname, 'flows.yaml');
  const store = {
    exists(filePath: string) {
      return fs.existsSync(filePath);
    },
    readFile(filePath: string) {
      return fs.readFileSync(filePath, 'utf8');
    },
  };

  try {
    const flows = loadFlows(store, flowsPath) as { runtimeGraph?: RuntimePackGraph };
    return flows.runtimeGraph || null;
  } catch {
    return null;
  }
}

const DEFAULT_RUNTIME_GRAPH = loadDefaultRuntimeGraph();

// ─── Supported Platforms ─────────────────────────────────────
const PLATFORMS = Object.freeze({
  COPILOT: 'copilot',
  CLAUDE: 'claude',
  OPENAI: 'openai',
});

const DEFAULT_PARALLEL_DISPATCH_STATES = new Set<string>(
  DEFAULT_RUNTIME_GRAPH?.defaultParallelDispatchStates || [STATES.PHASE_1]
);

// ─── Default Configuration ───────────────────────────────────
const DEFAULT_CONFIG = Object.freeze({
  platform: PLATFORMS.COPILOT,
  timeoutMs: 300000, // 5 minutes default
  maxRetries: 2,
  retryDelayMs: 5000,
  backoffBaseMs: 2000,
  backoffCapMs: 30000,
  maxRevisionAttempts: 1,
  revisionBackoffBaseMs: 1000,
  revisionBackoffCapMs: 10000,
  revisionQualityThreshold: 75,
  skillsDir: null,
  docsDir: 'docs',
  maxConcurrency: 3, // bounded parallelism ceiling per group
  enforcePredecessorContractContinuity: false,
  /**
   * Per-phase human-review confidence thresholds (#1062).
   * Keys are SDLC state names (e.g. "PHASE_1", "PHASE_2") or "default".
   * An agent whose assessed confidence falls below its phase threshold
   * is flagged needs_human_review=true.
   */
  humanReviewThresholds: { default: 0.6 } as Record<string, number>,
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
  _parallelGroups: Record<string, string[][]>;
  _runtimeGraph: RuntimePackGraph | null;
  _defaultParallelDispatchStates: Set<string>;

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
      parallelGroups,
      runtimeGraph,
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
      parallelGroups?: Record<string, string[][]>;
      runtimeGraph?: RuntimePackGraph;
      jobQueue?: JobQueue;
    };

    if (!store) throw new Error('Dispatcher requires a store');

    const { adapter } = options as { adapter?: AgentRuntimeAdapter };
    this._store = store;
    this._config = { ...DEFAULT_CONFIG, ...(config as Record<string, unknown>) };
    this._runtimeGraph = runtimeGraph || DEFAULT_RUNTIME_GRAPH;
    this._phaseAgents = phaseAgents || this._runtimeGraph?.phaseAgents || PHASE_AGENTS;
    this._parallelGroups =
      parallelGroups ||
      this._runtimeGraph?.parallelGroups ||
      createFallbackParallelGroups(this._phaseAgents);
    this._defaultParallelDispatchStates = new Set(
      this._runtimeGraph?.defaultParallelDispatchStates || DEFAULT_PARALLEL_DISPATCH_STATES
    );
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
    if (!this._defaultParallelDispatchStates.has(state)) {
      return false;
    }

    const groups = this._parallelGroups[state];
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
      runtimePackManifest,
      gitService,
      executionPolicy,
    } = options as {
      predecessorPaths?: string[];
      questionnairePath?: string;
      ragContext?: AgentExecutionContext['ragContext'];
      sessionState?: unknown;
      workspaceId?: string;
      runtimePackManifest?: AgentExecutionContext['runtimePackManifest'];
      gitService?: unknown;
      executionPolicy?: AgentExecutionContext['executionPolicy'];
    };
    const context: AgentExecutionContext = {
      agentId,
      skillFile:
        this._runtimeGraph?.skillFileGlobs[agentId] ||
        (typeof this._config.skillsDir === 'string' && this._config.skillsDir.trim() !== ''
          ? path.join(this._config.skillsDir as string, `${agentId}-*.md`)
          : `${agentId}-*.md`),
      predecessorOutputs: {},
      predecessorContracts: [],
      questionnaireInput: null,
      ragContext: ragContext || null,
      sessionState: sessionState || null,
      workspaceId: workspaceId || null,
      runtimePackManifest: runtimePackManifest || null,
      gitService,
      executionPolicy: executionPolicy || 'standard',
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
    let lastRevisionEventId: string | undefined;
    let revisionAttempts = 0;
    let transientRetries = 0;
    let currentContext = { ...context };

    // Per-phase human-review threshold (#1062): look up by state, fall back to "default" or 0.6
    const thresholdMap = (config.humanReviewThresholds ??
      DEFAULT_CONFIG.humanReviewThresholds) as Record<string, number>;
    const confidenceThreshold = thresholdMap[state] ?? thresholdMap['default'] ?? 0.6;

    // maxTransientRetries governs classified-TRANSIENT retries; fall back to legacy maxRetries
    const maxRetries = (config.maxTransientRetries ?? config.maxRetries ?? 3) as number;
    const maxRevisionAttempts = (config.maxRevisionAttempts ?? 1) as number;
    const maxTotalAttempts = maxRetries + maxRevisionAttempts + 1;
    const revisionQualityThreshold = normalizePercentValue(
      config.revisionQualityThreshold as number | undefined,
      DEFAULT_CONFIG.revisionQualityThreshold as number
    );
    const revisionService = this._createSelfRevisionService();
    const abortSignal =
      (agentConfig.abortSignal as AbortSignal | undefined) ||
      ((context as { abortSignal?: AbortSignal }).abortSignal as AbortSignal | undefined);

    for (let attempt = 1; attempt <= maxTotalAttempts; attempt++) {
      const entry: InvocationEntry = {
        agentId: agent.id,
        agentName: agent.name,
        platform,
        state,
        startTime: new Date().toISOString(),
        status: 'success',
        attempt,
        revisionAttempt: revisionAttempts,
        revisionEventId: lastRevisionEventId,
      };

      try {
        const rawResult = await this._withTimeout(
          this._invoker(agent, platform, currentContext),
          config.timeoutMs as number,
          abortSignal
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

        const revisionDecision = deriveRevisionDecisionFromResponse(
          response,
          revisionQualityThreshold
        );
        if (revisionDecision) {
          if (revisionAttempts < maxRevisionAttempts) {
            revisionAttempts += 1;
            const revisionEvent = await revisionService.evaluateRevisionNeed({
              agentId: agent.id,
              deliverableSource: runtimeResult.outputPath || `${state}/${agent.id}`,
              originalContent: runtimeResult.outputPath || revisionDecision.summary,
              trigger: revisionDecision.trigger,
              verifierFindings: revisionDecision.verifierFindings,
              qualityScore: revisionDecision.qualityScore,
              qualityThreshold: revisionDecision.qualityThreshold,
            });

            if (revisionEvent) {
              lastRevisionEventId = revisionEvent.id;
              await revisionService.markApplied(
                revisionEvent.id,
                `Dispatcher scheduled reinvocation after attempt ${attempt}.`
              );
              entry.endTime = new Date().toISOString();
              entry.durationMs = +new Date(entry.endTime) - +new Date(entry.startTime);
              entry.status = 'retry';
              entry.error = revisionDecision.summary;
              entry.errorSeverity = ErrorSeverity.RECOVERABLE;
              entry.revisionEventId = revisionEvent.id;
              entry.revisionAttempt = revisionAttempts;
              entry.revisionStatus = 'applied';
              entry.stopReason = 'self-revision-requested';
              const confidence = assessConfidence(
                response,
                attempt,
                true,
                revisionDecision.summary,
                confidenceThreshold
              );
              entry.confidence = confidence.confidence;
              entry.uncertainty_reasons = [
                ...confidence.uncertainty_reasons,
                revisionDecision.summary,
              ];
              entry.needs_human_review = true;
              this._logEntry(entry);
              currentContext = this._buildRevisionContext(
                currentContext,
                revisionEvent,
                revisionAttempts,
                maxRevisionAttempts,
                revisionDecision.summary,
                runtimeResult.outputPath
              );
              await this._delayWithCap(
                config.revisionBackoffBaseMs as number,
                config.revisionBackoffCapMs as number,
                revisionAttempts
              );
              continue;
            }
          }

          if (lastRevisionEventId) {
            await revisionService.markEscalated(
              lastRevisionEventId,
              revisionDecision.summary,
              'max-revision-attempts'
            );
          }

          entry.status = 'failure';
          entry.error = revisionDecision.summary;
          entry.errorSeverity = ErrorSeverity.RECOVERABLE;
          entry.revisionEventId = lastRevisionEventId;
          entry.revisionAttempt = revisionAttempts;
          entry.revisionStatus = lastRevisionEventId ? 'escalated' : undefined;
          entry.stopReason = 'max-revision-attempts';
          const confidence = assessConfidence(
            response,
            attempt,
            false,
            revisionDecision.summary,
            confidenceThreshold
          );
          entry.confidence = confidence.confidence;
          entry.uncertainty_reasons = confidence.uncertainty_reasons;
          entry.needs_human_review = true;
          this._logEntry(entry);
          return {
            success: false,
            error: revisionDecision.summary,
            severity: ErrorSeverity.RECOVERABLE,
            degraded: true,
            stopReason: 'max-revision-attempts',
            revisionEventId: lastRevisionEventId,
            confidence: confidence.confidence,
            uncertainty_reasons: confidence.uncertainty_reasons,
            needs_human_review: true,
          };
        }

        const continuityWarnings = evaluatePredecessorContractContinuity(currentContext);
        const enforceContinuity = shouldEnforcePredecessorContractContinuity(
          config,
          state,
          agent.id
        );
        const baseConfidence = assessConfidence(
          response,
          attempt,
          true,
          undefined,
          confidenceThreshold
        );
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

        if (lastRevisionEventId) {
          await revisionService.markSucceeded(
            lastRevisionEventId,
            `Revision succeeded on attempt ${attempt}.`
          );
          entry.revisionEventId = lastRevisionEventId;
          entry.revisionAttempt = revisionAttempts;
          entry.revisionStatus = 'succeeded';
          entry.stopReason = 'quality-approved';
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
        if ((err as { message?: string }).message === 'ABORTED') {
          throw err;
        }
        lastError = err as { message: string };
        const severity = Dispatcher.classifyError(err as { message: string });
        const revisionDecision = deriveRevisionDecisionFromError(
          (err as { message: string }).message,
          severity,
          revisionQualityThreshold
        );
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
          (err as { message: string }).message,
          confidenceThreshold
        );
        entry.confidence = confidence.confidence;
        entry.uncertainty_reasons = confidence.uncertainty_reasons;
        entry.needs_human_review = confidence.needs_human_review;

        if (revisionDecision && revisionAttempts < maxRevisionAttempts) {
          revisionAttempts += 1;
          const revisionEvent = await revisionService.evaluateRevisionNeed({
            agentId: agent.id,
            deliverableSource: `${state}/${agent.id}`,
            originalContent: '',
            trigger: revisionDecision.trigger,
            verifierFindings: revisionDecision.verifierFindings,
            qualityScore: revisionDecision.qualityScore,
            qualityThreshold: revisionDecision.qualityThreshold,
          });

          if (revisionEvent) {
            lastRevisionEventId = revisionEvent.id;
            await revisionService.markApplied(
              revisionEvent.id,
              `Dispatcher scheduled reinvocation after failure on attempt ${attempt}.`
            );
            entry.status = 'retry';
            entry.errorSeverity = ErrorSeverity.RECOVERABLE;
            entry.revisionEventId = revisionEvent.id;
            entry.revisionAttempt = revisionAttempts;
            entry.revisionStatus = 'applied';
            entry.stopReason = 'self-revision-requested';
            this._logEntry(entry);
            currentContext = this._buildRevisionContext(
              currentContext,
              revisionEvent,
              revisionAttempts,
              maxRevisionAttempts,
              revisionDecision.summary
            );
            await this._delayWithCap(
              config.revisionBackoffBaseMs as number,
              config.revisionBackoffCapMs as number,
              revisionAttempts
            );
            continue;
          }
        }

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
        if (transientRetries < maxRetries) {
          transientRetries += 1;
          await this._delayWithCap(
            config.backoffBaseMs as number,
            config.backoffCapMs as number,
            transientRetries
          );
          continue;
        }

        if (revisionDecision && lastRevisionEventId) {
          await revisionService.markEscalated(
            lastRevisionEventId,
            revisionDecision.summary,
            'max-revision-attempts'
          );
        }

        return {
          success: false,
          error: lastError ? lastError.message : 'Unknown error',
          severity:
            severity === ErrorSeverity.RECOVERABLE
              ? ErrorSeverity.RECOVERABLE
              : ErrorSeverity.FATAL,
          degraded: severity === ErrorSeverity.RECOVERABLE ? true : undefined,
          stopReason: revisionDecision ? 'max-revision-attempts' : 'retry-budget-exhausted',
          revisionEventId: lastRevisionEventId,
          confidence: confidence.confidence,
          uncertainty_reasons: confidence.uncertainty_reasons,
          needs_human_review: confidence.needs_human_review,
        };
      }
    }

    // All retries exhausted
    const finalSeverity = lastError ? Dispatcher.classifyError(lastError) : ErrorSeverity.FATAL;
    const confidence = assessConfidence(
      undefined,
      maxRetries + 1,
      false,
      lastError ? lastError.message : 'Unknown error',
      confidenceThreshold
    );
    return {
      success: false,
      error: lastError ? lastError.message : 'Unknown error',
      severity:
        finalSeverity === ErrorSeverity.RECOVERABLE
          ? ErrorSeverity.RECOVERABLE
          : ErrorSeverity.FATAL,
      degraded: finalSeverity === ErrorSeverity.RECOVERABLE ? true : undefined,
      stopReason: 'attempt-budget-exhausted',
      revisionEventId: lastRevisionEventId,
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
    const usedAgentIds = new Set<string>();
    const capabilityRequirements =
      (contextOptions.capabilityRequirements as Record<string, string> | undefined) || {};
    const capabilityMap =
      (contextOptions.agentCapabilities as Record<string, string[]> | undefined) || {};
    const availability =
      (contextOptions.agentAvailability as Record<string, boolean> | undefined) || {};
    const agentBudgets =
      (contextOptions.agentBudgets as
        | Record<string, Parameters<typeof evaluateAgentBudget>[0]>
        | undefined) || {};
    const invocationEstimates =
      (contextOptions.invocationEstimates as
        | Record<string, Parameters<typeof evaluateAgentBudget>[1]>
        | undefined) || {};

    for (const requestedAgent of agents) {
      const agent =
        resolveCapabilityAssignment(
          requestedAgent.id,
          agents,
          capabilityRequirements,
          capabilityMap,
          availability
        ) || requestedAgent;
      if (usedAgentIds.has(agent.id)) {
        continue;
      }
      usedAgentIds.add(agent.id);

      const budgetPolicy = agentBudgets[agent.id]
        ? evaluateAgentBudget(
            agentBudgets[agent.id],
            invocationEstimates[agent.id] || { requiredBytes: 0 }
          )
        : null;
      if (budgetPolicy && !budgetPolicy.allowed) {
        results.push({
          agent,
          success: false,
          error: budgetPolicy.reasons.join(' '),
          degraded: true,
        });
        failed.push(agent.id);
        if (onFailure === 'abort') {
          break;
        }
        if (onFailure === 'escalate') {
          escalated = true;
          break;
        }
        continue;
      }

      const context = this.buildContext(agent.id, {
        ...contextOptions,
        executionPolicy: budgetPolicy?.executionMode === 'fast-path' ? 'fast-path' : 'standard',
      });
      const agentConfig = agentConfigs[requestedAgent.id] || agentConfigs[agent.id] || {};
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
  _withTimeout<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
    if (ms <= 0) return promise;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
      const onAbort = () => reject(new Error('ABORTED'));
      signal?.addEventListener('abort', onAbort, { once: true });
      promise
        .then((val) => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', onAbort);
          resolve(val);
        })
        .catch((err) => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', onAbort);
          reject(err);
        });
    });
  }

  /** @private */
  _delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** @private */
  _delayWithCap(baseMs: number, capMs: number, attempt: number) {
    const safeBase = Number.isFinite(baseMs) ? baseMs : (DEFAULT_CONFIG.backoffBaseMs as number);
    const safeCap = Number.isFinite(capMs) ? capMs : (DEFAULT_CONFIG.backoffCapMs as number);
    const delay = Math.min(safeBase * Math.pow(2, Math.max(0, attempt - 1)), safeCap);
    return this._delay(delay);
  }

  /** @private */
  _logEntry(entry: InvocationEntry) {
    this._log.push(entry);
    this._onLog(entry);
  }

  /** @private */
  _buildRevisionContext(
    context: Record<string, unknown>,
    revisionEvent: SelfRevisionEvent,
    attempt: number,
    maxAttempts: number,
    priorFailure: string,
    previousOutputPath?: string
  ) {
    return {
      ...context,
      revisionContext: {
        eventId: revisionEvent.id,
        attempt,
        maxAttempts,
        trigger: revisionEvent.trigger,
        instructions: revisionEvent.instructions,
        findingsAddressed: revisionEvent.findingsAddressed,
        estimatedImpact: revisionEvent.estimatedImpact,
        priorFailure,
        previousOutputPath,
      },
    };
  }

  /** @private */
  _createSelfRevisionService() {
    const store = this._store;
    const storeAdapter = {
      exists(filePath: string) {
        return store.exists(filePath);
      },
      readFile(filePath: string, encoding?: string) {
        if (typeof store.readFile === 'function') {
          return store.readFile(filePath, encoding);
        }
        return store.read(filePath);
      },
      writeFile(filePath: string, data: string, encoding?: string) {
        if (typeof store.writeFile === 'function') {
          store.writeFile(filePath, data, encoding);
          return;
        }
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, data, (encoding || 'utf8') as BufferEncoding);
      },
      mkdirp(dirPath: string) {
        if (typeof store.mkdirp === 'function') {
          store.mkdirp(dirPath);
        }
      },
    };

    return createSelfRevisionService({
      store: storeAdapter,
      cache: {} as never,
      audit: {} as never,
      projectRoot: process.cwd(),
      businessDocs: path.resolve(process.cwd(), 'BusinessDocs'),
      sessionDir: path.resolve(process.cwd(), 'BusinessDocs', 'session'),
      decisionsFile: path.resolve(process.cwd(), 'BusinessDocs', 'decisions.md'),
      decisionsDir: path.resolve(process.cwd(), 'BusinessDocs', 'decisions'),
      commandQueue: path.resolve(process.cwd(), 'BusinessDocs', 'session', 'command-queue.json'),
      helpDir: path.resolve(process.cwd(), 'docs', 'help'),
      safeWrite(filePath: string, data: string, encoding?: string) {
        storeAdapter.writeFile(filePath, data, encoding);
      },
    } as never);
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
    const capabilityRequirements =
      (contextOptions.capabilityRequirements as Record<string, string> | undefined) || {};
    const capabilityMap =
      (contextOptions.agentCapabilities as Record<string, string[]> | undefined) || {};
    const availability =
      (contextOptions.agentAvailability as Record<string, boolean> | undefined) || {};
    const agentBudgets =
      (contextOptions.agentBudgets as
        | Record<string, Parameters<typeof evaluateAgentBudget>[0]>
        | undefined) || {};
    const invocationEstimates =
      (contextOptions.invocationEstimates as
        | Record<string, Parameters<typeof evaluateAgentBudget>[1]>
        | undefined) || {};

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
      const agent =
        resolveCapabilityAssignment(
          agentId,
          phaseAgents,
          capabilityRequirements,
          capabilityMap,
          availability
        ) || agentMap.get(agentId);
      if (!agent) {
        return {
          agent: { id: agentId, name: agentId },
          success: false,
          error: `Agent '${agentId}' not found in registry for state '${state}'`,
        };
      }

      const budgetPolicy = agentBudgets[agent.id]
        ? evaluateAgentBudget(
            agentBudgets[agent.id],
            invocationEstimates[agent.id] || { requiredBytes: 0 }
          )
        : null;
      if (budgetPolicy && !budgetPolicy.allowed) {
        return {
          agent,
          success: false,
          error: budgetPolicy.reasons.join(' '),
          degraded: true,
        };
      }

      await acquire();
      try {
        const context = this.buildContext(agent.id, {
          ...contextOptions,
          executionPolicy: budgetPolicy?.executionMode === 'fast-path' ? 'fast-path' : 'standard',
        });
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
   * Groups defined in the runtime pack graph run serially — the predecessor paths
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
    const groups = this._parallelGroups[state];
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

    const predecessorPaths: string[] = [...((contextOptions.predecessorPaths as string[]) || [])];
    const prioritySignals =
      (contextOptions.prioritySignals as Record<string, AgentPrioritySignal> | undefined) || {};

    for (const group of groups) {
      if (escalated) break;

      const orderedGroup = orderByRuntimePriority(group, prioritySignals);

      const groupContext: Record<string, unknown> = {
        ...contextOptions,
        predecessorPaths: [...predecessorPaths],
      };

      const groupResult = await this._runBoundedGroup(
        orderedGroup,
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
  PLATFORMS,
  DEFAULT_CONFIG,
  DEFAULT_CONFIG as _DEFAULT_CONFIG,
  Dispatcher,
  ErrorSeverity,
  TRANSIENT_PATTERNS,
  FATAL_PATTERNS,
};
export type { AgentRuntimeAdapter };
