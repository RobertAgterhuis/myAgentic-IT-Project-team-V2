// Copyright (c) 2026 Robert Agterhuis. MIT License.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { LLMMessage, TokenUsage } from '../sdlc/adapters/contracts/llm-provider.js';

export interface FinopsExecutionContext {
  agentId: string;
  executionPolicy?: 'standard' | 'fast-path';
  workspaceId?: string | null;
  sessionState?: unknown;
  state?: string;
}

export interface FinopsRouteDecision {
  provider: string;
  model: string;
  fallbackProviders: string[];
  tier: 'economy' | 'balanced' | 'premium';
  reason: string;
}

export interface BudgetGateResult {
  allowed: boolean;
  reason?: string;
  sessionId: string;
  workflowId: string;
}

export interface FinopsBudgetEstimate {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface RetryGovernorDecision {
  maxValidationRetries: number;
  maxToolRounds: number;
  maxToolCallsPerRound: number;
  reason: string;
}

interface FinopsUsageRecord {
  timestamp: string;
  sessionId: string;
  workflowId: string;
  costCenter: string;
  workspaceId: string;
  state: string;
  agentId: string;
  provider: string;
  model: string;
  featureLane: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

interface FinopsCacheEntry {
  key: string;
  createdAt: string;
  response: {
    content: string;
    model: string;
    finishReason: string;
    deliverableQuality?: {
      score: number;
      approvalSignal: 'approve' | 'review' | 'block';
      summary: string;
      metrics: Array<{
        id: 'contract' | 'sections' | 'checklist' | 'evidence' | 'depth' | 'novelty';
        label: string;
        score: number;
        detail: string;
      }>;
    };
  };
}

interface FinopsLedger {
  version: 1;
  usage: FinopsUsageRecord[];
  completionCache: Record<string, FinopsCacheEntry>;
}

export type AttributionDimension =
  | 'agentId'
  | 'provider'
  | 'model'
  | 'featureLane'
  | 'sessionId'
  | 'workflowId'
  | 'costCenter';

export interface AttributionSummary {
  month: string;
  dimension: AttributionDimension;
  totals: {
    totalCostUsd: number;
    totalTokens: number;
    records: number;
  };
  buckets: Array<{
    key: string;
    costUsd: number;
    totalTokens: number;
    records: number;
  }>;
}

interface FinopsBudgetCeilings {
  sessionTokenLimit: number;
  workflowTokenLimit: number;
  sessionCostLimitUsd: number;
  workflowCostLimitUsd: number;
}

const DEFAULT_LEDGER_PATH = path.resolve(
  process.cwd(),
  'BusinessDocs',
  'session',
  'finops-ledger.json'
);

const DEFAULT_CEILINGS: FinopsBudgetCeilings = {
  sessionTokenLimit: Number(process.env.FINOPS_SESSION_TOKEN_BUDGET || 120_000),
  workflowTokenLimit: Number(process.env.FINOPS_WORKFLOW_TOKEN_BUDGET || 400_000),
  sessionCostLimitUsd: Number(process.env.FINOPS_SESSION_COST_BUDGET_USD || 4),
  workflowCostLimitUsd: Number(process.env.FINOPS_WORKFLOW_COST_BUDGET_USD || 12),
};

// Cost is estimated from token usage only and tuned conservatively for gating.
const USD_PER_1K_TOKENS: Record<string, number> = {
  'copilot-chat': 0.003,
  'gpt-4o-mini': 0.004,
  'gpt-4o': 0.02,
  'claude-3-5-sonnet': 0.018,
};

function toFinitePositive(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function normalizeId(value: unknown, fallback: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || fallback;
}

function resolveSessionId(context: FinopsExecutionContext): string {
  const state =
    context.sessionState && typeof context.sessionState === 'object'
      ? (context.sessionState as Record<string, unknown>)
      : {};

  return (
    normalizeId(state.session_id, '') ||
    normalizeId(state.id, '') ||
    normalizeId(state.sessionId, '') ||
    normalizeId(context.workspaceId, 'default-session')
  );
}

function resolveWorkflowId(context: FinopsExecutionContext): string {
  const state =
    context.sessionState && typeof context.sessionState === 'object'
      ? (context.sessionState as Record<string, unknown>)
      : {};

  return (
    normalizeId(state.mode, '') ||
    normalizeId(state.command, '') ||
    normalizeId(state.execution_mode, '') ||
    normalizeId(state.cycle_type, '') ||
    'default-workflow'
  );
}

function resolveFeatureLane(context: FinopsExecutionContext): string {
  if (context.state && context.state.trim()) return context.state.trim();
  return context.executionPolicy === 'fast-path' ? 'fast-path' : 'standard';
}

function resolveCostCenter(context: FinopsExecutionContext): string {
  const state =
    context.sessionState && typeof context.sessionState === 'object'
      ? (context.sessionState as Record<string, unknown>)
      : {};
  return (
    normalizeId(state.cost_center, '') ||
    normalizeId(state.costCenter, '') ||
    normalizeId(state.team, '') ||
    normalizeId(context.workspaceId, 'default-cost-center')
  );
}

function monthKeyFromIso(isoTimestamp: string): string {
  if (!isoTimestamp) return 'unknown-month';
  const parsed = new Date(isoTimestamp);
  if (!Number.isFinite(+parsed)) return 'unknown-month';
  return parsed.toISOString().slice(0, 7);
}

function readLedger(filePath: string): FinopsLedger {
  if (!existsSync(filePath)) {
    return {
      version: 1,
      usage: [],
      completionCache: {},
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<FinopsLedger>;
    return {
      version: 1,
      usage: Array.isArray(parsed.usage) ? parsed.usage : [],
      completionCache:
        parsed.completionCache && typeof parsed.completionCache === 'object'
          ? parsed.completionCache
          : {},
    };
  } catch {
    return {
      version: 1,
      usage: [],
      completionCache: {},
    };
  }
}

function writeLedger(filePath: string, ledger: FinopsLedger): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(ledger, null, 2), 'utf8');
}

function estimateCostUsd(model: string, usage: { totalTokens: number }): number {
  const key = (model || '').trim().toLowerCase();
  const per1k = USD_PER_1K_TOKENS[key] ?? 0.008;
  const usd = (usage.totalTokens / 1000) * per1k;
  return Math.round(usd * 10000) / 10000;
}

function aggregate(ledger: FinopsLedger, sessionId: string, workflowId: string) {
  let sessionTokens = 0;
  let workflowTokens = 0;
  let sessionCostUsd = 0;
  let workflowCostUsd = 0;

  for (const row of ledger.usage) {
    if (row.sessionId === sessionId) {
      sessionTokens += row.totalTokens || 0;
      sessionCostUsd += row.costUsd || 0;
    }
    if (row.workflowId === workflowId) {
      workflowTokens += row.totalTokens || 0;
      workflowCostUsd += row.costUsd || 0;
    }
  }

  return {
    sessionTokens,
    workflowTokens,
    sessionCostUsd,
    workflowCostUsd,
  };
}

function getCeilings(): FinopsBudgetCeilings {
  return {
    sessionTokenLimit: toFinitePositive(
      Number(process.env.FINOPS_SESSION_TOKEN_BUDGET),
      DEFAULT_CEILINGS.sessionTokenLimit
    ),
    workflowTokenLimit: toFinitePositive(
      Number(process.env.FINOPS_WORKFLOW_TOKEN_BUDGET),
      DEFAULT_CEILINGS.workflowTokenLimit
    ),
    sessionCostLimitUsd: toFinitePositive(
      Number(process.env.FINOPS_SESSION_COST_BUDGET_USD),
      DEFAULT_CEILINGS.sessionCostLimitUsd
    ),
    workflowCostLimitUsd: toFinitePositive(
      Number(process.env.FINOPS_WORKFLOW_COST_BUDGET_USD),
      DEFAULT_CEILINGS.workflowCostLimitUsd
    ),
  };
}

function hashDeterministic(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function buildCompletionCacheKey(options: {
  provider: string;
  model: string;
  messages: LLMMessage[];
  maxTokens: number;
  temperature: number;
  policyFingerprint: string;
}): string {
  return hashDeterministic(
    JSON.stringify({
      provider: options.provider,
      model: options.model,
      messages: options.messages,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      policyFingerprint: options.policyFingerprint,
    })
  );
}

export class FinopsGovernor {
  private _ledgerPath: string;

  constructor(ledgerPath: string = DEFAULT_LEDGER_PATH) {
    this._ledgerPath = ledgerPath;
  }

  summarizeAttribution(input: {
    month?: string;
    dimension: AttributionDimension;
    costCenter?: string;
    featureLane?: string;
  }): AttributionSummary {
    const ledger = readLedger(this._ledgerPath);
    const month =
      input.month && /^\d{4}-\d{2}$/.test(input.month)
        ? input.month
        : new Date().toISOString().slice(0, 7);
    const dimension = input.dimension;

    const filtered = ledger.usage.filter((row) => {
      if (monthKeyFromIso(row.timestamp) !== month) return false;
      if (input.costCenter && row.costCenter !== input.costCenter) return false;
      if (input.featureLane && row.featureLane !== input.featureLane) return false;
      return true;
    });

    const grouped = new Map<string, { costUsd: number; totalTokens: number; records: number }>();
    for (const row of filtered) {
      const key = String(row[dimension] || 'unknown');
      const current = grouped.get(key) || { costUsd: 0, totalTokens: 0, records: 0 };
      current.costUsd += row.costUsd || 0;
      current.totalTokens += row.totalTokens || 0;
      current.records += 1;
      grouped.set(key, current);
    }

    const buckets = [...grouped.entries()]
      .map(([key, value]) => ({
        key,
        costUsd: Math.round(value.costUsd * 10000) / 10000,
        totalTokens: value.totalTokens,
        records: value.records,
      }))
      .sort((left, right) => right.costUsd - left.costUsd || left.key.localeCompare(right.key));

    return {
      month,
      dimension,
      totals: {
        totalCostUsd:
          Math.round(filtered.reduce((sum, row) => sum + (row.costUsd || 0), 0) * 10000) / 10000,
        totalTokens: filtered.reduce((sum, row) => sum + (row.totalTokens || 0), 0),
        records: filtered.length,
      },
      buckets,
    };
  }

  getBudgetEstimate(
    model: string,
    promptTokens: number,
    maxCompletionTokens: number
  ): FinopsBudgetEstimate {
    const estimate = {
      promptTokens: Math.max(0, Math.round(promptTokens)),
      completionTokens: Math.max(0, Math.round(maxCompletionTokens)),
      totalTokens: Math.max(0, Math.round(promptTokens + maxCompletionTokens)),
      estimatedCostUsd: 0,
    };

    estimate.estimatedCostUsd = estimateCostUsd(model, { totalTokens: estimate.totalTokens });
    return estimate;
  }

  deriveRetryGovernor(
    context: FinopsExecutionContext,
    requestedValidationRetries: number
  ): RetryGovernorDecision {
    const ledger = readLedger(this._ledgerPath);
    const sessionId = resolveSessionId(context);
    const workflowId = resolveWorkflowId(context);
    const totals = aggregate(ledger, sessionId, workflowId);
    const ceilings = getCeilings();

    const sessionTokenUtilization =
      ceilings.sessionTokenLimit > 0 ? totals.sessionTokens / ceilings.sessionTokenLimit : 0;
    const workflowTokenUtilization =
      ceilings.workflowTokenLimit > 0 ? totals.workflowTokens / ceilings.workflowTokenLimit : 0;
    const tokenUtilization = Math.max(sessionTokenUtilization, workflowTokenUtilization);

    if (tokenUtilization >= 0.8) {
      return {
        maxValidationRetries: 0,
        maxToolRounds: 2,
        maxToolCallsPerRound: 3,
        reason: 'high budget utilization (>=80%); applying strict retry/fanout governor',
      };
    }

    if (tokenUtilization >= 0.6) {
      return {
        maxValidationRetries: Math.min(1, Math.max(0, requestedValidationRetries)),
        maxToolRounds: 3,
        maxToolCallsPerRound: 4,
        reason: 'elevated budget utilization (>=60%); limiting retries and tool fanout',
      };
    }

    if (context.executionPolicy === 'fast-path') {
      return {
        maxValidationRetries: Math.min(1, Math.max(0, requestedValidationRetries)),
        maxToolRounds: 3,
        maxToolCallsPerRound: 4,
        reason: 'fast-path execution policy prefers lower-cost bounded retries',
      };
    }

    return {
      maxValidationRetries: Math.max(0, requestedValidationRetries),
      maxToolRounds: 4,
      maxToolCallsPerRound: 6,
      reason: 'standard retry and fanout limits applied',
    };
  }

  enforceBudget(context: FinopsExecutionContext, estimate: FinopsBudgetEstimate): BudgetGateResult {
    const ledger = readLedger(this._ledgerPath);
    const sessionId = resolveSessionId(context);
    const workflowId = resolveWorkflowId(context);
    const totals = aggregate(ledger, sessionId, workflowId);
    const ceilings = getCeilings();

    if (totals.sessionTokens + estimate.totalTokens > ceilings.sessionTokenLimit) {
      return {
        allowed: false,
        reason: `BUDGET_BLOCKED_SESSION_TOKEN_LIMIT: projected session tokens ${totals.sessionTokens + estimate.totalTokens} exceed limit ${ceilings.sessionTokenLimit}`,
        sessionId,
        workflowId,
      };
    }

    if (totals.workflowTokens + estimate.totalTokens > ceilings.workflowTokenLimit) {
      return {
        allowed: false,
        reason: `BUDGET_BLOCKED_WORKFLOW_TOKEN_LIMIT: projected workflow tokens ${totals.workflowTokens + estimate.totalTokens} exceed limit ${ceilings.workflowTokenLimit}`,
        sessionId,
        workflowId,
      };
    }

    if (totals.sessionCostUsd + estimate.estimatedCostUsd > ceilings.sessionCostLimitUsd) {
      return {
        allowed: false,
        reason: `BUDGET_BLOCKED_SESSION_COST_LIMIT: projected session cost $${(totals.sessionCostUsd + estimate.estimatedCostUsd).toFixed(4)} exceeds limit $${ceilings.sessionCostLimitUsd.toFixed(4)}`,
        sessionId,
        workflowId,
      };
    }

    if (totals.workflowCostUsd + estimate.estimatedCostUsd > ceilings.workflowCostLimitUsd) {
      return {
        allowed: false,
        reason: `BUDGET_BLOCKED_WORKFLOW_COST_LIMIT: projected workflow cost $${(totals.workflowCostUsd + estimate.estimatedCostUsd).toFixed(4)} exceeds limit $${ceilings.workflowCostLimitUsd.toFixed(4)}`,
        sessionId,
        workflowId,
      };
    }

    return {
      allowed: true,
      sessionId,
      workflowId,
    };
  }

  recordUsage(
    context: FinopsExecutionContext,
    attribution: { provider: string; model: string },
    usage: TokenUsage
  ): void {
    const ledger = readLedger(this._ledgerPath);
    const sessionId = resolveSessionId(context);
    const workflowId = resolveWorkflowId(context);

    ledger.usage.push({
      timestamp: new Date().toISOString(),
      sessionId,
      workflowId,
      costCenter: resolveCostCenter(context),
      workspaceId: normalizeId(context.workspaceId, 'default-workspace'),
      state: normalizeId(context.state, 'UNKNOWN'),
      agentId: normalizeId(context.agentId, 'unknown-agent'),
      provider: attribution.provider,
      model: attribution.model,
      featureLane: resolveFeatureLane(context),
      promptTokens: usage.promptTokens || 0,
      completionTokens: usage.completionTokens || 0,
      totalTokens: usage.totalTokens || 0,
      costUsd: estimateCostUsd(attribution.model, { totalTokens: usage.totalTokens || 0 }),
    });

    // Keep ledger bounded while preserving recent spend visibility.
    if (ledger.usage.length > 5000) {
      ledger.usage = ledger.usage.slice(-5000);
    }

    writeLedger(this._ledgerPath, ledger);
  }

  resolveRoute(context: FinopsExecutionContext): FinopsRouteDecision {
    const policy = context.executionPolicy || 'standard';
    if (policy === 'fast-path') {
      return {
        provider: 'copilot',
        model: 'copilot-chat',
        fallbackProviders: ['openai', 'anthropic', 'local'],
        tier: 'economy',
        reason: 'fast-path execution policy selected economy model tier',
      };
    }

    return {
      provider: 'openai',
      model: 'gpt-4o',
      fallbackProviders: ['copilot', 'anthropic', 'local'],
      tier: 'balanced',
      reason: 'standard execution policy selected balanced model tier',
    };
  }

  getCachedCompletion(key: string): FinopsCacheEntry | null {
    const ledger = readLedger(this._ledgerPath);
    const cached = ledger.completionCache[key];
    return cached || null;
  }

  putCachedCompletion(
    key: string,
    response: {
      content: string;
      model: string;
      finishReason: string;
      deliverableQuality?: {
        score: number;
        approvalSignal: 'approve' | 'review' | 'block';
        summary: string;
        metrics: Array<{
          id: 'contract' | 'sections' | 'checklist' | 'evidence' | 'depth' | 'novelty';
          label: string;
          score: number;
          detail: string;
        }>;
      };
    }
  ): void {
    const ledger = readLedger(this._ledgerPath);
    ledger.completionCache[key] = {
      key,
      createdAt: new Date().toISOString(),
      response,
    };

    const keys = Object.keys(ledger.completionCache);
    if (keys.length > 1000) {
      const sorted = keys.sort(
        (left, right) =>
          +new Date(ledger.completionCache[left].createdAt) -
          +new Date(ledger.completionCache[right].createdAt)
      );
      const removeCount = keys.length - 1000;
      for (let index = 0; index < removeCount; index += 1) {
        delete ledger.completionCache[sorted[index]];
      }
    }

    writeLedger(this._ledgerPath, ledger);
  }
}
