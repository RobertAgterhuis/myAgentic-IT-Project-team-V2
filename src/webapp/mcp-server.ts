/**
 * MCP Server for myAgentic-IT-Project-team.
 *
 * Exposes the Command Center functionality as MCP tools, enabling
 * integration with VS Code, Visual Studio, JetBrains, and other
 * MCP-compatible IDE clients.
 *
 * Transport: stdio (launched automatically by the IDE).
 */

import path from 'node:path';
import fsp from 'node:fs/promises';

/* ── MCP SDK imports ────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sdkBase: string = require.resolve('@modelcontextprotocol/sdk/server');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { McpServer } = require(sdkBase.replace(/index\.js$/, 'mcp.js')) as {
  McpServer: new (
    info: { name: string; version: string },
    opts: { capabilities: { tools: Record<string, unknown>; resources: Record<string, unknown> } }
  ) => McpServerInstance;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { StdioServerTransport } = require(sdkBase.replace(/index\.js$/, 'stdio.js')) as {
  StdioServerTransport: new () => unknown;
};

/* ── Webapp module imports ──────────────────────────────────────── */
import { FileStore } from './store';
import { FileCache } from './cache';
import { AuditTrail } from './audit';
import * as models from './models';
import { sanitizeMarkdown, sanitizeQID, detectSecrets, safePath } from './server';
import { withFileLock } from './file-lock';
import * as schemas from './schemas';
import { createStorageProvider } from '../../platform/engine/persistence';
import type { StorageProvider } from '../../platform/engine/persistence';
import {
  EnvScopeValidationError,
  McpGovernanceService as RuntimePolicyService,
} from './plugins/mcp-governance';
import { ToolExecutionGuard } from './tool-execution-guard';

/* ── Service layer (M20-004) ───────────────────────────────────── */
import {
  SessionService,
  QuestionnaireService,
  DecisionService,
  CommandService,
  GovernanceService,
  PolicyService,
  PolicyValidationError,
  PolicyNotFoundError,
  ServiceValidationError,
  ServiceNotAvailableError,
} from './services';
import type { ServiceContext } from './services/types';

/* ── Type definitions ───────────────────────────────────────────── */

interface McpToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

interface McpResourceContents {
  contents: Array<{ uri: string; text: string; mimeType: string }>;
}

interface McpServerInstance {
  tool(name: string, description: string, handler: () => Promise<McpToolResult>): void;
  tool(
    name: string,
    description: string,
    schema: unknown,
    handler: (params: Record<string, unknown>) => Promise<McpToolResult>
  ): void;
  resource(
    name: string,
    uri: string,
    meta: { description: string; mimeType: string },
    handler: (uri: URL) => Promise<McpResourceContents>
  ): void;
  connect(transport: unknown): Promise<void>;
}

interface SessionState {
  projectName?: string | null;
  mode?: string | null;
  status?: string | null;
  currentPhase?: string | null;
  currentAgent?: string | null;
  phases?: unknown[];
  activeSprint?: unknown | null;
  sprint_backlog?: {
    sprint_statuses?: Record<string, unknown>;
    path?: string;
  };
}

interface ProgressInfo {
  projectName: string | null;
  mode: string | null;
  currentPhase: string | null;
  currentAgent: string | null;
  phases: unknown[];
  activeSprint: unknown | null;
}

interface QuestionnaireUpdate {
  questionId: string;
  answer: string;
  status: string;
}

interface QuestionnaireSummary {
  file: string;
  phase: string;
  title: string;
  total: number;
  answered: number;
  unanswered: number;
  deferred: number;
}

/* ── Path constants ─────────────────────────────────────────────── */
const PROJECT_ROOT: string = path.resolve(__dirname, '../..');
const DOC_ROOT: string = path.join(PROJECT_ROOT, 'docs');
const BUSINESS_DOCS: string = path.join(PROJECT_ROOT, 'BusinessDocs');
const HELP_DIR: string = path.join(PROJECT_ROOT, 'src', 'webapp', 'ui', 'src', 'help');
const SESSION_DIR: string = path.join(BUSINESS_DOCS, 'session');
const DECISIONS_PATH: string = path.join(BUSINESS_DOCS, 'decisions.md');
const AUDIT_DIR: string = path.join(BUSINESS_DOCS, 'audit');

/* ── Shared instances ───────────────────────────────────────────── */
const store = new FileStore();
const cache = new FileCache();
const audit = new AuditTrail({ logDir: AUDIT_DIR });

/* ── StorageProvider (M23-005) ──────────────────────────────────── */
let _storageProvider: StorageProvider | null = null;

