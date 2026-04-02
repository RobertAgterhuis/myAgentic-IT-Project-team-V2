// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * AgentRuntimeAdapter — First-class runtime adapter abstraction (Epic E-A1).
 *
 * Replaces the ad-hoc external `invoker` function requirement with a typed,
 * registerable adapter contract. The Dispatcher resolves its runtime provider
 * from the AdapterRegistry at construction time, removing the requirement for
 * callers to supply an invoker function just to get past the default throw.
 *
 * I-A1-001: Interface + registry + built-ins.
 * I-A1-002: Dispatcher's default invoker delegates here.
 */

import path from 'node:path';
import { existsSync, readFileSync, promises as fs } from 'node:fs';
import { createDefaultRegistry, type ProviderRegistry } from '../sdlc/adapters/registry.js';
import { AdapterRegistry as ToolAdapterRegistry } from '../sdlc/adapters/tool-adapter.js';
import {
  GitAdapter,
  CiAdapter,
  ContainerAdapter,
  CloudAdapter,
  SecurityAdapter,
  TestingAdapter,
  LlmAdapter,
} from '../sdlc/adapters/index.js';
import type {
  LLMMessage,
  LLMProvider,
  TokenUsage,
} from '../sdlc/adapters/contracts/llm-provider.js';
import { loadContractSections, validateDocument } from './gate-validator.js';
import {
  assessDeliverableQuality,
  type DeliverableQualityAssessment,
} from './deliverable-quality.js';
import { ToolExecutor } from './tool-executor.js';
import {
  ToolExecutionMiddleware,
  type ToolExecutionAuditEvent,
} from './tool-execution-middleware.js';
import { buildPromptEnvelope } from './runtime-adapter/prompt-assembly.js';
import { completeWithToolExecution } from './runtime-adapter/tool-loop.js';
import { deriveEnvScope, shouldFallbackProvider } from './runtime-adapter/profile.js';
import { resolveAdapterSelection } from './runtime-adapter/adapter-resolution.js';
import { SandboxRuntimeAdapter } from './runtime-adapter/sandbox-runtime.js';

// ─── Interface ────────────────────────────────────────────────

/**
 * Provider contract for executing an agent invocation.
 */
export interface AgentRuntimeAdapter {
  /** Unique adapter name used as registry key. */
  readonly name: string;

  /**
   * Invoke an agent and return a result envelope.
   *
   * @param agent    - { id, name } of the agent being invoked
   * @param platform - Platform key (copilot | claude | openai)
   * @param context  - Assembled invocation context from Dispatcher.buildContext()
   * @returns        - Envelope with optional `outputPath` pointing to the output file
   */
  invoke(
    agent: { id: string; name: string },
    platform: string,
    context: Record<string, unknown>
  ): Promise<RuntimeAdapterResult>;
}

interface AgentInvocationContext {
  agentId?: string;
  skillFile?: string;
  predecessorOutputs?: Record<string, string>;
  predecessorContracts?: Array<{
    source: string;
    headingCount: number;
    headings: string[];
    hasHandoffChecklist: boolean;
    checklist: {
      total: number;
      checked: number;
      completionRatio: number;
    } | null;
  }>;
  questionnaireInput?: string | null;
  ragContext?: {
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
  sessionState?: unknown;
  revisionContext?: {
    eventId: string;
    attempt: number;
    maxAttempts: number;
    trigger: 'verifier-findings' | 'quality-below-threshold' | 'manual';
    instructions: Array<{ heading: string; directive: string }>;
    findingsAddressed: string[];
    estimatedImpact: 'high' | 'medium' | 'low';
    priorFailure?: string;
    previousOutputPath?: string;
  } | null;
  workspaceId?: string | null;
  gitService?: unknown;
  role?: 'viewer' | 'operator' | 'admin';
  profile?: string;
  policyApprovals?: unknown;
  abortSignal?: AbortSignal;
}

export type ContextTrustLevel = 'trusted' | 'untrusted' | 'mixed';

interface ModelBoundContextBlock {
  source: string;
  trustLevel: ContextTrustLevel;
  sourceClassificationTag: `SOURCE_CLASSIFICATION:${ContextTrustLevel}`;
  sanitized: boolean;
  content: string;
}

export interface AgentPromptEnvelope {
  version: '2026-03-19';
  requestId: string;
  agent: { id: string; name: string };
  platform: string;
  prompt: {
    system: string;
    user: string;
  };
  context: {
    skillFile: string | null;
    predecessorOutputs: Array<{ source: string; excerpt: string }>;
    predecessorContracts: Array<{
      source: string;
      headingCount: number;
      headings: string[];
      hasHandoffChecklist: boolean;
      checklist: {
        total: number;
        checked: number;
        completionRatio: number;
      } | null;
    }>;
    questionnaireInput: string | null;
    ragContext: {
      query: string;
      collections: string[];
      matches: Array<{
        source: string;
        excerpt: string;
        collection: string;
        score: number;
      }>;
    } | null;
    sessionState: string | null;
    revisionContext: {
      eventId: string;
      attempt: number;
      maxAttempts: number;
      trigger: 'verifier-findings' | 'quality-below-threshold' | 'manual';
      instructions: Array<{ heading: string; directive: string }>;
      findingsAddressed: string[];
      estimatedImpact: 'high' | 'medium' | 'low';
      priorFailure?: string;
      previousOutputPath?: string;
    } | null;
    blocks: ModelBoundContextBlock[];
  };
  requestedAt: string;
}

export interface AgentResponseEnvelope {
  version: '2026-03-19';
  requestId: string;
  adapter: string;
  provider: string;
  model: string;
  status: 'success';
  finishReason: string;
  usage: TokenUsage;
  content: string;
  attempts: number;
  toolTraceId?: string;
  toolInvocationCount?: number;
  toolAuditEvents?: ToolExecutionAuditEvent[];
  deliverableQuality?: DeliverableQualityAssessment;
  contractValidation?: {
    status: 'passed';
    contractPaths: string[];
    requiredMarkers: string[];
    attempt: number;
  };
  requestedAt: string;
  completedAt: string;
}

export interface RuntimeAdapterResult {
  outputPath?: string;
  response?: AgentResponseEnvelope | Record<string, unknown>;
  usage?: TokenUsage;
  toolAuditEvents?: ToolExecutionAuditEvent[];
}

interface ProviderBackedRuntimeAdapterConfig {
  name: string;
  providerName: string;
  fallbackProviderNames?: string[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  validationMaxRetries?: number;
  outputDir?: string;
  providerRegistry?: Pick<ProviderRegistry, 'getProvider' | 'getProviderWithFallback'>;
  toolExecutor?: Pick<ToolExecutor, 'execute'>;
  toolAudit?: { logToolExecution(event: ToolExecutionAuditEvent): void };
  toolCatalogPath?: string;
  runtimeManifestDir?: string;
}

interface MockRuntimeAdapterConfig {
  outputDir?: string;
}

const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), 'BusinessDocs', 'session', 'agent-runs');
const DEFAULT_PROVIDER_REGISTRY = createDefaultRegistry();
const DEFAULT_LLM_FALLBACK_PROVIDER_NAMES = ['copilot', 'anthropic', 'openai', 'local'];
const TOOL_EXECUTION_CACHE_STORE = {
  _files: {} as Record<string, string>,
  exists(filePath: string) {
    return Object.prototype.hasOwnProperty.call(this._files, filePath);
  },
  readFile(filePath: string) {
    return this._files[filePath] || '';
  },
  writeFile(filePath: string, data: string) {
    this._files[filePath] = data;
  },
  mkdirp(_dirPath: string) {},
};
const FILE_GATE_STORE = {
  exists: existsSync,
  readFile: (filePath: string) => readFileSync(filePath, 'utf8'),
};

