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
import { resolveSessionFile } from './session-state-resolver';
import * as models from './models';
import { sanitizeMarkdown, sanitizeQID, detectSecrets, safePath } from './server';
import { withFileLock } from './file-lock';
import * as schemas from './schemas';

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

interface CommandQueueEntry {
  command: string;
  text: string;
  timestamp: string;
  status: string;
  project?: string;
  scope?: string;
  description?: string;
}

/* ── Path constants ─────────────────────────────────────────────── */
const PROJECT_ROOT: string = path.resolve(__dirname, '../..');
const DOC_ROOT: string = path.join(PROJECT_ROOT, 'docs');
const BUSINESS_DOCS: string = path.join(PROJECT_ROOT, 'BusinessDocs');
const HELP_DIR: string = path.join(PROJECT_ROOT, 'docs', 'help');
const SESSION_DIR: string = path.join(BUSINESS_DOCS, 'session');
const DECISIONS_PATH: string = path.join(BUSINESS_DOCS, 'decisions.md');
const AUDIT_DIR: string = path.join(BUSINESS_DOCS, 'audit');

/* ── Shared instances ───────────────────────────────────────────── */
const store = new FileStore();
const cache = new FileCache();
const audit = new AuditTrail({ logDir: AUDIT_DIR });

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

async function parseQuestionnaireFile(full: string, name: string): Promise<QuestionnaireSummary> {
  const content = await fsp.readFile(full, 'utf8');
  const parsed = models.parseQuestionnaire(content, full, BUSINESS_DOCS);
  const rel = path.relative(PROJECT_ROOT, full).replace(/\\/g, '/');
  const qs: Array<{ status: string }> = parsed.questions || [];
  return {
    file: rel,
    phase: parsed.phase || '',
    title: (parsed as unknown as { title?: string }).title || name,
    total: qs.length,
    answered: qs.filter((q) => q.status === 'ANSWERED').length,
    unanswered: qs.filter((q) => q.status === 'OPEN' || q.status === 'UNANSWERED').length,
    deferred: qs.filter((q) => q.status === 'DEFERRED').length,
  };
}

async function walkQuestionnaires(dir: string, results: QuestionnaireSummary[]): Promise<void> {
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== '.backups') {
      await walkQuestionnaires(full, results);
      continue;
    }
    if (!e.isFile() || !e.name.endsWith('-questionnaire.md')) continue;
    try {
      results.push(await parseQuestionnaireFile(full, e.name));
    } catch {
      /* skip unparseable files */
    }
  }
}

async function discoverQuestionnaires(): Promise<QuestionnaireSummary[]> {
  const results: QuestionnaireSummary[] = [];
  try {
    await fsp.access(BUSINESS_DOCS);
  } catch {
    return results;
  }
  await walkQuestionnaires(BUSINESS_DOCS, results);
  return results;
}

async function readSessionState(): Promise<SessionState | null> {
  const file =
    resolveSessionFile(store, cache, SESSION_DIR) || path.join(SESSION_DIR, 'session-state.json');
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8')) as SessionState;
  } catch {
    return null;
  }
}

async function readCommandQueue(): Promise<CommandQueueEntry[]> {
  const file = path.join(SESSION_DIR, 'command-queue.json');
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8')) as CommandQueueEntry[];
  } catch {
    return [];
  }
}

async function readDecisions(): Promise<{
  open: unknown[];
  decided: unknown[];
  deferred: unknown[];
}> {
  try {
    return models.parseDecisions(await fsp.readFile(DECISIONS_PATH, 'utf8'));
  } catch {
    return { open: [], decided: [], deferred: [] };
  }
}

function buildProgress(session: SessionState | null): ProgressInfo {
  if (!session) {
    return {
      projectName: null,
      mode: null,
      currentPhase: null,
      currentAgent: null,
      phases: [],
      activeSprint: null,
    };
  }
  return {
    projectName: session.projectName || null,
    mode: session.mode || null,
    currentPhase: session.currentPhase || null,
    currentAgent: session.currentAgent || null,
    phases: session.phases || [],
    activeSprint: session.activeSprint || null,
  };
}

/* ── MCP Server ─────────────────────────────────────────────────── */

const mcp: McpServerInstance = new McpServer(
  { name: 'agentic-it-project-team', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } }
);

/* ════════════════════════════════════════════════════════════════ */
/*  TOOLS                                                          */
/* ════════════════════════════════════════════════════════════════ */

/* ── Project Status ─────────────────────────────────────────────── */