/* ── Service layer context ─────────────────────────────────────── */
const svcCtx: ServiceContext = {
  store,
  cache,
  audit,
  projectRoot: PROJECT_ROOT,
  businessDocs: BUSINESS_DOCS,
  sessionDir: SESSION_DIR,
  decisionsFile: DECISIONS_PATH,
  decisionsDir: path.join(BUSINESS_DOCS, 'decisions'),
  commandQueue: path.join(SESSION_DIR, 'command-queue.json'),
  helpDir: HELP_DIR,
  safeWrite(filePath: string, data: string, _encoding?: string, auditEntry?) {
    store.writeFile(filePath, data);
    cache.invalidate(filePath);
    if (auditEntry) audit.log(auditEntry);
  },
};

const sessionSvc = new SessionService(svcCtx);
const questionnaireSvc = new QuestionnaireService(svcCtx);
const decisionSvc = new DecisionService(svcCtx);
const commandSvc = new CommandService(svcCtx);
const governanceSvc = new GovernanceService(svcCtx);
const policySvc = new PolicyService(svcCtx);

/* ── Helpers ────────────────────────────────────────────────────── */

function jsonResult(data: unknown): McpToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string): McpToolResult {
  return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true };
}

function safeWrite(filePath: string, data: string): void {
  store.writeFile(filePath, data);
  cache.invalidate(filePath);
}

/* ── MCP Server ─────────────────────────────────────────────────── */

const mcp: McpServerInstance = new McpServer(
  { name: 'agentic-it-project-team', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } }
);

const runtimePolicySvc = new RuntimePolicyService({
  projectRoot: PROJECT_ROOT,
  storageProvider: null,
});

const toolExecutionGuard = new ToolExecutionGuard({
  projectRoot: PROJECT_ROOT,
  governanceService: governanceSvc,
  defaultServerId: 'command-center',
});

function expectedEnvScope(): 'dev' | 'test' | 'prod' {
  return process.env.ENV_SCOPE === 'test' || process.env.ENV_SCOPE === 'prod'
    ? process.env.ENV_SCOPE
    : 'dev';
}

function withExecutionGuards(
  toolName: string,
  handler: (params?: Record<string, unknown>) => Promise<McpToolResult>,
  includeParams: boolean
): (params?: Record<string, unknown>) => Promise<McpToolResult> {
  return async (params?: Record<string, unknown>) => {
    const payload = params && typeof params === 'object' ? params : {};

    let envScope: 'dev' | 'test' | 'prod';
    try {
      envScope = runtimePolicySvc.validateEnvironmentScope(
        String(payload.env_scope || ''),
        expectedEnvScope()
      );
    } catch (error) {
      if (error instanceof EnvScopeValidationError) {
        return errorResult(error.message);
      }
      throw error;
    }

    const guardResult = await toolExecutionGuard.evaluate({
      toolName,
      envScope,
      expectedEnvScope: expectedEnvScope(),
      params: payload,
    });
    if (guardResult) {
      return jsonResult(guardResult);
    }

    const nextParams = { ...payload };
    delete nextParams.env_scope;
    delete nextParams.agent_id;

    return includeParams ? handler(nextParams) : handler();
  };
}

const registerTool = mcp.tool.bind(mcp);
mcp.tool = ((
  name: string,
  description: string,
  schemaOrHandler: unknown,
  handler?: (params: Record<string, unknown>) => Promise<McpToolResult>
) => {
  if (typeof schemaOrHandler === 'function') {
    return registerTool(
      name,
      description,
      withExecutionGuards(
        name,
        schemaOrHandler as (params?: Record<string, unknown>) => Promise<McpToolResult>,
        false
      )
    );
  }

  return registerTool(
    name,
    description,
    schemaOrHandler,
    withExecutionGuards(
      name,
      handler as (params?: Record<string, unknown>) => Promise<McpToolResult>,
      true
    )
  );
}) as McpServerInstance['tool'];

/* ════════════════════════════════════════════════════════════════ */
/*  TOOLS                                                          */
/* ════════════════════════════════════════════════════════════════ */

/* ── Project Status ─────────────────────────────────────────────── */

