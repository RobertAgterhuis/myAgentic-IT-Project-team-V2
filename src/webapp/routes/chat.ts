// Copyright (c) 2026 Robert Agterhuis. MIT License.

import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ServerContext } from '../context';
import { errorResponse } from '../utils/errors';
import { ChatService, type ProposedAction } from '../services/chat-service';
import { ContextAssembler } from '../services/chat/context-assembler';
import {
  RagGroundingService,
  resolveGroundingCollectionId,
  type ChatGroundingIntent,
} from '../services/rag-grounding-service';
import type { ChatIntent } from '../services/chat/intent-classifier';
import {
  CommandService,
  GovernanceService,
  ServiceNotAvailableError,
  ServiceValidationError,
  toServiceContext,
} from '../services';
import * as RS from '../route-schemas';

type ChatActionType = 'create_command' | 'approve' | 'reject' | 'resume' | 'pause' | 'open_screen';

type ChatMilestoneIntent =
  | 'gate_explain'
  | 'next_action'
  | 'session_summary'
  | 'approval_action'
  | 'general';

type GateFailureContext = {
  gateId: string;
  unmetCriteria: string[];
};

type LatestRunContext = {
  startedAt: string | null;
  endedAt: string | null;
  status: string | null;
  failedGate: GateFailureContext | null;
};

type GroundingFallbackReason =
  | 'services_unavailable'
  | 'no_matches'
  | 'low_confidence'
  | 'missing_required_citations';

type ChatGroundingSummary = {
  enabled: boolean;
  degraded: boolean;
  workspace_id: string;
  requested_intent: ChatGroundingIntent | null;
  collection_ids: string[];
  citation_count: number;
  top_score: number;
  fallback_reason: GroundingFallbackReason | null;
};

const CHAT_GROUNDING_THRESHOLD = Number(process.env.CHAT_GROUNDING_THRESHOLD ?? '0.12');
const CHAT_GROUNDING_TOPK = Number(process.env.CHAT_GROUNDING_TOPK ?? '4');
const CHAT_AUTO_REFRESH_COOLDOWN_MS = Number(
  process.env.CHAT_GROUNDING_REFRESH_COOLDOWN_MS ?? '60000'
);

const groundingRefreshState = new Map<string, number>();

function makeActionId(type: ChatActionType): string {
  return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function resolveMilestoneIntent(message: string, contextHints: string[]): ChatMilestoneIntent {
  const normalized = `${message} ${contextHints.join(' ')}`.toLowerCase();

  if (/why.*gate.*fail|gate.*failed|critic gate|unmet criteria|rerun gate/.test(normalized)) {
    return 'gate_explain';
  }
  if (/what should i do next|next step|next action/.test(normalized)) {
    return 'next_action';
  }
  if (/summari[sz]e current session|session summary|summari[sz]e.*session/.test(normalized)) {
    return 'session_summary';
  }
  if (/what approvals are pending|pending approvals|approval action/.test(normalized)) {
    return 'approval_action';
  }

  return 'general';
}

function readLatestRunContext(ctx: ServerContext): LatestRunContext {
  const businessDocsRoot = ctx.BUSINESS_DOCS || path.join(ctx.PROJECT_ROOT, 'BusinessDocs');
  const runHistoryPath = path.join(businessDocsRoot, 'session', 'run-history.json');
  if (!fs.existsSync(runHistoryPath)) {
    return { startedAt: null, endedAt: null, status: null, failedGate: null };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(runHistoryPath, 'utf8')) as Array<
      Record<string, unknown>
    >;
    const latest = Array.isArray(raw) && raw.length > 0 ? raw[raw.length - 1] : null;
    if (!latest || typeof latest !== 'object') {
      return { startedAt: null, endedAt: null, status: null, failedGate: null };
    }

    const gateResults =
      latest.gate_results && typeof latest.gate_results === 'object'
        ? (latest.gate_results as Record<string, unknown>)
        : {};

    let failedGate: GateFailureContext | null = null;
    for (const [gateId, value] of Object.entries(gateResults)) {
      if (!value || typeof value !== 'object') continue;
      const row = value as Record<string, unknown>;
      const verdict = String(row.verdict || row.status || '').toUpperCase();
      const isFailed = verdict === 'FAILED' || row.passed === false;
      if (!isFailed) continue;

      const unmet = Array.isArray(row.unmet_criteria)
        ? row.unmet_criteria.map((entry) => String(entry))
        : Array.isArray(row.failures)
          ? row.failures.map((entry) => String(entry))
          : Array.isArray(row.reasons)
            ? row.reasons.map((entry) => String(entry))
            : [];

      failedGate = {
        gateId,
        unmetCriteria: unmet.slice(0, 5),
      };
      break;
    }

    return {
      startedAt: typeof latest.started_at === 'string' ? latest.started_at : null,
      endedAt: typeof latest.ended_at === 'string' ? latest.ended_at : null,
      status: typeof latest.status === 'string' ? latest.status : null,
      failedGate,
    };
  } catch {
    return { startedAt: null, endedAt: null, status: null, failedGate: null };
  }
}