mcp.tool(
  'get_project_status',
  'Get the current project status including session state, pipeline progress, active command, and command queue summary',
  async () => {
    try {
      const session = await readSessionState();
      const queue = await readCommandQueue();
      const progress = buildProgress(session);
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
      return jsonResult(buildProgress(await readSessionState()));
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
      return jsonResult(await discoverQuestionnaires());
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
      const abs = safePath(PROJECT_ROOT, file as string);
      try {
        await fsp.access(abs);
      } catch {
        return errorResult(`File not found: ${file}`);
      }
      const content = await fsp.readFile(abs, 'utf8');
      return jsonResult({ file, ...models.parseQuestionnaire(content, abs, PROJECT_ROOT) });
    } catch (err: unknown) {
      if ((err as { errorCode?: string }).errorCode === 'PATH_TRAVERSAL')
        return errorResult('Invalid file path');
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
      return jsonResult(await readDecisions());
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
      const valErr = validateDecisionFields(
        type as string,
        priority as string,
        scope as string,
        text as string
      );
      if (valErr) return valErr;
      try {
        await fsp.access(DECISIONS_PATH);
      } catch {
        return errorResult('decisions.md not found — run a CREATE or AUDIT command first');
      }

      return await withFileLock(DECISIONS_PATH, async () => {
        let content = await fsp.readFile(DECISIONS_PATH, 'utf8');
        const id = models.nextDecisionId(content, 'DEC-');
        const safeText = sanitizeMarkdown(text as string);
        const safeNotes = notes ? sanitizeMarkdown(notes as string) : '';

        if (type === 'question') {
          content = models.addOpenQuestion(content, {
            id,
            priority: priority as string,
            scope: scope as string,
            question: safeText,
            answer: '',
            date: models.today(),
          });
        } else {
          content = models.addOperationalDecision(content, {
            id,
            priority: priority as string,
            scope: scope as string,
            decision: safeText,
            notes: safeNotes,
            date: models.today(),
          });
        }
        content = models.appendAuditTrail(content, 'create', id);

        safeWrite(DECISIONS_PATH, content);
        audit.log({
          operation: 'CREATE_DECISION',
          entityType: 'decision',
          entityId: id,
          user: 'mcp',
          summary: `${type}: ${(text as string).slice(0, 80)}`,
        });
        return jsonResult({ created: true, id, type, priority, scope });
      });
    } catch (err: unknown) {
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
      try {
        await fsp.access(DECISIONS_PATH);
      } catch {
        return errorResult('decisions.md not found');
      }

      return await withFileLock(DECISIONS_PATH, async () => {
        let content = await fsp.readFile(DECISIONS_PATH, 'utf8');
        const secrets = detectSecrets(answer as string);
        const safeAnswer = sanitizeMarkdown(answer as string);

        content = models.answerOpenQuestion(content, id as string, safeAnswer);
        content = models.appendAuditTrail(content, 'answer', id as string);

        safeWrite(DECISIONS_PATH, content);
        audit.log({
          operation: 'ANSWER_DECISION',
          entityType: 'decision',
          entityId: id as string,
          user: 'mcp',
          summary: `Answered: ${(answer as string).slice(0, 80)}`,
        });

        const result: Record<string, unknown> = { answered: true, id };
        if (secrets.length)
          result.warnings = ['Secret pattern detected in answer — review before committing'];
        return jsonResult(result);
      });
    } catch (err: unknown) {
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
      try {
        await fsp.access(DECISIONS_PATH);
      } catch {
        return errorResult('decisions.md not found');
      }

      return await withFileLock(DECISIONS_PATH, async () => {
        let content = await fsp.readFile(DECISIONS_PATH, 'utf8');
        content = models.moveToDecided(content, id as string);
        content = models.appendAuditTrail(content, 'decide', id as string);

        safeWrite(DECISIONS_PATH, content);
        audit.log({
          operation: 'DECIDE_QUESTION',
          entityType: 'decision',
          entityId: id as string,
          user: 'mcp',
          summary: `Decided: ${id}`,
        });
        return jsonResult({ decided: true, id });
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to decide question: ${message}`);
    }
  }
);

/* ── Commands ───────────────────────────────────────────────────── */

function validateDecisionFields(
  type: string,
  priority: string,
  scope: string,
  text: string
): McpToolResult | null {
  const r = schemas.validateDecisionCreate({ type, priority, scope, text });
  if (!r.valid) return errorResult(r.errors[0]);
  return null;
}

const VALID_COMMANDS: string[] = [
  'CREATE',
  'AUDIT',
  'CREATE BUSINESS',
  'CREATE TECH',
  'CREATE UX',
  'CREATE MARKETING',
  'CREATE SYNTHESIS',
  'REEVALUATE',
  'FEATURE',
  'SCOPE CHANGE',
  'HOTFIX',
  'REFRESH ONBOARDING',
];

mcp.tool(
  'queue_command',
  `Queue a command for the orchestrator. Valid commands: ${VALID_COMMANDS.join(', ')}. After queuing, paste the returned text into Copilot Chat.`,
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
      const upperCmd = (command as string).toUpperCase().trim();

      if (!VALID_COMMANDS.some((v) => upperCmd.startsWith(v))) {
        return errorResult(`Unknown command: ${command}. Valid: ${VALID_COMMANDS.join(', ')}`);
      }

      const text = buildCommandText(
        upperCmd,
        project as string | undefined,
        scope as string | undefined,
        description as string | undefined
      );
      if (brief) await saveBrief(brief as string);
      await enqueueCommand(
        upperCmd,
        text,
        project as string | undefined,
        scope as string | undefined,
        description as string | undefined
      );

      return jsonResult({
        queued: true,
        text,
        instruction: `Paste this into Copilot Chat: ${text}`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to queue command: ${message}`);
    }
  }
);

function buildCommandText(
  upperCmd: string,
  project: string | undefined,
  scope: string | undefined,
  description: string | undefined
): string {
  let text = upperCmd;
  if (project) text += ` ${project}`;
  if (scope) text += ` ${scope}`;
  if (description) text += `: ${description}`;
  return text;
}

async function saveBrief(brief: string): Promise<void> {
  const check = schemas.validateProjectBrief(brief);
  if (!check.valid) throw new Error(check.errors[0]);
  const briefPath = path.join(PROJECT_ROOT, 'BusinessDocs', 'project-brief.md');
  await withFileLock(briefPath, async () => {
    safeWrite(briefPath, brief);
  });
}

async function enqueueCommand(
  upperCmd: string,
  text: string,
  project: string | undefined,
  scope: string | undefined,
  description: string | undefined
): Promise<void> {
  const queuePath = path.join(SESSION_DIR, 'command-queue.json');
  await withFileLock(queuePath, async () => {
    const queue = await readCommandQueue();
    const entry: CommandQueueEntry = {
      command: upperCmd,
      text,
      timestamp: models.isoNow(),
      status: 'QUEUED',
    };
    if (project) entry.project = project;
    if (scope) entry.scope = scope;
    if (description) entry.description = description;
    queue.push(entry);

    safeWrite(queuePath, JSON.stringify(queue, null, 2));
  });

  audit.log({
    operation: 'QUEUE_COMMAND',
    entityType: 'command',
    entityId: text,
    user: 'mcp',
    summary: text,
  });
}

mcp.tool(
  'get_command_queue',
  'Get the full command queue with all queued, active, and completed commands',
  async () => {
    try {
      return jsonResult(await readCommandQueue());
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
      try {
        await fsp.access(HELP_DIR);
      } catch {
        return errorResult('Help directory not found');
      }

      if (!topic) {
        const files = (await fsp.readdir(HELP_DIR)).filter((f) => f.endsWith('.md'));
        const topics = files.map((f) => ({ slug: f.replace('.md', ''), file: f }));
        return jsonResult({ topics });
      }

      const safe = (topic as string).replace(/[^a-z0-9_-]/gi, '');
      const file = path.join(HELP_DIR, `${safe}.md`);
      try {
        await fsp.access(file);
      } catch {
        return errorResult(`Help topic not found: ${topic}`);
      }
      return jsonResult({ topic: safe, content: await fsp.readFile(file, 'utf8') });
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
  // eslint-disable-next-line complexity
  async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectDrift } = require('./drift-detector') as {
        detectDrift: (opts: {
          sessionState: SessionState;
          sprintPlanContent: string | null;
          syncReports: Record<string, string | null>;
        }) => unknown;
      };
      const session = await readSessionState();
      if (!session)
        return jsonResult({
          generated_at: new Date().toISOString(),
          summary: { total_drifts: 0, critical: 0, warning: 0, info: 0 },
          drifts: [],
          in_sync: { sprints: [], stories: 0 },
          error: 'No session state found',
        });

      const sprintStatuses: Record<string, unknown> =
        (session.sprint_backlog && session.sprint_backlog.sprint_statuses) || {};
      const planPath = session.sprint_backlog && session.sprint_backlog.path;
      let sprintPlanContent: string | null = null;
      if (planPath) {
        const abs = path.resolve(PROJECT_ROOT, planPath);
        try {
          sprintPlanContent = await fsp.readFile(abs, 'utf8');
        } catch {
          /* missing plan */
        }
      }

      const sprintsDir = path.join(DOC_ROOT, 'sprints');
      const phase5Dir = path.join(DOC_ROOT, 'phase-5');
      const syncReports: Record<string, string | null> = {};
      for (const sprintId of Object.keys(sprintStatuses)) {
        syncReports[sprintId] = null;
        const p1 = path.join(sprintsDir, sprintId, 'github-sync-report.md');
        try {
          syncReports[sprintId] = await fsp.readFile(p1, 'utf8');
          continue;
        } catch {
          /* */
        }
        const p2 = path.join(phase5Dir, `sprint-${sprintId}`, 'github-sync-report.md');
        try {
          syncReports[sprintId] = await fsp.readFile(p2, 'utf8');
        } catch {
          /* */
        }
      }

      const report = detectDrift({ sessionState: session, sprintPlanContent, syncReports });
      return jsonResult(report);
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
      const n = Math.min(Math.max(Number(limit) || 50, 1), 1000);
      const entries = audit.read(n);
      return jsonResult({ total: entries.length, entries });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to read audit log: ${message}`);
    }
  }
);

/* ── Governance Approvals ───────────────────────────────────────── */

const GOVERNANCE_STATE_PATH = path.join(SESSION_DIR, 'governance-state.json');

function loadGovernanceEngine():
  | import('../../platform/sdlc/governance.js').GovernanceEngine
  | null {
  // Dynamic import to avoid circular dependencies at module level
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GovernanceEngine } = require('../../platform/sdlc/governance') as {
    GovernanceEngine: {
      loadFrom(
        s: { exists(p: string): boolean; readFile(p: string): string },
        p: string
      ): import('../../platform/sdlc/governance.js').GovernanceEngine | null;
    };
  };
  return GovernanceEngine.loadFrom(store, GOVERNANCE_STATE_PATH);
}

mcp.tool('list_approvals', 'List pending governance approval requests', async () => {
  try {
    const engine = loadGovernanceEngine();
    if (!engine) return jsonResult({ approvals: [], count: 0, note: 'No governance state found' });
    const pending = engine.getPendingApprovals();
    return jsonResult({
      approvals: pending.map((a) => ({
        id: a.id,
        entity_id: a.entity_id,
        gate_id: a.gate_id,
        stage: a.stage,
        requested_by: a.requested_by,
        requested_at: a.requested_at,
        required_role: a.required_role,
        status: a.status,
      })),
      count: pending.length,
    });
  } catch (err: unknown) {
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
      const engine = loadGovernanceEngine();
      if (!engine) return errorResult('No governance state found');
      const result = engine.decide(
        String(approval_id),
        String(user),
        true,
        String(reason || 'Approved via MCP')
      );
      engine.saveTo(store, GOVERNANCE_STATE_PATH);
      return jsonResult({
        ok: true,
        approval: {
          id: result.id,
          status: result.status,
          decided_by: result.decided_by,
          decided_at: result.decided_at,
          reason: result.reason,
        },
      });
    } catch (err: unknown) {
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
      const engine = loadGovernanceEngine();
      if (!engine) return errorResult('No governance state found');
      const result = engine.decide(String(approval_id), String(user), false, String(reason));
      engine.saveTo(store, GOVERNANCE_STATE_PATH);
      return jsonResult({
        ok: true,
        approval: {
          id: result.id,
          status: result.status,
          decided_by: result.decided_by,
          decided_at: result.decided_at,
          reason: result.reason,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(`Failed to reject: ${message}`);
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
        text: JSON.stringify(await readSessionState(), null, 2),
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
        text: JSON.stringify(await readDecisions(), null, 2),
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
        text: JSON.stringify(await readCommandQueue(), null, 2),
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
    const transport = new StdioServerTransport();
    await mcp.connect(transport);
  })().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`MCP server fatal error: ${message}\n`);
    process.exit(1);
  });
}

/* ── Exports for testing ────────────────────────────────────────── */
export {
  discoverQuestionnaires,
  readSessionState,
  readCommandQueue,
  readDecisions,
  buildProgress,
  jsonResult,
  errorResult,
  safeWrite,
  mcp,
  PROJECT_ROOT,
  DOC_ROOT,
  BUSINESS_DOCS,
  SESSION_DIR,
  DECISIONS_PATH,
};