mcp.tool(
  'get_project_status',
  'Get the current project status including session state, pipeline progress, active command, and command queue summary',
  async () => {
    try {
      const session = await sessionSvc.readSessionStateAsync();
      const queue = commandSvc.getQueue();
      const progress = sessionSvc.buildProgressMcp(session);
      return jsonResult({
        session: session
          ? {
              projectName: session.projectName,
              mode: session.mode,
              status: session.status,
              currentPhase: session.currentPhase,
              currentAgent: session.currentAgent,
            }
          : null,
        progress,
        commandQueue: {
          total: queue.length,
          latest: queue.length ? queue[queue.length - 1] : null,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to read project status: ${message}`);
    }
  }
);

mcp.tool(
  'get_progress',
  'Get detailed pipeline progress: phase completion status, current agent, sprint information',
  async () => {
    try {
      return jsonResult(sessionSvc.buildProgressMcp(await sessionSvc.readSessionStateAsync()));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to read progress: ${message}`);
    }
  }
);

/* ── Questionnaires ─────────────────────────────────────────────── */

mcp.tool(
  'list_questionnaires',
  'List all questionnaire files with completion statistics (total, answered, unanswered, deferred questions per file)',
  async () => {
    try {
      const questionnaires = questionnaireSvc.list();
      const summaries = questionnaires.map((q) => ({
        file: q.file,
        phase: q.phase,
        title: (q as unknown as { title?: string }).title || '',
        total: q.questions.length,
        answered: q.questions.filter((x) => x.status === 'ANSWERED').length,
        unanswered: q.questions.filter((x) => x.status === 'OPEN' || x.status === 'UNANSWERED')
          .length,
        deferred: q.questions.filter((x) => x.status === 'DEFERRED').length,
      }));
      return jsonResult(summaries);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to list questionnaires: ${message}`);
    }
  }
);

mcp.tool(
  'get_questionnaire',
  'Get the full contents of a specific questionnaire including all questions, answers, and statuses',
  {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        description:
          'Questionnaire file path relative to project root (e.g. BusinessDocs/Phase1-Business/Questionnaires/ba-questionnaire.md)',
      },
    },
    required: ['file'],
  },
  async ({ file }: Record<string, unknown>) => {
    try {
      if (!file) return errorResult('file parameter is required');
      const relFile = (file as string).replace(/^BusinessDocs[\\/]?/, '');
      const result = questionnaireSvc.get(relFile);
      return jsonResult({ ...result, file });
    } catch (err: unknown) {
      if ((err as { errorCode?: string }).errorCode === 'PATH_TRAVERSAL')
        return errorResult('Invalid file path');
      if (err instanceof ServiceValidationError) return errorResult(err.message);
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to read questionnaire: ${message}`);
    }
  }
);

mcp.tool(
  'save_answers',
  'Save one or more answers to a questionnaire file. Each update specifies a question ID, answer text, and new status.',
  {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        description: 'Questionnaire file path relative to project root',
      },
      updates: {
        type: 'array',
        description: 'Array of answer updates to apply',
        items: {
          type: 'object',
          properties: {
            questionId: { type: 'string', description: 'Question ID (e.g. Q-01-0001)' },
            answer: { type: 'string', description: 'Answer text' },
            status: {
              type: 'string',
              enum: ['ANSWERED', 'DEFERRED'],
              description: 'New question status',
            },
          },
          required: ['questionId', 'answer', 'status'],
        },
      },
    },
    required: ['file', 'updates'],
  },
  async ({ file, updates }: Record<string, unknown>) => {
    try {
      if (!file || !Array.isArray(updates) || updates.length === 0) {
        return errorResult('file and non-empty updates array are required');
      }
      if (updates.length > 200) return errorResult('Too many updates (max 200)');

      const abs = safePath(PROJECT_ROOT, file as string);
      try {
        await fsp.access(abs);
      } catch {
        return errorResult(`File not found: ${file}`);
      }

      return await applySaveAnswers(abs, file as string, updates as QuestionnaireUpdate[]);
    } catch (err: unknown) {
      if ((err as { errorCode?: string }).errorCode === 'PATH_TRAVERSAL')
        return errorResult('Invalid file path');
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to save answers: ${message}`);
    }
  }
);

function applyOneUpdate(
  u: QuestionnaireUpdate,
  content: string,
  warnings: string[]
): { content: string; applied: boolean } {
  const check = schemas.validateQuestionnaireUpdate(u);
  if (!check.valid) {
    warnings.push(check.errors[0]);
    return { content, applied: false };
  }
  if (!models.Q_ID_RE.test(u.questionId)) {
    warnings.push(`Invalid Q-ID format: ${u.questionId}`);
    return { content, applied: false };
  }
  const secrets = detectSecrets(u.answer || '');
  if (secrets.length) {
    warnings.push(`Secret pattern detected in answer for ${u.questionId}`);
  }
  const sanitized = sanitizeQID(sanitizeMarkdown(u.answer || ''));
  const updated = models.updateAnswerInContent(content, u.questionId, sanitized, u.status);
  return { content: updated, applied: updated !== content };
}

function applySaveAnswers(
  abs: string,
  file: string,
  updates: QuestionnaireUpdate[]
): Promise<McpToolResult> {
  return withFileLock(abs, async () => {
    let content = await fsp.readFile(abs, 'utf8');
    const warnings: string[] = [];
    let applied = 0;

    for (const u of updates) {
      const r = applyOneUpdate(u, content, warnings);
      content = r.content;
      if (r.applied) applied++;
    }

    safeWrite(abs, content);
    audit.log({
      operation: 'SAVE_ANSWERS',
      entityType: 'questionnaire',
      entityId: file,
      user: 'mcp',
      summary: `Updated ${applied} of ${updates.length} answers`,
    });

    const result: Record<string, unknown> = { saved: true, file, applied, total: updates.length };
    if (warnings.length) result.warnings = warnings;
    return jsonResult(result);
  });
}

/* ── Decisions ──────────────────────────────────────────────────── */

mcp.tool(
  'list_decisions',
  'List all decisions grouped by status: open questions, decided items, and deferred items',
  async () => {
    try {
      return jsonResult(decisionSvc.list());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to read decisions: ${message}`);
    }
  }
);