function createDefaultToolExecutor(): ToolExecutor {
  const registry = new ToolAdapterRegistry();
  registry.register(new GitAdapter());
  registry.register(new CiAdapter());
  registry.register(new ContainerAdapter());
  registry.register(new CloudAdapter());
  registry.register(new SecurityAdapter());
  registry.register(new TestingAdapter());
  registry.register(new LlmAdapter());
  return new ToolExecutor({ registry, store: TOOL_EXECUTION_CACHE_STORE });
}

interface ContractMarkerRequirement {
  anyOf: string[];
  optional: boolean;
}

interface ContractBinding {
  contractPaths: string[];
  requiredMarkers: ContractMarkerRequirement[];
  requiredSections: string[];
}

interface ContractValidationFinding {
  severity: string;
  rule: string;
  description: string;
}

interface ContractValidationResult {
  valid: boolean;
  findings: ContractValidationFinding[];
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}\n...[truncated]`;
}

function estimateTokens(value: string): number {
  if (!value) return 0;
  return Math.ceil(value.length / 4);
}

function trimToTokenEstimate(value: string, maxTokens: number): string {
  if (!value) return '';
  if (maxTokens <= 0) return '';

  const maxChars = Math.max(1, maxTokens * 4);
  if (value.length <= maxChars) return value;

  const ellipsis = '\n...[token-budget-truncated]';
  const keepChars = Math.max(1, maxChars - ellipsis.length);
  return `${value.slice(0, keepChars)}${ellipsis}`;
}

function resolveContextTokenBudget(maxTokens: number): number {
  const fromEnv = Number.parseInt(process.env.AGENT_CONTEXT_TOKEN_BUDGET || '', 10);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;

  // Keep context budget proportional to completion budget by default.
  return Math.max(2048, maxTokens * 3);
}

function applyTokenBudgetToContextBlocks(
  blocks: ModelBoundContextBlock[],
  maxTokens: number
): ModelBoundContextBlock[] {
  let remaining = Math.max(0, maxTokens);
  const result: ModelBoundContextBlock[] = [];

  for (const block of blocks) {
    if (!block.content) continue;
    if (remaining <= 0) break;

    const estimated = estimateTokens(block.content);
    if (estimated <= remaining) {
      result.push(block);
      remaining -= estimated;
      continue;
    }

    const trimmed = trimToTokenEstimate(block.content, remaining);
    if (trimmed) {
      result.push({ ...block, content: trimmed });
      remaining = 0;
    }
    break;
  }

  return result;
}

function sanitizeModelBoundText(value: string): string {
  return (
    value
      // eslint-disable-next-line no-control-regex -- intentional control-char sanitization
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
      .replace(
        /\b(ignore|disregard|override)\s+(all\s+)?(previous|prior)\s+instructions?\b/gi,
        '[sanitized-prompt-injection]'
      )
      .replace(
        /\b(system\s+prompt|developer\s+message|hidden\s+instructions?)\b/gi,
        '[sanitized-sensitive-reference]'
      )
      .replace(/\b(exfiltrate|leak|reveal)\b[^\n]*/gi, '[sanitized-data-exfiltration-attempt]')
  );
}

function toSourceClassificationTag(
  level: ContextTrustLevel
): `SOURCE_CLASSIFICATION:${ContextTrustLevel}` {
  return `SOURCE_CLASSIFICATION:${level}`;
}

function stringifySessionState(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  try {
    return truncate(JSON.stringify(value, null, 2), 4000);
  } catch {
    return '[unserializable session state]';
  }
}

function summarizePredecessorContract(content: string): {
  headingCount: number;
  headings: string[];
  hasHandoffChecklist: boolean;
  checklist: {
    total: number;
    checked: number;
    completionRatio: number;
  } | null;
} {
  const headings = (content.match(/^#{1,6}\s+.+$/gm) || [])
    .map((line) => sanitizeModelBoundText(line.replace(/^#{1,6}\s+/, '').trim()))
    .filter((line) => line.length > 0)
    .slice(0, 12);

  const checklistItems = content.match(/^\s*-\s*\[(?: |x|X)\]\s+.+$/gm) || [];
  const checkedItems = content.match(/^\s*-\s*\[(?:x|X)\]\s+.+$/gm) || [];

  const hasHandoffChecklist = /(^|\n)\s*##\s+HANDOFF\s+CHECKLIST\b/im.test(content);
  const checklist =
    checklistItems.length > 0
      ? {
          total: checklistItems.length,
          checked: checkedItems.length,
          completionRatio:
            checklistItems.length > 0
              ? Math.round((checkedItems.length / checklistItems.length) * 100) / 100
              : 0,
        }
      : null;

  return {
    headingCount: headings.length,
    headings,
    hasHandoffChecklist,
    checklist,
  };
}

function normalizePredecessorContracts(
  contracts: AgentInvocationContext['predecessorContracts']
): AgentPromptEnvelope['context']['predecessorContracts'] | null {
  if (!Array.isArray(contracts) || contracts.length === 0) return null;

  const normalized = contracts
    .filter(
      (contract) =>
        !!contract &&
        typeof contract.source === 'string' &&
        Array.isArray(contract.headings) &&
        typeof contract.hasHandoffChecklist === 'boolean'
    )
    .map((contract) => {
      const headings = contract.headings
        .map((heading) => sanitizeModelBoundText(String(heading)))
        .filter((heading) => heading.length > 0)
        .slice(0, 12);

      const checklist = contract.checklist
        ? {
            total: Number(contract.checklist.total) || 0,
            checked: Number(contract.checklist.checked) || 0,
            completionRatio: Number(contract.checklist.completionRatio) || 0,
          }
        : null;

      return {
        source: contract.source,
        headingCount:
          typeof contract.headingCount === 'number' && Number.isFinite(contract.headingCount)
            ? contract.headingCount
            : headings.length,
        headings,
        hasHandoffChecklist: contract.hasHandoffChecklist,
        checklist,
      };
    });

  return normalized.length > 0 ? normalized : null;
}

async function resolveSkillFile(pattern: string | undefined): Promise<string | null> {
  if (!pattern) return null;
  if (!pattern.includes('*')) return pattern;

  const directory = path.dirname(pattern);
  const basename = path.basename(pattern);
  const starIndex = basename.indexOf('*');
  const prefix = basename.slice(0, starIndex);
  const suffix = basename.slice(starIndex + 1);

  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const match = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort()
      .find((entry) => entry.startsWith(prefix) && entry.endsWith(suffix));
    return match ? path.join(directory, match) : null;
  } catch {
    return null;
  }
}

async function readSkillInstructions(skillPattern: string | undefined): Promise<{
  path: string | null;
  content: string;
}> {
  const resolvedPath = await resolveSkillFile(skillPattern);
  if (!resolvedPath) {
    return { path: null, content: '' };
  }

  try {
    const content = await fs.readFile(resolvedPath, 'utf8');
    return { path: resolvedPath, content };
  } catch {
    return { path: resolvedPath, content: '' };
  }
}

function createRequestId(agentId: string): string {
  return `${agentId}-${Date.now()}`;
}

function normalizeForMatch(value: string): string {
  return value
    .replace(/[–—]/g, '-')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function cleanMarkerText(value: string): string {
  let cleaned = value
    .replace(/`/g, '')
    .replace(/_[^_]+_/g, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  cleaned = cleaned.replace(/\s*[–—/-]\s*$/g, '').trim();
  return cleaned;
}