function formatElapsed(startedAt: string | null): string {
  if (!startedAt) return 'n/a';
  const ms = Date.now() - Date.parse(startedAt);
  if (!Number.isFinite(ms) || ms < 0) return 'n/a';
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} minute(s)`;
  const hours = (minutes / 60).toFixed(1);
  return `${hours} hour(s)`;
}

function buildGateExplainer(input: {
  failedGate: GateFailureContext | null;
  snapshotStatus: string;
}): { message: string; actions: ProposedAction[] } {
  if (!input.failedGate) {
    return {
      message:
        'No failed gate details were found in the latest run context. If you just retried, open Pipeline to inspect the latest gate verdict.',
      actions: [
        {
          id: makeActionId('open_screen'),
          label: 'Open pipeline status',
          type: 'open_screen',
          payload: { target: '/pipeline' },
          requires_confirmation: false,
        },
      ],
    };
  }

  const unmet =
    input.failedGate.unmetCriteria.length > 0
      ? input.failedGate.unmetCriteria.map((item) => `- ${item}`).join('\n')
      : '- No explicit unmet criteria were recorded in gate_results.';

  return {
    message:
      `Gate ${input.failedGate.gateId} is currently blocking progress (session status: ${input.snapshotStatus}).\n` +
      `Unmet criteria:\n${unmet}\n` +
      'I can queue a gate recheck run after you resolve the criteria.',
    actions: [
      {
        id: makeActionId('create_command'),
        label: 'Re-run gate checks',
        type: 'create_command',
        payload: {
          command: 'RECHECK GATES',
          description: `Re-run gate checks for ${input.failedGate.gateId}`,
          scope: 'chat-gate-explainer',
        },
        requires_confirmation: true,
      },
      {
        id: makeActionId('open_screen'),
        label: 'Open pipeline status',
        type: 'open_screen',
        payload: { target: '/pipeline' },
        requires_confirmation: false,
      },
    ],
  };
}

function buildNextActionGuidance(input: {
  sessionStatus: string;
  currentPhase: string;
  pendingApprovals: number;
  failedGate: GateFailureContext | null;
}): { message: string; actions: ProposedAction[] } {
  const status = input.sessionStatus.toUpperCase();

  if (input.pendingApprovals > 0) {
    return {
      message: `There are ${input.pendingApprovals} pending approval(s). Your next best step is to resolve approvals before advancing.`,
      actions: [
        {
          id: makeActionId('open_screen'),
          label: 'Open approval center',
          type: 'open_screen',
          payload: { target: '/approvals' },
          requires_confirmation: false,
        },
      ],
    };
  }

  if (status === 'PAUSED') {
    return {
      message:
        'The run is paused. Resume it to continue the current phase or open Commands to abandon and restart.',
      actions: [
        {
          id: makeActionId('resume'),
          label: 'Resume current run',
          type: 'resume',
          payload: { command: 'CONTINUE' },
          requires_confirmation: false,
        },
        {
          id: makeActionId('open_screen'),
          label: 'Open commands',
          type: 'open_screen',
          payload: { target: '/commands' },
          requires_confirmation: false,
        },
      ],
    };
  }

  if (input.failedGate) {
    return {
      message: `The run is blocked at ${input.failedGate.gateId}. Resolve unmet criteria first, then rerun gate checks.`,
      actions: [
        {
          id: makeActionId('create_command'),
          label: 'Re-run gate checks',
          type: 'create_command',
          payload: {
            command: 'RECHECK GATES',
            description: `Re-run blocked gate ${input.failedGate.gateId}`,
            scope: 'chat-next-action',
          },
          requires_confirmation: true,
        },
        {
          id: makeActionId('open_screen'),
          label: 'Open pipeline status',
          type: 'open_screen',
          payload: { target: '/pipeline' },
          requires_confirmation: false,
        },
      ],
    };
  }

  if (status === 'COMPLETED' || status === 'COMPLETE') {
    return {
      message: `Phase ${input.currentPhase || 'current'} is complete. Submit/advance to the next phase when you are ready.`,
      actions: [
        {
          id: makeActionId('create_command'),
          label: 'Advance to next phase',
          type: 'create_command',
          payload: {
            command: 'CONTINUE',
            description: 'Advance to next phase from chat copilot',
            scope: 'chat-next-action',
          },
          requires_confirmation: true,
        },
      ],
    };
  }

  if (status === 'IDLE' || status === 'STOPPED' || status === 'NOT_STARTED') {
    return {
      message:
        'No active session is running. Start from Commands to launch CREATE, FEATURE, or AUDIT flow.',
      actions: [
        {
          id: makeActionId('open_screen'),
          label: 'Open commands',
          type: 'open_screen',
          payload: { target: '/commands' },
          requires_confirmation: false,
        },
      ],
    };
  }

  return {
    message: `Continue the active session in phase ${input.currentPhase || 'n/a'} and monitor blockers in Pipeline.`,
    actions: [
      {
        id: makeActionId('open_screen'),
        label: 'Open pipeline status',
        type: 'open_screen',
        payload: { target: '/pipeline' },
        requires_confirmation: false,
      },
    ],
  };
}

function buildSessionSummary(input: {
  sessionStatus: string;
  currentPhase: string;
  pendingApprovals: number;
  failedGate: GateFailureContext | null;
  elapsed: string;
}): string {
  const blockers: string[] = [];
  if (input.pendingApprovals > 0) blockers.push(`${input.pendingApprovals} pending approval(s)`);
  if (input.failedGate) blockers.push(`blocked gate ${input.failedGate.gateId}`);

  return [
    `Current session summary:`,
    `- Status: ${input.sessionStatus}`,
    `- Current phase: ${input.currentPhase || 'n/a'}`,
    `- Elapsed time: ${input.elapsed}`,
    `- Blocking items: ${blockers.length > 0 ? blockers.join('; ') : 'none'}`,
    `- Risk flags: ${input.failedGate ? 'gate failure risk active' : 'no explicit gate failure risk detected'}`,
  ].join('\n');
}

function buildApprovalActions(approvals: Array<{ id: string }>): ProposedAction[] {
  const actions: ProposedAction[] = [
    {
      id: makeActionId('open_screen'),
      label: 'Open approval center',
      type: 'open_screen',
      payload: { target: '/approvals' },
      requires_confirmation: false,
    },
  ];

  for (const approval of approvals.slice(0, 3)) {
    actions.push({
      id: makeActionId('approve'),
      label: `Approve ${approval.id}`,
      type: 'approve',
      payload: {
        approval_id: approval.id,
        reason: 'Approved via chat pending-approval action',
        user: 'chat-user',
      },
      requires_confirmation: true,
    });
    actions.push({
      id: makeActionId('reject'),
      label: `Reject ${approval.id}`,
      type: 'reject',
      payload: {
        approval_id: approval.id,
        reason: 'Rejected via chat pending-approval action',
        user: 'chat-user',
      },
      requires_confirmation: true,
    });
  }

  return actions;
}

function parseWorkspaceId(value: unknown): string {
  const raw = String(value || '').trim();
  return raw.length > 0 ? raw : 'default';
}

function resolveGroundingIntent(input: {
  intent: ChatIntent;
  message: string;
  contextHints: string[];
}): ChatGroundingIntent | null {
  const normalized = `${input.message} ${input.contextHints.join(' ')}`.toLowerCase();

  if (input.intent === 'workspace_navigation') return 'workspace_query';
  if (input.intent === 'approval_guidance') return 'decision_lookup';

  if (
    /(decision|policy|approval|override|governance|exception|precedent|similar decision)/.test(
      normalized
    )
  ) {
    return 'decision_lookup';
  }

  if (/(workspace|repo|repository|codebase|source|implementation|module)/.test(normalized)) {
    return 'workspace_query';
  }

  if (/(artifact|phase|summary|session|gate|history|report|status)/.test(normalized)) {
    return 'artifact_query';
  }

  return null;
}

function requiresStrictGrounding(intent: ChatIntent, message: string): boolean {
  if (intent === 'approval_guidance' || intent === 'workspace_navigation') {
    return true;
  }

  const normalized = message.toLowerCase();
  return /(policy|approval|override|governance|decision|architecture|security)/.test(normalized);
}

function fallbackMessage(reason: GroundingFallbackReason): string {
  if (reason === 'services_unavailable') {
    return 'Grounding services are currently unavailable, so I cannot provide a reliable cited answer right now. Please retry in a moment or refine your question to a specific artifact path.';
  }
  if (reason === 'low_confidence') {
    return 'I found potentially related context, but confidence is too low for a safe recommendation. Please narrow the question (for example: specific workspace, phase, or artifact).';
  }
  if (reason === 'missing_required_citations') {
    return 'I cannot provide this guidance without supporting citations. Please ask for a narrower scope so I can return grounded references.';
  }
  return 'I could not find grounded context for this request yet. Please provide more specific details (workspace, phase, or artifact) and try again.';
}

function resolveRefreshTargets(
  ctx: ServerContext,
  intent: ChatGroundingIntent,
  workspaceId: string
): Array<{ collectionId: string; path: string }> {
  const businessDocs = path.join(ctx.PROJECT_ROOT, 'BusinessDocs');

  if (intent === 'decision_lookup') {
    return [
      {
        collectionId: resolveGroundingCollectionId('decisions', workspaceId),
        path: path.join(businessDocs, 'decisions.md'),
      },
      {
        collectionId: resolveGroundingCollectionId('decisions', workspaceId),
        path: path.join(businessDocs, 'decisions'),
      },
    ];
  }

  if (intent === 'workspace_query') {
    return [
      {
        collectionId: resolveGroundingCollectionId('codebase', workspaceId),
        path: path.join(ctx.PROJECT_ROOT, 'src'),
      },
    ];
  }

  return [
    {
      collectionId: resolveGroundingCollectionId('phase-outputs', workspaceId),
      path: path.join(businessDocs, 'Phase1-Business'),
    },
    {
      collectionId: resolveGroundingCollectionId('phase-outputs', workspaceId),
      path: path.join(businessDocs, 'Phase2-Tech'),
    },
    {
      collectionId: resolveGroundingCollectionId('phase-outputs', workspaceId),
      path: path.join(businessDocs, 'Phase3-UX'),
    },
    {
      collectionId: resolveGroundingCollectionId('phase-outputs', workspaceId),
      path: path.join(businessDocs, 'session'),
    },
    {
      collectionId: resolveGroundingCollectionId('phase-outputs', workspaceId),
      path: path.join(businessDocs, 'synthesis'),
    },
  ];
}

async function triggerGroundingRefreshOnMiss(input: {
  ctx: ServerContext;
  intent: ChatGroundingIntent | null;
  workspaceId: string;
}): Promise<boolean> {
  const { ctx, intent, workspaceId } = input;
  if (!intent) return false;
  if (!ctx._ragIndexer) return false;

  const targets = resolveRefreshTargets(ctx, intent, workspaceId);
  const now = Date.now();

  let triggered = false;
  for (const target of targets) {
    const key = `${target.collectionId}::${target.path}`;
    const lastRun = groundingRefreshState.get(key) || 0;
    if (now - lastRun < CHAT_AUTO_REFRESH_COOLDOWN_MS) {
      continue;
    }

    groundingRefreshState.set(key, now);
    triggered = true;

    setImmediate(() => {
      void ctx._ragIndexer
        ?.syncDirectory(target.collectionId, target.path, { incremental: true })
        .then((stats) => {
          ctx.recordMetric('CHAT', '/grounding/refresh/success', stats.filesProcessed, 200);
          ctx.sseNotify('message', {
            type: 'chat_grounding_refresh_completed',
            collection_id: target.collectionId,
            path: target.path,
            files_processed: stats.filesProcessed,
            files_skipped: stats.filesSkipped,
            chunks_inserted: stats.chunksInserted,
            timestamp: new Date().toISOString(),
          });
        })
        .catch(() => {
          ctx.recordMetric('CHAT', '/grounding/refresh/failure', 1, 500);
        });
    });
  }

  return triggered;
}

function resolveCitationLink(sourcePath: string): string {
  const normalized = sourcePath.replace(/\\/g, '/');
  if (normalized.includes('BusinessDocs/decisions')) return '/decisions';
  if (normalized.includes('BusinessDocs/session')) return '/sessions';
  if (normalized.includes('BusinessDocs')) return '/artifacts';
  if (normalized.includes('src/')) return '/workspaces';
  return '/artifacts';
}

function resolveCitationSourceType(
  sourcePath: string
): 'artifact' | 'decision' | 'policy' | 'session' | 'rag_chunk' {
  const normalized = sourcePath.replace(/\\/g, '/').toLowerCase();
  if (normalized.includes('decisions')) return 'decision';
  if (normalized.includes('policy')) return 'policy';
  if (normalized.includes('session')) return 'session';
  if (normalized.includes('businessdocs')) return 'artifact';
  return 'rag_chunk';
}

function streamTokens(ctx: ServerContext, sessionId: string, text: string): void {
  const parts = text.split(/(\s+)/).filter((part) => part.length > 0);
  parts.forEach((token, index) => {
    setTimeout(() => {
      ctx.sseNotify('message', {
        type: 'chat_token',
        session_id: sessionId,
        token,
        index,
        timestamp: new Date().toISOString(),
      });

      if (index === parts.length - 1) {
        ctx.sseNotify('message', {
          type: 'chat_stream_complete',
          session_id: sessionId,
          timestamp: new Date().toISOString(),
        });
      }
    }, index * 18);
  });
}

function ensureOperatorOrAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  ctx: ServerContext
): boolean {
  if (!ctx._authMiddleware) return true;

  const user = (request.raw as FastifyRequest['raw'] & { user?: { role?: string } }).user;
  if (!user) {
    reply.code(401).send(errorResponse('UNAUTHORIZED', 'Authentication required'));
    return false;
  }

  const role = user.role || 'viewer';
  if (role !== 'operator' && role !== 'admin') {
    reply.code(403).send(errorResponse('FORBIDDEN', 'Operator or admin role required'));
    return false;
  }

  return true;
}

function summarizeGrounding(
  intent: ChatGroundingIntent,
  resultCount: number,
  collection: string
): string {
  if (resultCount === 0) {
    return `No grounded results found for ${intent} in ${collection}.`;
  }

  return `Found ${resultCount} grounded result${resultCount === 1 ? '' : 's'} for ${intent} in ${collection}.`;
}

function resolveChatSessionId(request: FastifyRequest): string {
  const body = request.body as { session_id?: string } | undefined;
  if (typeof body?.session_id === 'string' && body.session_id.trim().length > 0) {
    return body.session_id;
  }

  const headerValue = request.headers['x-session-id'];
  const headerSessionId =
    typeof headerValue === 'string'
      ? headerValue
      : Array.isArray(headerValue)
        ? headerValue[0]
        : undefined;
  if (headerSessionId && headerSessionId.trim().length > 0) {
    return headerSessionId;
  }

  const rawUser = (
    request.raw as FastifyRequest['raw'] & { user?: { login?: string; id?: number } }
  ).user;
  if (rawUser?.login) return `user-${rawUser.login}`;
  if (typeof rawUser?.id === 'number') return `user-${rawUser.id}`;
  return 'default';
}

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const chatService = new ChatService({
    projectRoot: ctx.PROJECT_ROOT,
    sessionDir: path.relative(ctx.PROJECT_ROOT, ctx.SESSION_DIR),
  });
  const commandService = new CommandService(
    toServiceContext(ctx as unknown as Record<string, unknown>)
  );
  const governanceService = new GovernanceService(
    toServiceContext(ctx as unknown as Record<string, unknown>),
    {
      getEngine: ctx._getEngine as (() => unknown) | undefined,
    }
  );
  const contextAssembler = new ContextAssembler({
    projectRoot: ctx.PROJECT_ROOT,
    resolveSessionFile: () => ctx.resolveSessionFile(),
    getHumanOverrideEvents: ctx._getHumanOverrideEvents,
  });
  const grounding = new RagGroundingService({
    projectRoot: ctx.PROJECT_ROOT,
    ragStore: ctx._ragStore,
    embeddingProvider: ctx._embeddingProvider,
  });

  app.post<{
    Body: {
      message: string;
      context_hints?: string[];
      session_id?: string;
      workspace_id?: string;
      topK?: number;
      threshold?: number;
    };
  }>('/api/v1/chat/message', { schema: RS.chatMessage }, async (request, reply) => {
    if (!ensureOperatorOrAdmin(request, reply, ctx)) return;

    const message = request.body.message.trim();
    if (!message) {
      return reply.code(400).send(errorResponse('INVALID_INPUT', 'Message is required'));
    }

    const sessionId = resolveChatSessionId(request);
    const existingHistory = chatService.getHistory({ sessionId, limit: 1 });
    const assembled = contextAssembler.assemble();
    const contextHints = request.body.context_hints || [];
    const workspaceId = parseWorkspaceId(request.body.workspace_id);
    const requestStartedAt = Date.now();
    const runContext = readLatestRunContext(ctx);
    const milestoneIntent = resolveMilestoneIntent(message, contextHints);

    let groundingIntent: ChatGroundingIntent | null = null;
    let groundingCitationCount = 0;
    let groundingTopScore = 0;
    let fallbackReason: GroundingFallbackReason | null = null;
    let groundingCollectionIds: string[] = [];
    let indexRefreshTriggered = false;

    const preClassifiedIntent = (() => {
      const normalized = `${message} ${contextHints.join(' ')}`.toLowerCase();
      if (/(approval|override|exception|policy)/.test(normalized)) return 'approval_guidance';
      if (/(workspace|repo|repository|codebase)/.test(normalized)) return 'workspace_navigation';
      if (/(status|session|phase|gate|pipeline)/.test(normalized)) return 'session_status';
      return 'general_assist';
    })() as ChatIntent;

    const strictGrounding = requiresStrictGrounding(preClassifiedIntent, message);

    groundingIntent = resolveGroundingIntent({
      intent: preClassifiedIntent,
      message,
      contextHints,
    });

    const topK = Number.isFinite(request.body.topK)
      ? Math.max(1, Math.min(10, Number(request.body.topK)))
      : Math.max(1, Math.min(10, CHAT_GROUNDING_TOPK));
    const threshold = Number.isFinite(request.body.threshold)
      ? Math.max(0, Math.min(1, Number(request.body.threshold)))
      : Math.max(0, Math.min(1, CHAT_GROUNDING_THRESHOLD));

    const chatCitations = [...assembled.citations];

    if (!grounding.hasServices()) {
      if (strictGrounding || groundingIntent) {
        fallbackReason = 'services_unavailable';
      }
    } else if (groundingIntent) {
      const retrievalStartedAt = Date.now();
      const grounded = await grounding.queryIntent(groundingIntent, message, {
        topK,
        threshold,
        workspaceId,
      });
      const retrievalMs = Date.now() - retrievalStartedAt;
      ctx.recordMetric('CHAT', '/grounding/retrieval', retrievalMs, 200);

      groundingCollectionIds = grounded.collections;
      groundingCitationCount = grounded.matches.length;
      groundingTopScore = grounded.matches.reduce(
        (best, match) => (match.score > best ? match.score : best),
        0
      );

      chatCitations.push(
        ...grounded.matches.map((match) => ({
          source_path: match.source_path,
          excerpt: match.text,
          start_line: match.start_line,
          source_type: resolveCitationSourceType(match.source_path),
          deep_link: resolveCitationLink(match.source_path),
        }))
      );

      if (groundingCitationCount === 0) {
        fallbackReason = 'no_matches';
      } else if (groundingTopScore < threshold) {
        fallbackReason = 'low_confidence';
      }
    }

    if (
      fallbackReason === null &&
      (strictGrounding || preClassifiedIntent === 'approval_guidance') &&
      groundingCitationCount === 0
    ) {
      fallbackReason = 'missing_required_citations';
    }

    if (
      groundingIntent &&
      (fallbackReason === 'no_matches' || fallbackReason === 'low_confidence')
    ) {
      indexRefreshTriggered = await triggerGroundingRefreshOnMiss({
        ctx,
        intent: groundingIntent,
        workspaceId,
      });
      if (indexRefreshTriggered) {
        ctx.recordMetric('CHAT', '/grounding/refresh/triggered', 1, 200);
      }
    }

    let assistantMessageOverride = fallbackReason ? fallbackMessage(fallbackReason) : undefined;
    let proposedActionsOverride: ProposedAction[] | undefined;

    const sessionStatus = String(
      assembled.snapshot.sessionStatus || runContext.status || 'UNKNOWN'
    );
    const currentPhase = String(assembled.snapshot.currentPhase || 'n/a');
    const pendingApprovals = Number(assembled.snapshot.pendingApprovals || 0);

    if (!assistantMessageOverride && milestoneIntent === 'gate_explain') {
      const gateExplainer = buildGateExplainer({
        failedGate: runContext.failedGate,
        snapshotStatus: sessionStatus,
      });
      assistantMessageOverride = gateExplainer.message;
      proposedActionsOverride = gateExplainer.actions;
    }

    if (!assistantMessageOverride && milestoneIntent === 'next_action') {
      const nextAction = buildNextActionGuidance({
        sessionStatus,
        currentPhase,
        pendingApprovals,
        failedGate: runContext.failedGate,
      });
      assistantMessageOverride = nextAction.message;
      proposedActionsOverride = nextAction.actions;
    }

    if (!assistantMessageOverride && milestoneIntent === 'session_summary') {
      assistantMessageOverride = buildSessionSummary({
        sessionStatus,
        currentPhase,
        pendingApprovals,
        failedGate: runContext.failedGate,
        elapsed: formatElapsed(runContext.startedAt),
      });
      proposedActionsOverride = [
        {
          id: makeActionId('open_screen'),
          label: 'Open sessions',
          type: 'open_screen',
          payload: { target: '/sessions' },
          requires_confirmation: false,
        },
      ];
    }

    if (!assistantMessageOverride && milestoneIntent === 'approval_action') {
      let approvals: Array<{ id: string }> = [];
      try {
        const listed = governanceService.listApprovals();
        approvals = listed.approvals.map((entry) => ({ id: entry.id }));
      } catch {
        approvals = [];
      }

      if (approvals.length === 0) {
        assistantMessageOverride = 'No pending approvals were found at the moment.';
        proposedActionsOverride = [
          {
            id: makeActionId('open_screen'),
            label: 'Open approval center',
            type: 'open_screen',
            payload: { target: '/approvals' },
            requires_confirmation: false,
          },
        ];
      } else {
        const listed = approvals
          .slice(0, 5)
          .map((entry) => `- ${entry.id}`)
          .join('\n');
        assistantMessageOverride = `Pending approvals:\n${listed}\nUse the action buttons to approve or reject.`;
        proposedActionsOverride = buildApprovalActions(approvals);
      }
    }

    const looksLikeChatOpenPrompt = /^(hi|hello|hey|open chat|status|help)$/i.test(message.trim());
    if (
      !assistantMessageOverride &&
      milestoneIntent === 'general' &&
      existingHistory.length === 0 &&
      runContext.failedGate &&
      looksLikeChatOpenPrompt
    ) {
      const unmetText =
        runContext.failedGate.unmetCriteria.length > 0
          ? runContext.failedGate.unmetCriteria.slice(0, 3).join('; ')
          : 'unmet criteria details are not available';
      assistantMessageOverride =
        `Proactive context: session is blocked at ${runContext.failedGate.gateId}. ` +
        `Reason: ${unmetText}. Ask “why did the gate fail?” for full criteria.`;
      proposedActionsOverride = [
        {
          id: makeActionId('open_screen'),
          label: 'Open pipeline status',
          type: 'open_screen',
          payload: { target: '/pipeline' },
          requires_confirmation: false,
        },
      ];
    }

    const response = chatService.sendMessage({
      sessionId,
      message,
      contextHints,
      contextSnapshot: assembled.snapshot,
      citations: chatCitations,
      assistantMessageOverride,
      suppressActions: Boolean(fallbackReason),
      proposedActionsOverride,
    });

    const firstTokenLatencyMs = Date.now() - requestStartedAt;
    ctx.recordMetric('CHAT', '/message/first-token-latency', firstTokenLatencyMs, 200);
    if (fallbackReason) {
      ctx.recordMetric('CHAT', `/message/fallback/${fallbackReason}`, 1, 200);
    }
    if (groundingCitationCount === 0 && groundingIntent) {
      ctx.recordMetric('CHAT', '/message/no-match', 1, 200);
    }

    streamTokens(ctx, sessionId, response.message.content);

    const groundingSummary: ChatGroundingSummary = {
      enabled: grounding.hasServices(),
      degraded: Boolean(fallbackReason),
      workspace_id: workspaceId,
      requested_intent: groundingIntent,
      collection_ids: groundingCollectionIds,
      citation_count: groundingCitationCount,
      top_score: groundingTopScore,
      fallback_reason: fallbackReason,
    };

    return reply.send({
      ok: true,
      session_id: sessionId,
      index_refresh_triggered: indexRefreshTriggered,
      grounding: groundingSummary,
      ...response,
    });
  });

  app.post<{
    Body: {
      intent: ChatGroundingIntent;
      message: string;
      topK?: number;
      threshold?: number;
    };
  }>('/api/v1/chat/query', { schema: RS.chatQuery }, async (request, reply) => {
    if (!ensureOperatorOrAdmin(request, reply, ctx)) return;

    if (!grounding.hasServices()) {
      return reply.code(500).send(errorResponse('INTERNAL_ERROR', 'RAG services not initialised'));
    }

    try {
      const intent = request.body.intent;
      const message = request.body.message.trim();
      const topK = Number.isFinite(request.body.topK) ? Number(request.body.topK) : 5;
      const threshold = Number.isFinite(request.body.threshold)
        ? Number(request.body.threshold)
        : 0;

      if (!message) {
        return reply.code(400).send(errorResponse('INVALID_INPUT', 'Message is required'));
      }

      const grounded = await grounding.queryIntent(intent, message, { topK, threshold });

      const citations = grounded.matches.map((match) => ({
        source_path: match.source_path,
        excerpt: match.text,
        start_line: match.start_line,
        source_type: resolveCitationSourceType(match.source_path),
        deep_link: resolveCitationLink(match.source_path),
      }));

      return reply.send({
        ok: true,
        intent,
        query: grounded.query,
        collection: grounded.collections[0],
        answer: summarizeGrounding(intent, grounded.matches.length, grounded.collections[0]),
        references: grounded.matches,
        citations,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(500).send(errorResponse('CHAT_QUERY_ERROR', message));
    }
  });

  app.get<{
    Querystring: {
      session_id?: string;
      limit?: number;
    };
  }>('/api/v1/chat/history', { schema: RS.chatHistory }, async (request, reply) => {
    if (!ensureOperatorOrAdmin(request, reply, ctx)) return;

    const sessionId =
      typeof request.query.session_id === 'string' && request.query.session_id.trim().length > 0
        ? request.query.session_id
        : resolveChatSessionId(request);
    const history = chatService.getHistory({
      sessionId,
      limit: request.query.limit,
    });

    return reply.send({
      ok: true,
      session_id: sessionId,
      count: history.length,
      messages: history,
    });
  });

  app.delete<{
    Body: {
      session_id?: string;
    };
  }>('/api/v1/chat/session', { schema: RS.chatSessionDelete }, async (request, reply) => {
    if (!ensureOperatorOrAdmin(request, reply, ctx)) return;

    const sessionId = resolveChatSessionId(request);
    const result = chatService.clearSession({ sessionId });

    return reply.send({
      ok: true,
      session_id: sessionId,
      ...result,
    });
  });

  app.post<{
    Body: {
      actionId: string;
      session_id?: string;
      confirmed?: boolean;
    };
  }>('/api/v1/chat/action', { schema: RS.chatAction }, async (request, reply) => {
    if (!ensureOperatorOrAdmin(request, reply, ctx)) return;

    const sessionId = resolveChatSessionId(request);
    const actionEnvelope = chatService.getActionEnvelope({
      sessionId,
      actionId: request.body.actionId,
    });

    if (!actionEnvelope) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Chat action not found'));
    }

    const action = actionEnvelope.action;
    const confirmed = request.body.confirmed === true;
    if (action.requires_confirmation && !confirmed) {
      return reply.code(409).send({
        ...errorResponse('CONFIRMATION_REQUIRED', 'Confirmation required before executing action'),
        requires_confirmation: true,
        action,
      });
    }

    try {
      let result: Record<string, unknown>;
      const payload = action.payload || {};

      switch (action.type as ChatActionType) {
        case 'approve': {
          const approvalId = String(payload.approval_id || '').trim();
          if (!approvalId) {
            return reply
              .code(400)
              .send(errorResponse('INVALID_INPUT', 'approval_id is required for approve action'));
          }
          result = governanceService.approve(
            approvalId,
            String(payload.user || 'chat-user'),
            String(payload.reason || 'Approved via chat action')
          ) as unknown as Record<string, unknown>;
          break;
        }
        case 'reject': {
          const approvalId = String(payload.approval_id || '').trim();
          if (!approvalId) {
            return reply
              .code(400)
              .send(errorResponse('INVALID_INPUT', 'approval_id is required for reject action'));
          }
          result = governanceService.reject(
            approvalId,
            String(payload.user || 'chat-user'),
            String(payload.reason || 'Rejected via chat action')
          ) as unknown as Record<string, unknown>;
          break;
        }
        case 'create_command':
        case 'resume':
        case 'pause': {
          const command =
            action.type === 'resume'
              ? 'CONTINUE'
              : action.type === 'pause'
                ? 'SCOPE CHANGE'
                : String(payload.command || 'CREATE');

          result = (await commandService.queue(
            {
              command,
              project: String(payload.project || 'chat-panel'),
              description: String(
                payload.description ||
                  `Action executed from chat context (${actionEnvelope.context_snapshot?.currentPhase || 'n/a'})`
              ),
              scope: String(payload.scope || 'chat-action'),
            },
            'chat-action'
          )) as unknown as Record<string, unknown>;
          break;
        }
        case 'open_screen': {
          result = {
            ok: true,
            target: String(payload.target || '/dashboard'),
          };
          break;
        }
        default:
          return reply
            .code(400)
            .send(errorResponse('INVALID_INPUT', `Unsupported action type: ${action.type}`));
      }

      ctx.sseNotify('message', {
        type: 'chat_action_executed',
        session_id: sessionId,
        action_id: action.id,
        action_type: action.type,
        timestamp: new Date().toISOString(),
      });

      return reply.send({
        ok: true,
        session_id: sessionId,
        action,
        replay_context: actionEnvelope.context_snapshot || null,
        result,
      });
    } catch (err) {
      if (err instanceof ServiceValidationError) {
        return reply.code(400).send(errorResponse('INVALID_INPUT', err.message));
      }
      if (err instanceof ServiceNotAvailableError) {
        return reply.code(503).send(errorResponse('SERVICE_UNAVAILABLE', err.message));
      }

      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }
      return reply.code(500).send(errorResponse('CHAT_ACTION_ERROR', message));
    }
  });
}