mcp.tool(
  'create_decision',
  'Create a new open question or operational decision in the decisions register',
  {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['question', 'operational'],
        description: 'Decision type: question (needs answer) or operational (immediate decision)',
      },
      priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'], description: 'Priority level' },
      scope: { type: 'string', description: 'Scope/category (e.g. TECH, BUSINESS, UX, MARKETING)' },
      text: { type: 'string', description: 'The question or decision text' },
      notes: { type: 'string', description: 'Optional additional context or notes' },
    },
    required: ['type', 'priority', 'scope', 'text'],
  },
  async ({ type, priority, scope, text, notes }: Record<string, unknown>) => {
    try {
      const result = await decisionSvc.create({
        type: type as 'question' | 'operational',
        priority: priority as string,
        scope: scope as string,
        text: text as string,
        notes: notes as string | undefined,
      });
      return jsonResult({ created: result.ok, id: result.id, type, priority, scope });
    } catch (err: unknown) {
      if (err instanceof ServiceValidationError) return errorResult(err.message);
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to create decision: ${message}`);
    }
  }
);

mcp.tool(
  'answer_decision',
  'Provide an answer to an open question in the decisions register',
  {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Decision ID (e.g. DEC-Q-001)' },
      answer: { type: 'string', description: 'The answer text' },
    },
    required: ['id', 'answer'],
  },
  async ({ id, answer }: Record<string, unknown>) => {
    try {
      if (!id || !answer) return errorResult('id and answer are required');
      if (!models.DEC_ID_RE.test(id as string))
        return errorResult(`Invalid decision ID format: ${id}`);
      const result = await decisionSvc.answer(id as string, answer as string, 'mcp');
      const mapped: Record<string, unknown> = { answered: result.ok, id: result.id };
      if (result.warnings) mapped.warnings = result.warnings;
      return jsonResult(mapped);
    } catch (err: unknown) {
      if (err instanceof ServiceValidationError) return errorResult(err.message);
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to answer decision: ${message}`);
    }
  }
);

mcp.tool(
  'decide_question',
  'Finalize an answered open question by moving it to the decided section. The question must have an answer before it can be decided.',
  {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Decision ID to finalize (e.g. DEC-001)' },
    },
    required: ['id'],
  },
  async ({ id }: Record<string, unknown>) => {
    try {
      if (!id) return errorResult('id is required');
      if (!models.DEC_ID_RE.test(id as string))
        return errorResult(`Invalid decision ID format: ${id}`);
      const result = await decisionSvc.decide(id as string, 'mcp');
      return jsonResult({ decided: result.ok, id: result.id });
    } catch (err: unknown) {
      if (err instanceof ServiceValidationError) return errorResult(err.message);
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to decide question: ${message}`);
    }
  }
);

/* ── Commands ───────────────────────────────────────────────────── */

mcp.tool(
  'queue_command',
  'Queue a command for the orchestrator. After queuing, paste the returned text into Copilot Chat.',
  {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The command to queue (e.g. CREATE, AUDIT, REEVALUATE)',
      },
      project: { type: 'string', description: 'Project name (for CREATE/AUDIT)' },
      scope: {
        type: 'string',
        description: 'Scope for REEVALUATE/SCOPE CHANGE: ALL, BUSINESS, TECH, UX, MARKETING',
      },
      description: {
        type: 'string',
        description: 'Description for FEATURE, SCOPE CHANGE, or HOTFIX',
      },
      brief: {
        type: 'string',
        description: 'Full project brief text (saved to BusinessDocs/project-brief.md)',
      },
    },
    required: ['command'],
  },
  async ({ command, project, scope, description, brief }: Record<string, unknown>) => {
    try {
      if (!command) return errorResult('command is required');
      const result = await commandSvc.queue(
        {
          command: command as string,
          project: project as string | undefined,
          scope: scope as string | undefined,
          description: description as string | undefined,
          brief: brief as string | undefined,
        },
        'mcp'
      );
      return jsonResult({
        queued: result.ok,
        text: result.clipboard_text,
        instruction: `Paste this into Copilot Chat: ${result.clipboard_text}`,
      });
    } catch (err: unknown) {
      if (err instanceof ServiceValidationError)
        return errorResult(
          `Unknown command: ${command}. Valid: CREATE, AUDIT, REEVALUATE, FEATURE, SCOPE CHANGE, HOTFIX, REFRESH ONBOARDING`
        );
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to queue command: ${message}`);
    }
  }
);