function deriveHeadingAlternatives(line: string): string[] {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  if (!match) return [];

  const headingPrefix = match[1];
  const rawText = match[2].trim();
  const numberedPrefix = rawText.match(/^(\d+(?:\.\d+)*)\s+/)?.[1] || '';
  const parts = rawText.split('/').map((part) => cleanMarkerText(part));
  const alternatives = new Set<string>();

  for (const part of parts) {
    if (!part) continue;
    if (/^\d/.test(part)) {
      alternatives.add(`${headingPrefix} ${part}`);
      continue;
    }

    if (numberedPrefix) {
      alternatives.add(`${headingPrefix} ${numberedPrefix} ${part}`);
    }
    alternatives.add(`${headingPrefix} ${part}`);
  }

  return [...alternatives];
}

function extractContractPaths(skillContent: string): string[] {
  const uniquePaths = new Set<string>();

  const relativeMatches = skillContent.match(/templates\/sdlc\/contracts\/[a-z0-9-]+\.md/gi) || [];
  for (const contractPath of relativeMatches) {
    uniquePaths.add(path.resolve(process.cwd(), contractPath));
  }

  const absolutePathPattern = /(?:^|[\s(])((?:\/[\w./-]*|[a-z]:[\\/][^\s`)]+)-contract\.md)/gim;
  for (const match of skillContent.matchAll(absolutePathPattern)) {
    const contractPath = match[1];
    if (contractPath) {
      uniquePaths.add(path.resolve(contractPath));
    }
  }

  return [...uniquePaths];
}

function extractContractMarkers(contractContent: string): ContractMarkerRequirement[] {
  const requirements = new Map<string, ContractMarkerRequirement>();
  const fencedBlocks = [...contractContent.matchAll(/```(?:[a-z]+)?\n([\s\S]*?)```/gi)];

  for (const block of fencedBlocks) {
    const lines = block[1].split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const headingAlternatives = deriveHeadingAlternatives(line).filter(
        (marker) => !normalizeForMatch(marker).includes('scope change impact')
      );
      if (headingAlternatives.length > 0) {
        const key = headingAlternatives.map((marker) => normalizeForMatch(marker)).join('|');
        requirements.set(key, { anyOf: headingAlternatives, optional: false });
        continue;
      }

      const labelMatch = line.match(/^([A-Z][A-Z0-9-]+:)/);
      if (labelMatch) {
        const marker = cleanMarkerText(labelMatch[1]);
        const key = normalizeForMatch(marker);
        requirements.set(key, { anyOf: [marker], optional: false });
      }
    }
  }

  if (/##\s*HANDOFF\s+CHECKLIST/i.test(contractContent)) {
    const marker = '## HANDOFF CHECKLIST';
    requirements.set(normalizeForMatch(marker), { anyOf: [marker], optional: false });
  }

  return [...requirements.values()];
}

function loadContractBinding(skillContent: string): ContractBinding {
  const contractPaths = extractContractPaths(skillContent).filter((contractPath) =>
    existsSync(contractPath)
  );

  const requiredSections = new Set<string>();
  const requiredMarkers = new Map<string, ContractMarkerRequirement>();

  for (const contractPath of contractPaths) {
    for (const section of loadContractSections(FILE_GATE_STORE, contractPath)) {
      requiredSections.add(section);
    }

    const contractContent = readFileSync(contractPath, 'utf8');
    for (const requirement of extractContractMarkers(contractContent)) {
      const key = requirement.anyOf.map((marker) => normalizeForMatch(marker)).join('|');
      requiredMarkers.set(key, requirement);
    }
  }

  return {
    contractPaths,
    requiredSections: [...requiredSections],
    requiredMarkers: [...requiredMarkers.values()],
  };
}

function validateContractOutput(
  content: string,
  binding: ContractBinding,
  context: AgentInvocationContext
): ContractValidationResult {
  const findings: ContractValidationFinding[] = [];
  const documentValidation = validateDocument(content, {
    requiredSections: binding.requiredSections,
  });
  findings.push(
    ...documentValidation.violations.map((violation) => ({
      severity: typeof violation.severity === 'string' ? violation.severity : 'MAJOR',
      rule: typeof violation.rule === 'string' ? violation.rule : 'VALIDATION_VIOLATION',
      description:
        typeof violation.description === 'string'
          ? violation.description
          : 'Contract validator reported a violation.',
    }))
  );

  const normalizedContent = normalizeForMatch(content);
  const isScopeChange =
    typeof context.sessionState === 'object' &&
    context.sessionState !== null &&
    (context.sessionState as { cycle_type?: string }).cycle_type === 'SCOPE_CHANGE';

  for (const requirement of binding.requiredMarkers) {
    const includesScopeChangeMarker = requirement.anyOf.some((marker) =>
      normalizeForMatch(marker).includes('scope change impact')
    );
    if (includesScopeChangeMarker && !isScopeChange) {
      continue;
    }

    const satisfied = requirement.anyOf.some((marker) =>
      normalizedContent.includes(normalizeForMatch(marker))
    );
    if (!satisfied) {
      findings.push({
        severity: 'MAJOR',
        rule: 'MISSING_CONTRACT_MARKER',
        description: `Missing contract marker: ${requirement.anyOf.join(' OR ')}`,
      });
    }
  }

  return { valid: findings.length === 0, findings };
}

function summarizeValidationFindings(findings: ContractValidationFinding[]): string[] {
  return findings.slice(0, 12).map((finding) => `${finding.rule}: ${finding.description}`);
}

function buildRepairPrompt(
  binding: ContractBinding,
  findings: ContractValidationFinding[],
  invalidContent: string,
  attempt: number,
  maxAttempts: number
): string {
  const requirementSummary = binding.requiredMarkers
    .map((requirement) => `- ${requirement.anyOf.join(' OR ')}`)
    .slice(0, 20)
    .join('\n');

  return [
    `Your previous response did not satisfy the required output contract. Attempt ${attempt} of ${maxAttempts}.`,
    'Regenerate the full deliverable from scratch and return only the corrected deliverable content.',
    'Do not explain the fixes. Do not wrap the response in code fences.',
    '',
    'Validation failures:',
    ...summarizeValidationFindings(findings).map((finding) => `- ${finding}`),
    '',
    'Required markers that must appear in the deliverable:',
    requirementSummary ||
      '- No explicit markers were derived; satisfy the contract sections and checklist.',
    '',
    'Previous invalid response:',
    truncate(sanitizeModelBoundText(invalidContent), 4000),
  ].join('\n');
}

function deriveToolIdsFromDecision(decision: Record<string, unknown>): string[] {
  const candidates = ['approvedTools', 'approvedActions', 'tools', 'allow']
    .map((key) => decision[key])
    .find((value) => Array.isArray(value)) as unknown[] | undefined;

  if (!candidates) return [];

  return candidates
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.startsWith('tool.'));
}

function derivePolicyApprovals(context: AgentInvocationContext): unknown {
  const session =
    context.sessionState && typeof context.sessionState === 'object'
      ? (context.sessionState as Record<string, unknown>)
      : {};

  const explicitApprovals =
    context.policyApprovals !== undefined ? context.policyApprovals : session.policyApprovals;

  const candidateDecisionLists: unknown[] = [
    session.governanceDecisions,
    session.decisions,
    (session.governance as Record<string, unknown> | undefined)?.decisions,
  ];

  const decisionRefsByTool: Record<string, string[]> = {};
  const allow = new Set<string>();

  for (const candidateList of candidateDecisionLists) {
    if (!Array.isArray(candidateList)) continue;
    for (const item of candidateList) {
      if (!item || typeof item !== 'object') continue;
      const decision = item as Record<string, unknown>;
      const status = String(decision.status || '').toLowerCase();
      if (status && !['approved', 'decided', 'accepted'].includes(status)) {
        continue;
      }

      const decisionId = String(decision.id || decision.decisionId || '').trim();
      const toolIds = deriveToolIdsFromDecision(decision);
      for (const toolId of toolIds) {
        allow.add(toolId);
        if (decisionId) {
          if (!decisionRefsByTool[toolId]) decisionRefsByTool[toolId] = [];
          if (!decisionRefsByTool[toolId].includes(decisionId)) {
            decisionRefsByTool[toolId].push(decisionId);
          }
        }
      }
    }
  }

  if (allow.size === 0) {
    return explicitApprovals;
  }

  return {
    allow: [...allow],
    approvals: Object.fromEntries([...allow].map((toolId) => [toolId, true])),
    decisionRefs: decisionRefsByTool,
    explicit: explicitApprovals,
  };
}

function createValidationError(findings: ContractValidationFinding[], attempts: number): Error {
  const details = summarizeValidationFindings(findings).join(' | ');
  return new Error(
    `Provider output failed contract validation after ${attempts} attempt(s). ${details}`.trim()
  );
}

function formatArtifact(
  agent: { id: string; name: string },
  response: AgentResponseEnvelope
): string {
  const output = response.content.trim() || 'No content returned by runtime adapter.';
  return [
    `# ${agent.name}`,
    '',
    '## Invocation Metadata',
    '',
    `- Agent ID: ${agent.id}`,
    `- Adapter: ${response.adapter}`,
    `- Provider: ${response.provider}`,
    `- Model: ${response.model}`,
    `- Request ID: ${response.requestId}`,
    `- Requested At: ${response.requestedAt}`,
    `- Completed At: ${response.completedAt}`,
    `- Finish Reason: ${response.finishReason}`,
    `- Attempts: ${response.attempts}`,
    `- Total Tokens: ${response.usage.totalTokens}`,
    response.deliverableQuality
      ? `- Deliverable Quality Score: ${response.deliverableQuality.score}`
      : '- Deliverable Quality Score: not assessed',
    response.deliverableQuality
      ? `- Approval Signal: ${response.deliverableQuality.approvalSignal}`
      : '- Approval Signal: unavailable',
    response.contractValidation
      ? `- Contract Validation: passed on attempt ${response.contractValidation.attempt}`
      : '- Contract Validation: not applied',
    '',
    ...(response.deliverableQuality
      ? [
          '## Quality Assessment',
          '',
          response.deliverableQuality.summary,
          '',
          ...response.deliverableQuality.metrics.map(
            (metric) => `- ${metric.label}: ${metric.score} (${metric.detail})`
          ),
          '',
        ]
      : []),
    '## Output',
    '',
    output,
    '',
  ].join('\n');
}

abstract class FileProducingRuntimeAdapter implements AgentRuntimeAdapter {
  abstract readonly name: string;
  abstract invoke(
    agent: { id: string; name: string },
    platform: string,
    context: Record<string, unknown>
  ): Promise<RuntimeAdapterResult>;

  protected readonly _outputDir: string;

  constructor(outputDir?: string) {
    this._outputDir = outputDir || DEFAULT_OUTPUT_DIR;
  }

  protected async _writeArtifact(
    agent: { id: string; name: string },
    response: AgentResponseEnvelope
  ): Promise<string> {
    await fs.mkdir(this._outputDir, { recursive: true });
    const fileName = `${response.completedAt.replace(/[:.]/g, '-')}-${agent.id}.md`;
    const filePath = path.join(this._outputDir, fileName);
    await fs.writeFile(filePath, formatArtifact(agent, response), 'utf8');
    return filePath;
  }
}

export class MockLlmRuntimeAdapter extends FileProducingRuntimeAdapter {
  readonly name = 'llm-mock';

  constructor(config: MockRuntimeAdapterConfig = {}) {
    super(config.outputDir);
  }

  async invoke(
    agent: { id: string; name: string },
    platform: string,
    context: Record<string, unknown>
  ): Promise<RuntimeAdapterResult> {
    const runtimeContext = context as AgentInvocationContext;
    const requestedAt = new Date().toISOString();
    const completedAt = new Date().toISOString();
    const requestId = createRequestId(agent.id);
    const predecessorCount = Object.keys(runtimeContext.predecessorOutputs || {}).length;
    const content = [
      `Mock execution for ${agent.name}.`,
      '',
      `Platform: ${platform}`,
      `Predecessor outputs: ${predecessorCount}`,
      runtimeContext.questionnaireInput
        ? 'Questionnaire input present.'
        : 'No questionnaire input.',
      '',
      'This deterministic adapter is intended for local development and test flows.',
    ].join('\n');

    const response: AgentResponseEnvelope = {
      version: '2026-03-19',
      requestId,
      adapter: this.name,
      provider: 'mock',
      model: 'deterministic-local',
      status: 'success',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      content,
      attempts: 1,
      requestedAt,
      completedAt,
    };

    const outputPath = await this._writeArtifact(agent, response);
    return { outputPath, response, usage: response.usage };
  }
}

export class ProviderBackedLlmRuntimeAdapter extends FileProducingRuntimeAdapter {
  readonly name: string;

  private readonly _providerName: string;
  private readonly _fallbackProviderNames: string[];
  private readonly _model?: string;
  private readonly _maxTokens: number;
  private readonly _temperature: number;
  private readonly _timeout?: number;
  private readonly _validationMaxRetries: number;
  private readonly _providerRegistry: Pick<
    ProviderRegistry,
    'getProvider' | 'getProviderWithFallback'
  >;
  private readonly _toolExecutor: Pick<ToolExecutor, 'execute'>;
  private readonly _toolAudit?: { logToolExecution(event: ToolExecutionAuditEvent): void };
  private readonly _toolCatalogPath?: string;
  private readonly _runtimeManifestDir?: string;

  constructor(config: ProviderBackedRuntimeAdapterConfig) {
    super(config.outputDir);
    this.name = config.name;
    this._providerName = config.providerName;
    this._fallbackProviderNames = (
      config.fallbackProviderNames || DEFAULT_LLM_FALLBACK_PROVIDER_NAMES
    )
      .filter((name) => name && name !== config.providerName)
      .filter((name, index, list) => list.indexOf(name) === index);
    this._model = config.model;
    this._maxTokens = config.maxTokens ?? 4096;
    this._temperature = config.temperature ?? 0.1;
    this._timeout = config.timeout;
    this._validationMaxRetries = config.validationMaxRetries ?? 1;
    this._providerRegistry = config.providerRegistry || DEFAULT_PROVIDER_REGISTRY;
    this._toolExecutor = config.toolExecutor || createDefaultToolExecutor();
    this._toolAudit = config.toolAudit;
    this._toolCatalogPath = config.toolCatalogPath;
    this._runtimeManifestDir = config.runtimeManifestDir;
  }

  private _createToolMiddleware(audit?: {
    logToolExecution(event: ToolExecutionAuditEvent): void;
  }): ToolExecutionMiddleware {
    return new ToolExecutionMiddleware({
      toolExecutor: this._toolExecutor,
      audit,
      catalogPath: this._toolCatalogPath,
      runtimeManifestDir: this._runtimeManifestDir,
    });
  }

  async invoke(
    agent: { id: string; name: string },
    platform: string,
    context: Record<string, unknown>
  ): Promise<RuntimeAdapterResult> {
    const runtimeContext = context as AgentInvocationContext;
    const abortSignal = runtimeContext.abortSignal;
    const { path: skillPath, content: skillContent } = await readSkillInstructions(
      runtimeContext.skillFile
    );
    const contractBinding = loadContractBinding(skillContent);

    const requestedAt = new Date().toISOString();
    const requestId = createRequestId(agent.id);
    const toolTraceId = requestId;
    const predecessorContracts =
      normalizePredecessorContracts(runtimeContext.predecessorContracts) ||
      Object.entries(runtimeContext.predecessorOutputs || {}).map(([source, content]) => ({
        source,
        ...summarizePredecessorContract(content),
      }));
    const predecessorOutputs = Object.entries(runtimeContext.predecessorOutputs || {}).map(
      ([source, content]) => ({
        source,
        excerpt: trimToTokenEstimate(sanitizeModelBoundText(content), 700),
      })
    );
    const sanitizedSkillContent = sanitizeModelBoundText(skillContent || '');
    const sanitizedQuestionnaireInput = runtimeContext.questionnaireInput
      ? trimToTokenEstimate(sanitizeModelBoundText(runtimeContext.questionnaireInput), 900)
      : null;
    const ragContext = runtimeContext.ragContext
      ? {
          query: trimToTokenEstimate(sanitizeModelBoundText(runtimeContext.ragContext.query), 400),
          collections: runtimeContext.ragContext.collections,
          matches: runtimeContext.ragContext.matches.map((match) => ({
            source:
              match.start_line == null
                ? `${match.source_path}`
                : `${match.source_path}:L${match.start_line}`,
            excerpt: trimToTokenEstimate(sanitizeModelBoundText(match.text), 450),
            collection: match.collection,
            score: match.score,
          })),
        }
      : null;
    const sessionState = stringifySessionState(runtimeContext.sessionState);
    const revisionContext =
      runtimeContext.revisionContext && typeof runtimeContext.revisionContext === 'object'
        ? (runtimeContext.revisionContext as AgentPromptEnvelope['context']['revisionContext'])
        : null;
    const contextBlocksRaw: ModelBoundContextBlock[] = [
      {
        source: skillPath || 'skill:unresolved',
        trustLevel: 'trusted',
        sourceClassificationTag: toSourceClassificationTag('trusted'),
        sanitized: true,
        content: trimToTokenEstimate(sanitizedSkillContent, 1000),
      },
      ...predecessorOutputs.map((entry) => ({
        source: entry.source,
        trustLevel: 'untrusted' as const,
        sourceClassificationTag: toSourceClassificationTag('untrusted' as const),
        sanitized: true,
        content: entry.excerpt,
      })),
      {
        source: 'questionnaireInput',
        trustLevel: 'untrusted',
        sourceClassificationTag: toSourceClassificationTag('untrusted'),
        sanitized: true,
        content: sanitizedQuestionnaireInput || '',
      },
      ...((ragContext?.matches || []).map((match) => ({
        source: `rag:${match.collection}:${match.source}`,
        trustLevel: 'untrusted' as const,
        sourceClassificationTag: toSourceClassificationTag('untrusted' as const),
        sanitized: true,
        content: match.excerpt,
      })) as ModelBoundContextBlock[]),
      {
        source: 'sessionState',
        trustLevel: 'trusted',
        sourceClassificationTag: toSourceClassificationTag('trusted'),
        sanitized: false,
        content: sessionState || '',
      },
    ];

    const contextTokenBudget = resolveContextTokenBudget(this._maxTokens);
    const contextBlocks = applyTokenBudgetToContextBlocks(contextBlocksRaw, contextTokenBudget);

    const { baseMessages } = buildPromptEnvelope({
      requestId,
      requestedAt,
      agent,
      platform,
      skillPath,
      sanitizedSkillContent: trimToTokenEstimate(
        sanitizedSkillContent || 'No agent instructions were resolved for this invocation.',
        2000
      ),
      contextTokenBudget,
      predecessorOutputs,
      predecessorContracts,
      questionnaireInput: sanitizedQuestionnaireInput,
      ragContext,
      sessionState,
      revisionContext,
      contextBlocks,
      contractPaths: contractBinding.contractPaths,
    });

    const resolvedPolicyApprovals = derivePolicyApprovals(runtimeContext);

    let provider!: LLMProvider;
    let result;
    let toolAuditEvents: ToolExecutionAuditEvent[] = [];
    let validation: ContractValidationResult = { valid: true, findings: [] };
    let attempts = 0;

    const providerNames = [this._providerName, ...this._fallbackProviderNames];
    let lastProviderError: unknown;
    for (let providerIndex = 0; providerIndex < providerNames.length; providerIndex += 1) {
      const providerName = providerNames[providerIndex];
      const messages: LLMMessage[] = baseMessages.map((message) => ({ ...message }));
      try {
        provider =
          providerIndex === 0 && this._providerRegistry.getProviderWithFallback
            ? (this._providerRegistry.getProviderWithFallback('llm', {
                primaryName: providerName,
                fallbackNames: this._fallbackProviderNames,
                config: {
                  model: this._model,
                  maxTokens: this._maxTokens,
                  timeout: this._timeout,
                },
              }) as LLMProvider)
            : (this._providerRegistry.getProvider('llm', providerName, {
                model: this._model,
                maxTokens: this._maxTokens,
                timeout: this._timeout,
              }) as LLMProvider);

        attempts = 0;
        toolAuditEvents = [];
        validation = { valid: true, findings: [] };

        while (attempts <= this._validationMaxRetries) {
          attempts += 1;
          const completionResult = await completeWithToolExecution({
            provider,
            messages,
            model: this._model,
            maxTokens: this._maxTokens,
            temperature: this._temperature,
            policy: {
              role: runtimeContext.role,
              profile:
                runtimeContext.profile ||
                (runtimeContext.sessionState as { profile?: string } | undefined)?.profile,
              agentId: agent.id,
              envScope: deriveEnvScope(
                runtimeContext.profile ||
                  (runtimeContext.sessionState as { profile?: string } | undefined)?.profile
              ),
              traceId: toolTraceId,
              approvedActions: resolvedPolicyApprovals,
              executionContext: runtimeContext as Record<string, unknown>,
            },
            createMiddleware: (audit) => this._createToolMiddleware(audit),
            sanitizeForPrompt: sanitizeModelBoundText,
            toolAuditSink: this._toolAudit,
            signal: abortSignal,
          });

          result = completionResult.completion;
          toolAuditEvents = completionResult.toolAuditEvents;

          validation = validateContractOutput(result.content, contractBinding, runtimeContext);
          if (validation.valid) {
            break;
          }

          if (attempts > this._validationMaxRetries) {
            throw createValidationError(validation.findings, attempts);
          }

          messages.push({ role: 'assistant', content: result.content });
          messages.push({
            role: 'user',
            content: buildRepairPrompt(
              contractBinding,
              validation.findings,
              result.content,
              attempts + 1,
              this._validationMaxRetries + 1
            ),
          });
        }

        break;
      } catch (err) {
        lastProviderError = err;
        if (providerIndex >= providerNames.length - 1 || !shouldFallbackProvider(err)) {
          throw err;
        }
      }
    }

    if (!result) {
      const message = lastProviderError instanceof Error ? lastProviderError.message : '';
      throw new Error(
        message ||
          'Provider did not return a completion result after exhausting fallback providers.'
      );
    }

    const completedAt = new Date().toISOString();
    const deliverableQuality = assessDeliverableQuality(result.content, {
      requiredSections: contractBinding.requiredSections,
      validationPassed: validation.valid,
      findings: validation.findings,
    });
    const response: AgentResponseEnvelope = {
      version: '2026-03-19',
      requestId,
      adapter: this.name,
      provider: provider.providerName,
      model: result.model,
      status: 'success',
      finishReason: result.finishReason,
      usage: result.usage,
      content: result.content,
      attempts,
      toolTraceId,
      toolInvocationCount: toolAuditEvents.length,
      toolAuditEvents,
      deliverableQuality,
      contractValidation:
        contractBinding.contractPaths.length > 0
          ? {
              status: 'passed',
              contractPaths: contractBinding.contractPaths,
              requiredMarkers: contractBinding.requiredMarkers.flatMap(
                (requirement) => requirement.anyOf
              ),
              attempt: attempts,
            }
          : undefined,
      requestedAt,
      completedAt,
    };

    const outputPath = await this._writeArtifact(agent, response);
    return { outputPath, response, usage: result.usage, toolAuditEvents };
  }
}

// ─── Built-in Adapters ────────────────────────────────────────

/**
 * NullAdapter — deterministic no-op for ci-test profile.
 *
 * Returns a synthetic output path so test suites can exercise the full
 * dispatch loop without any external I/O or LLM calls.
 */
export class NullAdapter implements AgentRuntimeAdapter {
  readonly name = 'null';

  async invoke(
    agent: { id: string; name: string },
    _platform: string,
    _context: Record<string, unknown>
  ): Promise<{ outputPath?: string }> {
    return { outputPath: `/tmp/null-adapter-output-${agent.id}.md` };
  }
}

/**
 * LogOnlyAdapter — local-dev / development-time adapter.
 *
 * Logs the invocation and returns a synthetic output path.
 * Safe default when no real LLM provider is configured — no external calls
 * are made, and the dispatcher loop completes normally.
 */
export class LogOnlyAdapter implements AgentRuntimeAdapter {
  readonly name = 'log-only';

  async invoke(
    agent: { id: string; name: string },
    platform: string,
    _context: Record<string, unknown>
  ): Promise<{ outputPath?: string }> {
    // Safe local logging only — no external I/O
    // eslint-disable-next-line no-console
    console.log(
      `[LogOnlyAdapter] invoke agent=${agent.id} name="${agent.name}" platform=${platform}`
    );
    return { outputPath: `/tmp/log-only-output-${agent.id}.md` };
  }
}

// ─── Registry ─────────────────────────────────────────────────

/**
 * AdapterRegistry — maps adapter names to implementation instances.
 *
 * The global DEFAULT_REGISTRY singleton is pre-populated with built-in
 * adapters. Production providers can register additional entries at
 * application startup before the first Dispatcher is constructed.
 */
export class AdapterRegistry {
  private readonly _adapters = new Map<string, AgentRuntimeAdapter>();

  /** Register an adapter under its name. Overwrites any existing entry. */
  register(adapter: AgentRuntimeAdapter): void {
    this._adapters.set(adapter.name, adapter);
  }

  /** Retrieve an adapter by name; returns undefined if not found. */
  get(name: string): AgentRuntimeAdapter | undefined {
    return this._adapters.get(name);
  }

  /** Alias for get — semantically clearer in resolution contexts. */
  resolve(name: string): AgentRuntimeAdapter | undefined {
    return this._adapters.get(name);
  }

  /** List all registered adapter names. Useful for error messages. */
  listNames(): string[] {
    return [...this._adapters.keys()];
  }
}

export { SandboxRuntimeAdapter };

/** Global default registry, pre-populated with built-in adapters. */
export const DEFAULT_REGISTRY = new AdapterRegistry();
DEFAULT_REGISTRY.register(new NullAdapter());
DEFAULT_REGISTRY.register(new LogOnlyAdapter());
DEFAULT_REGISTRY.register(new MockLlmRuntimeAdapter());
DEFAULT_REGISTRY.register(new SandboxRuntimeAdapter());
DEFAULT_REGISTRY.register(
  new ProviderBackedLlmRuntimeAdapter({ name: 'llm-openai', providerName: 'openai' })
);
DEFAULT_REGISTRY.register(
  new ProviderBackedLlmRuntimeAdapter({ name: 'llm-copilot', providerName: 'copilot' })
);

// ─── Adapter Resolution ───────────────────────────────────────

/**
 * Result of adapter resolution.
 */
export interface AdapterResolutionResult {
  adapter: AgentRuntimeAdapter | null;
  /** Non-null when resolution failed — surface this as a startup config error. */
  error: string | null;
}

/**
 * Resolve an adapter from configuration.
 *
 * Resolution order:
 * 1. `adapterName` (from AGENT_RUNTIME_ADAPTER env var) — explicit wins.
 * 2. Profile-based default: `ci-test` → `null`, everything else → `log-only`.
 *
 * If `adapterName` is set but not registered, the error is returned so the
 * caller can fail at startup (config validation time), NOT at first invocation.
 *
 * @param config.adapterName - AGENT_RUNTIME_ADAPTER value (may be undefined).
 * @param config.profile     - Detected runtime profile (may be undefined).
 * @param config.registry    - Registry to resolve from (defaults to DEFAULT_REGISTRY).
 */
export function resolveAdapter(config: {
  adapterName?: string;
  profile?: string;
  registry?: AdapterRegistry;
}): AdapterResolutionResult {
  return resolveAdapterSelection<AgentRuntimeAdapter>({
    adapterName: config.adapterName,
    profile: config.profile,
    registry: config.registry ?? DEFAULT_REGISTRY,
  });
}