mcp.tool(
  'get_command_queue',
  'Get the full command queue with all queued, active, and completed commands',
  async () => {
    try {
      return jsonResult(commandSvc.getQueue());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to read command queue: ${message}`);
    }
  }
);

/* ── Help ───────────────────────────────────────────────────────── */

mcp.tool(
  'get_help',
  'Get help on commands, concepts, and workflows. Omit topic for a table of contents listing all available topics.',
  {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description:
          'Help topic slug (e.g. commands, phases, decisions). Omit for table of contents.',
      },
    },
  },
  async ({ topic }: Record<string, unknown> = {}) => {
    try {
      if (!topic) {
        const topics = sessionSvc.getHelpTopics();
        if (topics.length === 0) return errorResult('Help directory not found');
        return jsonResult({ topics });
      }
      const result = sessionSvc.getHelpTopic(topic as string);
      if (!result) return errorResult(`Help topic not found: ${topic}`);
      return jsonResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to read help: ${message}`);
    }
  }
);

/* ── Drift Detection (INFRA-02-C) ──────────────────────────────── */

mcp.tool(
  'check_drift',
  'Detect drift between session-state sprint statuses and GitHub board sync reports. Returns a drift report with severity levels (CRITICAL, WARNING, INFO) and recommendations.',
  async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectDrift } = require('./drift-detector') as {
        detectDrift: (opts: {
          sessionState: unknown;
          sprintPlanContent: string | null;
          syncReports: Record<string, string | null>;
        }) => unknown;
      };
      return jsonResult(sessionSvc.checkDrift(detectDrift));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to check drift: ${message}`);
    }
  }
);

/* ── Audit ──────────────────────────────────────────────────────── */

mcp.tool(
  'get_audit_log',
  'Get recent entries from the mutation audit trail (append-only log of all data changes)',
  {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum entries to return (default: 50, max: 1000)',
      },
    },
  },
  async ({ limit }: Record<string, unknown> = {}) => {
    try {
      return jsonResult(sessionSvc.readAuditLog(Number(limit) || 50));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to read audit log: ${message}`);
    }
  }
);

/* ── Governance Approvals ───────────────────────────────────────── */

mcp.tool('list_approvals', 'List pending governance approval requests', async () => {
  try {
    const result = governanceSvc.listApprovals();
    return jsonResult(result);
  } catch (err: unknown) {
    if (err instanceof ServiceNotAvailableError) {
      return jsonResult({ approvals: [], count: 0, note: 'No governance state found' });
    }
    const message = err instanceof Error ? err.message : String(err);
    return errorResult(`Failed to list approvals: ${message}`);
  }
});

mcp.tool(
  'approve_request',
  'Approve a pending governance approval request',
  {
    type: 'object',
    properties: {
      approval_id: { type: 'string', description: 'The approval request ID' },
      user: { type: 'string', description: 'User performing the approval' },
      reason: { type: 'string', description: 'Reason for approval' },
    },
    required: ['approval_id', 'user'],
  },
  async ({ approval_id, user, reason }: Record<string, unknown>) => {
    try {
      const result = governanceSvc.approve(
        String(approval_id),
        String(user),
        String(reason || 'Approved via MCP')
      );
      return jsonResult(result);
    } catch (err: unknown) {
      if (err instanceof ServiceNotAvailableError) return errorResult('No governance state found');
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to approve: ${message}`);
    }
  }
);

mcp.tool(
  'reject_request',
  'Reject a pending governance approval request',
  {
    type: 'object',
    properties: {
      approval_id: { type: 'string', description: 'The approval request ID' },
      user: { type: 'string', description: 'User performing the rejection' },
      reason: { type: 'string', description: 'Reason for rejection (required)' },
    },
    required: ['approval_id', 'user', 'reason'],
  },
  async ({ approval_id, user, reason }: Record<string, unknown>) => {
    try {
      if (!reason || !String(reason).trim()) return errorResult('Reason is required for rejection');
      const result = governanceSvc.reject(String(approval_id), String(user), String(reason));
      return jsonResult(result);
    } catch (err: unknown) {
      if (err instanceof ServiceNotAvailableError) return errorResult('No governance state found');
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to reject: ${message}`);
    }
  }
);

/* ── Policy-as-Code Governance (M22) ───────────────────────────── */

mcp.tool(
  'list_policies',
  'List all active governance policies with status across all policy packs',
  async () => {
    try {
      const result = policySvc.listPolicies();
      return jsonResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to list policies: ${message}`);
    }
  }
);

mcp.tool(
  'get_policy_evaluation',
  'Evaluate all policies against a given context and return results',
  {
    type: 'object',
    properties: {
      context_type: {
        type: 'string',
        enum: ['gate', 'pr', 'deploy', 'artifact', 'schedule'],
        description: 'The evaluation context type',
      },
      scope: {
        type: 'string',
        enum: ['global', 'org', 'team', 'repo', 'sprint'],
        description: 'The scope to evaluate against',
      },
      checks: {
        type: 'object',
        description: 'Map of check names to boolean results (e.g. { "secret_scan_passed": true })',
        additionalProperties: { type: 'boolean' },
      },
    },
    required: ['context_type', 'scope', 'checks'],
  },
  async ({ context_type, scope, checks }: Record<string, unknown>) => {
    try {
      const result = policySvc.evaluatePolicies({
        type: String(context_type) as 'gate' | 'pr' | 'deploy' | 'artifact' | 'schedule',
        scope: String(scope) as 'global' | 'org' | 'team' | 'repo' | 'sprint',
        checks: (checks || {}) as Record<string, boolean>,
      });
      return jsonResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to evaluate policies: ${message}`);
    }
  }
);

mcp.tool(
  'create_exception',
  'Request an exception for a specific governance policy (requires approval)',
  {
    type: 'object',
    properties: {
      policy_id: {
        type: 'string',
        description: 'The policy ID to create an exception for (e.g. POL-SEC-001)',
      },
      reason: { type: 'string', description: 'Justification for the exception' },
      approved_by: { type: 'string', description: 'User approving the exception' },
      expires: {
        type: 'string',
        description: 'ISO date-time when the exception expires',
      },
      scope_override: {
        type: 'string',
        description: 'Optional narrower scope for the exception',
      },
    },
    required: ['policy_id', 'reason', 'approved_by', 'expires'],
  },
  async ({ policy_id, reason, approved_by, expires, scope_override }: Record<string, unknown>) => {
    try {
      const result = policySvc.createException({
        policy_id: String(policy_id),
        reason: String(reason),
        approved_by: String(approved_by),
        expires: String(expires),
        scope_override: scope_override ? String(scope_override) : undefined,
      });
      return jsonResult(result);
    } catch (err: unknown) {
      if (err instanceof PolicyValidationError) return errorResult(err.message);
      if (err instanceof PolicyNotFoundError) return errorResult(err.message);
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to create exception: ${message}`);
    }
  }
);

/* ── Job Management (M24-006) ──────────────────────────────────── */

mcp.tool(
  'list_jobs',
  'List background jobs with optional status/type filter. Returns job queue state.',
  {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['queued', 'running', 'completed', 'failed', 'cancelled'],
        description: 'Filter by job status',
      },
      type: {
        type: 'string',
        enum: [
          'agent-invocation',
          'gate-validation',
          'artifact-registration',
          'sprint-gate',
          'policy-evaluation',
        ],
        description: 'Filter by job type',
      },
      limit: { type: 'number', description: 'Max results (default 50)' },
    },
  },
  async ({ status, type, limit }: Record<string, unknown>) => {
    try {
      if (!_storageProvider) return errorResult('StorageProvider not available');
      const { MemoryQueue } = await import('../../platform/engine/jobs');
      // Use the in-process queue as the default
      const queue = new MemoryQueue();
      const jobs = await queue.list({
        status: status as undefined,
        type: type as undefined,
        limit: (limit as number) || 50,
      });
      return jsonResult({ total: jobs.length, jobs });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to list jobs: ${message}`);
    }
  }
);

mcp.tool(
  'get_job',
  'Get details of a specific background job including its result',
  {
    type: 'object',
    properties: {
      job_id: { type: 'string', description: 'The job ID to look up' },
    },
    required: ['job_id'],
  },
  async ({ job_id }: Record<string, unknown>) => {
    try {
      if (!_storageProvider) return errorResult('StorageProvider not available');
      const { PersistentQueue } = await import('../../platform/engine/jobs');
      const queue = new PersistentQueue(_storageProvider);
      const job = await queue.status(String(job_id));
      if (!job) return errorResult(`Job not found: ${job_id}`);
      return jsonResult(job);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to get job: ${message}`);
    }
  }
);

mcp.tool(
  'cancel_job',
  'Cancel a queued or running background job',
  {
    type: 'object',
    properties: {
      job_id: { type: 'string', description: 'The job ID to cancel' },
    },
    required: ['job_id'],
  },
  async ({ job_id }: Record<string, unknown>) => {
    try {
      if (!_storageProvider) return errorResult('StorageProvider not available');
      const { PersistentQueue } = await import('../../platform/engine/jobs');
      const queue = new PersistentQueue(_storageProvider);
      await queue.cancel(String(job_id));
      return jsonResult({ ok: true, message: `Job ${job_id} cancelled` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to cancel job: ${message}`);
    }
  }
);

/* ════════════════════════════════════════════════════════════════ */
/*  WORKSPACE TOOLS (M25-005)                                      */
/* ════════════════════════════════════════════════════════════════ */

mcp.tool(
  'list_workspaces',
  'List all registered workspaces with their repositories and projects',
  async () => {
    try {
      if (!_storageProvider) return errorResult('StorageProvider not available');
      const { WorkspaceManager } = await import('../../platform/engine/workspace');
      const mgr = new WorkspaceManager(_storageProvider);
      const workspaces = await mgr.listWorkspaces();
      return jsonResult({ workspaces, total: workspaces.length });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to list workspaces: ${message}`);
    }
  }
);

mcp.tool(
  'get_workspace',
  'Get workspace details including repositories, teams, and projects',
  {
    type: 'object',
    properties: {
      workspace_id: { type: 'string', description: 'The workspace ID to retrieve' },
    },
    required: ['workspace_id'],
  },
  async ({ workspace_id }: Record<string, unknown>) => {
    try {
      if (!_storageProvider) return errorResult('StorageProvider not available');
      const { WorkspaceManager } = await import('../../platform/engine/workspace');
      const mgr = new WorkspaceManager(_storageProvider);
      const workspace = await mgr.getWorkspace(String(workspace_id));
      const projects = await mgr.listProjects(String(workspace_id));
      return jsonResult({ workspace, projects });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to get workspace: ${message}`);
    }
  }
);

mcp.tool(
  'create_project',
  'Create a new project in a workspace, optionally assigning repositories',
  {
    type: 'object',
    properties: {
      workspace_id: { type: 'string', description: 'Parent workspace ID' },
      project_id: { type: 'string', description: 'Unique project identifier' },
      name: { type: 'string', description: 'Project display name' },
      repository_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Repository IDs to assign to the project',
      },
    },
    required: ['workspace_id', 'project_id', 'name'],
  },
  async ({ workspace_id, project_id, name, repository_ids }: Record<string, unknown>) => {
    try {
      if (!_storageProvider) return errorResult('StorageProvider not available');
      const { WorkspaceManager } = await import('../../platform/engine/workspace');
      const mgr = new WorkspaceManager(_storageProvider);
      const project = await mgr.createProject({
        id: String(project_id),
        workspaceId: String(workspace_id),
        name: String(name),
        repositories: Array.isArray(repository_ids) ? repository_ids.map(String) : undefined,
      });
      return jsonResult({ ok: true, project });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to create project: ${message}`);
    }
  }
);

mcp.tool(
  'add_repository',
  'Register a repository in a workspace',
  {
    type: 'object',
    properties: {
      workspace_id: { type: 'string', description: 'Workspace to add the repository to' },
      repo_id: { type: 'string', description: 'Unique repository identifier' },
      name: { type: 'string', description: 'Repository display name' },
      provider: {
        type: 'string',
        enum: ['github', 'azure-devops', 'gitlab', 'local'],
        description: 'Git hosting provider',
      },
      url: { type: 'string', description: 'Clone URL or local path' },
      default_branch: { type: 'string', description: 'Default branch (e.g. main)' },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Classification tags (e.g. frontend, api)',
      },
    },
    required: ['workspace_id', 'repo_id', 'name', 'provider', 'url', 'default_branch'],
  },
  async ({
    workspace_id,
    repo_id,
    name: repoName,
    provider,
    url,
    default_branch,
    tags,
  }: Record<string, unknown>) => {
    try {
      if (!_storageProvider) return errorResult('StorageProvider not available');
      const { WorkspaceManager } = await import('../../platform/engine/workspace');
      const mgr = new WorkspaceManager(_storageProvider);
      const workspace = await mgr.addRepository(String(workspace_id), {
        id: String(repo_id),
        name: String(repoName),
        provider: String(provider) as 'github' | 'azure-devops' | 'gitlab' | 'local',
        url: String(url),
        defaultBranch: String(default_branch),
        tags: Array.isArray(tags) ? tags.map(String) : [],
      });
      return jsonResult({ ok: true, repository_count: workspace.repositories.length });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to add repository: ${message}`);
    }
  }
);

/* ════════════════════════════════════════════════════════════════ */
/*  RESOURCES                                                      */
/* ════════════════════════════════════════════════════════════════ */

mcp.resource(
  'session-state',
  'agentic://session-state',
  {
    description: 'Current session state (project name, mode, phase, agent, sprint)',
    mimeType: 'application/json',
  },
  async (uri: URL) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(sessionSvc.readSessionState(), null, 2),
        mimeType: 'application/json',
      },
    ],
  })
);

mcp.resource(
  'decisions',
  'agentic://decisions',
  {
    description: 'All decisions: open questions, decided items, deferred items',
    mimeType: 'application/json',
  },
  async (uri: URL) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(decisionSvc.list(), null, 2),
        mimeType: 'application/json',
      },
    ],
  })
);

mcp.resource(
  'command-queue',
  'agentic://command-queue',
  { description: 'Command queue with all orchestrator commands', mimeType: 'application/json' },
  async (uri: URL) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(commandSvc.getQueue(), null, 2),
        mimeType: 'application/json',
      },
    ],
  })
);

/* ════════════════════════════════════════════════════════════════ */
/*  STARTUP                                                        */
/* ════════════════════════════════════════════════════════════════ */

// eslint-disable-next-line @typescript-eslint/no-require-imports
if (require.main === module) {
  (async () => {
    // Initialize StorageProvider (M23-005)
    try {
      _storageProvider = await createStorageProvider();
    } catch {
      process.stderr.write('Warning: StorageProvider init failed, continuing without it\n');
    }
    const transport = new StdioServerTransport();
    await mcp.connect(transport);
  })().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`MCP server fatal error: ${message}\n`);
    process.exit(1);
  });
}

/* ── Backward-compatible wrappers (used by tests & consumers) ─── */

/** @deprecated Use SessionService.readSessionState() */
function readSessionState(): SessionState | null {
  return sessionSvc.readSessionState();
}

/** @deprecated Use CommandService.getQueue() */
function readCommandQueue(): unknown[] {
  return commandSvc.getQueue();
}

/** @deprecated Use DecisionService.list() */
function readDecisions(): { open: unknown[]; decided: unknown[]; deferred: unknown[] } {
  return decisionSvc.list();
}

/** @deprecated Use SessionService.buildProgressMcp() */
function buildProgress(session: SessionState | null): ProgressInfo {
  return sessionSvc.buildProgressMcp(session);
}

/** @deprecated Use QuestionnaireService.list() */
function discoverQuestionnaires(): QuestionnaireSummary[] {
  return questionnaireSvc.list().map((q) => {
    const qs = q.questions || [];
    return {
      file: q.file,
      phase: q.phase,
      title: q.agent || q.file,
      total: qs.length,
      answered: qs.filter((x) => x.status === 'ANSWERED').length,
      unanswered: qs.filter((x) => x.status === 'OPEN' || x.status === 'UNANSWERED').length,
      deferred: qs.filter((x) => x.status === 'DEFERRED').length,
    };
  });
}

/* ── Exports for testing ────────────────────────────────────────── */
export {
  discoverQuestionnaires as _discoverQuestionnaires,
  readSessionState,
  readCommandQueue,
  readDecisions,
  buildProgress,
  jsonResult,
  errorResult,
  safeWrite,
  mcp,
  PROJECT_ROOT as _PROJECT_ROOT,
  DOC_ROOT as _DOC_ROOT,
  BUSINESS_DOCS,
  SESSION_DIR,
  DECISIONS_PATH,
};
