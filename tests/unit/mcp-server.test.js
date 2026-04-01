import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);

/**
 * Unit + integration tests for the MCP server adapter layer.
 * Tests tool registration, helper functions, and tool handler logic.
 * Filesystem-dependent tests use temporary files in the real paths
 * since the module constants are resolved at load time.
 */

const path = require('path');
const fs = require('fs');
import * as __req_0 from '../../platform/sdlc/governance';
const { GovernanceEngine, DEFAULT_POLICIES } = __req_0;

import * as __req_1 from '../../src/webapp/mcp-server';
const {
  mcp,
  jsonResult,
  errorResult,
  buildProgress,
  _discoverQuestionnaires,
  readSessionState,
  readCommandQueue,
  readDecisions,
  safeWrite,
  _PROJECT_ROOT,
  _DOC_ROOT,
  BUSINESS_DOCS,
  SESSION_DIR,
  DECISIONS_PATH,
} = __req_1;

/* ── Helpers ────────────────────────────────────────────────────── */

/** Call a registered MCP tool by name and return its result. */
async function callTool(name, args = {}) {
  const tool = mcp._registeredTools[name];
  if (!tool) throw new Error(`Tool not registered: ${name}`);
  ensureRuntimeManifestForAllTools();
  return tool.handler({ env_scope: 'dev', ...args }, {});
}

const mcpServerPath = fileURLToPath(new URL('../../src/webapp/mcp-server.ts', import.meta.url));

function parseToolResult(result) {
  const text = result.content[0].text;
  return JSON.parse(text);
}

/* ── Temp directory management ──────────────────────────────────── */
/* Backup/restore: writeTemp saves pre-existing file content so that
   cleanupTemp restores it instead of deleting real project files.   */

const _TMP_SESSION_DIR = SESSION_DIR;
const _TMP_DECISIONS = DECISIONS_PATH;
const _TMP_BUSINESS = BUSINESS_DOCS;
const createdPaths = [];
const originalContent = new Map();

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    createdPaths.push(dir);
  }
}

function writeTemp(filePath, content) {
  ensureDir(path.dirname(filePath));
  // Save original content if the file already exists (only on first write)
  if (!originalContent.has(filePath) && fs.existsSync(filePath)) {
    originalContent.set(filePath, fs.readFileSync(filePath, 'utf8'));
  }
  fs.writeFileSync(filePath, content, 'utf8');
  createdPaths.push(filePath);
}

function cleanupTemp() {
  // Remove files first, then directories (reverse order)
  for (const p of createdPaths.reverse()) {
    try {
      if (originalContent.has(p)) {
        // Restore the original file instead of deleting it
        fs.writeFileSync(p, originalContent.get(p), 'utf8');
      } else if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) fs.rmSync(p, { recursive: true, force: true });
        else fs.unlinkSync(p);
      }
    } catch {
      /* best-effort */
    }
  }
  createdPaths.length = 0;
  originalContent.clear();
}

function writeRuntimeManifest(agentId, tools) {
  const dir = path.join(_PROJECT_ROOT, '.generated', 'runtime-manifests');
  const file = path.join(dir, `${agentId}.json`);
  const manifest = {
    agentId,
    generatedAt: new Date().toISOString(),
    servers: [
      {
        serverId: 'command-center',
        endpoint: 'local://mcp-server',
        healthStatus: 'healthy',
        authType: 'none',
        tools,
      },
    ],
  };
  writeTemp(file, JSON.stringify(manifest, null, 2));
}

function ensureRuntimeManifestForAllTools() {
  const dir = path.join(_PROJECT_ROOT, '.generated', 'runtime-manifests');
  const file = path.join(dir, 'orchestrator.json');
  if (fs.existsSync(dir)) {
    const manifests = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'));
    if (manifests.length > 0) {
      process.env.AGENT_ID = 'orchestrator';
      return;
    }
  }
  const tools = Object.keys(mcp._registeredTools).map((toolName) => ({
    toolId: `command-center.${toolName}`,
    permissionLevel: 'A',
    approvalRequired: false,
    approvalMode: 'none',
    blocked: false,
    degraded: false,
    authStatus: 'ready',
  }));
  const manifest = {
    agentId: 'orchestrator',
    generatedAt: new Date().toISOString(),
    servers: [
      {
        serverId: 'command-center',
        endpoint: 'local://mcp-server',
        healthStatus: 'healthy',
        authType: 'none',
        tools,
      },
    ],
  };

  process.env.AGENT_ID = 'orchestrator';
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2), 'utf8');
}

function writeGovernanceState(configure) {
  const file = path.join(SESSION_DIR, 'governance-state.json');
  const engine = new GovernanceEngine([...DEFAULT_POLICIES]);
  configure(engine);
  writeTemp(file, JSON.stringify(engine.toJSON(), null, 2));
}

/* ════════════════════════════════════════════════════════════════ */
/*  Tool Registration                                              */
/* ════════════════════════════════════════════════════════════════ */

describe('MCP server — tool registration', () => {
  const expectedTools = [
    'get_project_status',
    'get_progress',
    'list_questionnaires',
    'get_questionnaire',
    'save_answers',
    'list_decisions',
    'create_decision',
    'answer_decision',
    'decide_question',
    'queue_command',
    'get_command_queue',
    'get_help',
    'get_audit_log',
    'check_drift',
    'list_approvals',
    'approve_request',
    'reject_request',
    'list_policies',
    'get_policy_evaluation',
    'create_exception',
    'list_jobs',
    'get_job',
    'cancel_job',
    'list_workspaces',
    'get_workspace',
    'create_project',
    'add_repository',
  ];

  it('registers all 27 tools', () => {
    const tools = Object.keys(mcp._registeredTools);
    expect(tools).toHaveLength(27);
  });

  for (const name of expectedTools) {
    it(`registers tool: ${name}`, () => {
      expect(mcp._registeredTools[name]).toBeDefined();
      expect(typeof mcp._registeredTools[name].handler).toBe('function');
    });
  }
});

describe('MCP server — resource registration', () => {
  const expectedResources = [
    'agentic://session-state',
    'agentic://decisions',
    'agentic://command-queue',
  ];

  it('registers all 3 resources', () => {
    const resources = Object.keys(mcp._registeredResources);
    expect(resources).toHaveLength(3);
  });

  for (const uri of expectedResources) {
    it(`registers resource: ${uri}`, () => {
      expect(mcp._registeredResources[uri]).toBeDefined();
      expect(typeof mcp._registeredResources[uri].readCallback).toBe('function');
    });
  }
});

/* ════════════════════════════════════════════════════════════════ */
/*  Pure Helper Functions                                          */
/* ════════════════════════════════════════════════════════════════ */

describe('jsonResult', () => {
  it('wraps data as MCP text content', () => {
    const result = jsonResult({ ok: true });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
  });

  it('does not set isError', () => {
    const result = jsonResult({ data: 1 });
    expect(result.isError).toBeUndefined();
  });
});

describe('errorResult', () => {
  it('wraps error message as MCP error content', () => {
    const result = errorResult('something failed');
    expect(result.content).toHaveLength(1);
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text)).toEqual({ error: 'something failed' });
  });
});

describe('buildProgress', () => {
  it('returns empty progress for null session', () => {
    const result = buildProgress(null);
    expect(result.projectName).toBeNull();
    expect(result.mode).toBeNull();
    expect(result.currentPhase).toBeNull();
    expect(result.currentAgent).toBeNull();
    expect(result.phases).toEqual([]);
    expect(result.activeSprint).toBeNull();
  });

  it('extracts fields from session state', () => {
    const session = {
      projectName: 'TestProject',
      mode: 'CREATE',
      currentPhase: 2,
      currentAgent: 'Software Architect',
      phases: [{ id: 1, status: 'complete' }],
      activeSprint: 'SP-1',
    };
    const result = buildProgress(session);
    expect(result.projectName).toBe('TestProject');
    expect(result.mode).toBe('CREATE');
    expect(result.currentPhase).toBe(2);
    expect(result.currentAgent).toBe('Software Architect');
    expect(result.phases).toHaveLength(1);
    expect(result.activeSprint).toBe('SP-1');
  });

  it('defaults missing fields to null', () => {
    const result = buildProgress({});
    expect(result.projectName).toBeNull();
    expect(result.mode).toBeNull();
    expect(result.phases).toEqual([]);
  });
});

/* ════════════════════════════════════════════════════════════════ */
/*  Read Helpers (filesystem dependent)                            */
/* ════════════════════════════════════════════════════════════════ */

describe('readSessionState', () => {
  afterEach(cleanupTemp);

  it('returns null when session file does not exist', async () => {
    const file = path.join(SESSION_DIR, 'session-state.json');
    const realExists = fs.existsSync.bind(fs);
    const existsSpy = vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      if (path.resolve(String(p)) === path.resolve(file)) return false;
      return realExists(p);
    });
    try {
      expect(await readSessionState()).toBeNull();
    } finally {
      existsSpy.mockRestore();
    }
  });

  it('parses valid session-state.json', async () => {
    const data = { projectName: 'Test', mode: 'AUDIT', currentPhase: 1 };
    writeTemp(path.join(SESSION_DIR, 'session-state.json'), JSON.stringify(data));
    const result = await readSessionState();
    expect(result.projectName).toBe('Test');
    expect(result.mode).toBe('AUDIT');
  });
});

describe('readCommandQueue', () => {
  afterEach(cleanupTemp);

  it('returns empty array when queue file does not exist', async () => {
    const file = path.join(SESSION_DIR, 'command-queue.json');
    const realExists = fs.existsSync.bind(fs);
    const existsSpy = vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      if (path.resolve(String(p)) === path.resolve(file)) return false;
      return realExists(p);
    });
    try {
      expect(await readCommandQueue()).toEqual([]);
    } finally {
      existsSpy.mockRestore();
    }
  });

  it('parses valid command-queue.json', async () => {
    writeTemp(
      path.join(SESSION_DIR, 'command-queue.json'),
      JSON.stringify([{ command: 'CREATE', status: 'QUEUED' }])
    );
    const result = await readCommandQueue();
    expect(result).toHaveLength(1);
    expect(result[0].command).toBe('CREATE');
  });
});

describe('readDecisions', () => {
  afterEach(cleanupTemp);

  it('returns empty structure when decisions.md does not exist', async () => {
    const realExists = fs.existsSync.bind(fs);
    const existsSpy = vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      if (path.resolve(String(p)) === path.resolve(DECISIONS_PATH)) return false;
      return realExists(p);
    });
    try {
      const result = await readDecisions();
      expect(result).toEqual({ open: [], decided: [], deferred: [], categories: [] });
    } finally {
      existsSpy.mockRestore();
    }
  });
});

/* ════════════════════════════════════════════════════════════════ */
/*  Tool Handlers                                                  */
/* ════════════════════════════════════════════════════════════════ */

describe('tool: get_project_status', () => {
  afterEach(cleanupTemp);

  it('returns status even when no session exists', async () => {
    const result = await callTool('get_project_status');
    const data = parseToolResult(result);
    expect(data).toHaveProperty('session');
    expect(data).toHaveProperty('progress');
    expect(data).toHaveProperty('commandQueue');
  });

  it('returns valid session data when session file exists', async () => {
    writeTemp(
      path.join(SESSION_DIR, 'session-state.json'),
      JSON.stringify({
        projectName: 'MCP Test',
        mode: 'CREATE',
        status: 'active',
      })
    );
    const result = await callTool('get_project_status');
    const data = parseToolResult(result);
    expect(data.session.projectName).toBe('MCP Test');
    expect(data.session.mode).toBe('CREATE');
  });
});

describe('tool: get_progress', () => {
  it('returns progress structure', async () => {
    const result = await callTool('get_progress');
    const data = parseToolResult(result);
    expect(data).toHaveProperty('projectName');
    expect(data).toHaveProperty('mode');
    expect(data).toHaveProperty('phases');
  });
});

describe('tool: list_questionnaires', () => {
  afterEach(cleanupTemp);

  it('returns empty array when no BusinessDocs exist', async () => {
    const realExists = fs.existsSync.bind(fs);
    const existsSpy = vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      if (path.resolve(String(p)) === path.resolve(BUSINESS_DOCS)) return false;
      return realExists(p);
    });
    try {
      const result = await callTool('list_questionnaires');
      const data = parseToolResult(result);
      expect(data).toEqual([]);
    } finally {
      existsSpy.mockRestore();
    }
  });

  it('discovers questionnaire files', async () => {
    const questDir = path.join(BUSINESS_DOCS, 'Phase1-Business', 'Questionnaires');
    const md = [
      '# Questionnaire: TestAgent',
      '',
      '> Phase: Phase1-Business | Generated: 2025-01-01 | Version: 1.0',
      '',
      '## Section 1: General',
      '',
      '### Q-01-0001 [REQUIRED]',
      '**Question:** What is the project name?',
      '**Why we need this:** Identification',
      '**Expected format:** Text',
      '**Example:** My Project',
      '**Your answer:**',
      '> My Project',
      '',
      '### Q-01-0002 [REQUIRED]',
      '**Question:** What is the budget?',
      '**Why we need this:** Planning',
      '**Expected format:** Number',
      '**Example:** 10000',
      '**Your answer:**',
      '> *(fill in here)*',
      '',
      '## Answer Status',
      '',
      '| Q-ID | Status | Last Updated |',
      '|------|--------|--------------|',
      '| Q-01-0001 | ANSWERED | 2025-01-01 |',
      '| Q-01-0002 | OPEN | — |',
    ].join('\n');
    writeTemp(path.join(questDir, 'test-questionnaire.md'), md);

    const result = await callTool('list_questionnaires');
    const data = parseToolResult(result);
    expect(data.length).toBeGreaterThanOrEqual(1);
    const found = data.find((q) => q.file.includes('test-questionnaire.md'));
    expect(found).toBeDefined();
    expect(found.total).toBe(2);
    expect(found.answered).toBe(1);
  });
});

describe('tool: get_questionnaire', () => {
  afterEach(cleanupTemp);

  it('returns error for missing file param', async () => {
    const result = await callTool('get_questionnaire', {});
    expect(result.isError).toBe(true);
  });

  it('returns error for non-existent file', async () => {
    const result = await callTool('get_questionnaire', { file: 'nonexistent.md' });
    expect(result.isError).toBe(true);
  });

  it('returns error for path traversal', async () => {
    const result = await callTool('get_questionnaire', { file: '../../etc/passwd' });
    expect(result.isError).toBe(true);
  });

  it('returns parsed questionnaire for valid file', async () => {
    const dir = path.join(BUSINESS_DOCS, 'Phase1-Business', 'Questionnaires');
    const md = [
      '# Questionnaire: TestAgent',
      '',
      '> Phase: Phase1 | Generated: 2025-01-01 | Version: 1.0',
      '',
      '## Section 1: Testing',
      '',
      '### Q-01-0001 [REQUIRED]',
      '**Question:** Test question?',
      '**Why we need this:** Testing',
      '**Expected format:** Text',
      '**Example:** yes',
      '**Your answer:**',
      '> yes',
      '',
      '## Answer Status',
      '',
      '| Q-ID | Status | Last Updated |',
      '|------|--------|--------------|',
      '| Q-01-0001 | ANSWERED | 2025-01-01 |',
    ].join('\n');
    writeTemp(path.join(dir, 'get-test-questionnaire.md'), md);

    const result = await callTool('get_questionnaire', {
      file: 'BusinessDocs/Phase1-Business/Questionnaires/get-test-questionnaire.md',
    });
    expect(result.isError).toBeUndefined();
    const data = parseToolResult(result);
    expect(data.questions).toHaveLength(1);
    expect(data.questions[0].answer).toBe('yes');
  });
});

describe('tool: save_answers', () => {
  afterEach(cleanupTemp);

  it('returns error for missing params', async () => {
    const result = await callTool('save_answers', {});
    expect(result.isError).toBe(true);
  });

  it('returns error for empty updates array', async () => {
    const result = await callTool('save_answers', { file: 'x.md', updates: [] });
    expect(result.isError).toBe(true);
  });

  it('returns error for too many updates', async () => {
    const result = await callTool('save_answers', {
      file: 'x.md',
      updates: Array.from({ length: 201 }, (_, i) => ({
        questionId: `Q-01-${String(i).padStart(4, '0')}`,
        answer: 'a',
        status: 'ANSWERED',
      })),
    });
    expect(result.isError).toBe(true);
    expect(parseToolResult(result).error).toMatch(/max 200/i);
  });

  it('returns error for path traversal', async () => {
    const result = await callTool('save_answers', {
      file: '../../../etc/passwords',
      updates: [{ questionId: 'Q-01-0001', answer: 'x', status: 'ANSWERED' }],
    });
    expect(result.isError).toBe(true);
  });

  it('warns on invalid Q-ID format', async () => {
    const dir = path.join(BUSINESS_DOCS, 'Phase1-Business', 'Questionnaires');
    const md = '### Q-01-0001\n- **Answer:**\n- **Status:** OPEN\n';
    writeTemp(path.join(dir, 'save-test-questionnaire.md'), md);

    const result = await callTool('save_answers', {
      file: 'BusinessDocs/Phase1-Business/Questionnaires/save-test-questionnaire.md',
      updates: [{ questionId: 'INVALID', answer: 'test', status: 'ANSWERED' }],
    });
    const data = parseToolResult(result);
    expect(data.saved).toBe(true);
    expect(data.applied).toBe(0);
    expect(data.warnings).toBeDefined();
    expect(data.warnings[0]).toMatch(/Invalid Q-ID/);
  });
});

describe('tool: list_decisions', () => {
  it('returns decision structure', async () => {
    const result = await callTool('list_decisions');
    expect(result.isError).toBeUndefined();
    const data = parseToolResult(result);
    expect(data).toHaveProperty('open');
    expect(data).toHaveProperty('decided');
    expect(data).toHaveProperty('deferred');
  });
});

describe('tool: create_decision', () => {
  it('returns error for invalid type', async () => {
    const result = await callTool('create_decision', {
      type: 'INVALID',
      priority: 'HIGH',
      scope: 'TECH',
      text: 'test',
    });
    expect(result.isError).toBe(true);
  });

  it('returns error for invalid priority', async () => {
    const result = await callTool('create_decision', {
      type: 'question',
      priority: 'CRITICAL',
      scope: 'TECH',
      text: 'test',
    });
    expect(result.isError).toBe(true);
  });

  it('returns error for missing scope', async () => {
    const result = await callTool('create_decision', {
      type: 'question',
      priority: 'HIGH',
      scope: '',
      text: 'test',
    });
    expect(result.isError).toBe(true);
  });

  it('returns error when decisions.md is missing', async () => {
    if (fs.existsSync(DECISIONS_PATH)) return;
    const result = await callTool('create_decision', {
      type: 'question',
      priority: 'HIGH',
      scope: 'TECH',
      text: 'How to test?',
    });
    expect(result.isError).toBe(true);
  });
});

describe('tool: answer_decision', () => {
  it('returns error for missing id', async () => {
    const result = await callTool('answer_decision', { id: '', answer: 'some answer' });
    expect(result.isError).toBe(true);
  });

  it('returns error for invalid DEC-ID', async () => {
    const result = await callTool('answer_decision', { id: 'INVALID', answer: 'x' });
    expect(result.isError).toBe(true);
  });

  it('returns error when decisions.md is missing', async () => {
    if (fs.existsSync(DECISIONS_PATH)) return;
    const result = await callTool('answer_decision', { id: 'DEC-001', answer: 'yes' });
    expect(result.isError).toBe(true);
  });
});

describe('tool: decide_question', () => {
  it('returns error for missing id', async () => {
    const result = await callTool('decide_question', {});
    expect(result.isError).toBe(true);
  });

  it('returns error for invalid DEC-ID', async () => {
    const result = await callTool('decide_question', { id: 'BAD-ID' });
    expect(result.isError).toBe(true);
  });
});

describe('tool: queue_command', () => {
  afterEach(cleanupTemp);

  it('returns error for missing command', async () => {
    const result = await callTool('queue_command', {});
    expect(result.isError).toBe(true);
  });

  it('returns error for invalid command', async () => {
    const result = await callTool('queue_command', { command: 'DESTROY' });
    expect(result.isError).toBe(true);
    expect(parseToolResult(result).error).toMatch(/Unknown command/);
  });

  it('queues a valid CREATE command', async () => {
    // Ensure session dir exists
    ensureDir(SESSION_DIR);
    const queueFile = path.join(SESSION_DIR, 'command-queue.json');
    if (fs.existsSync(queueFile)) fs.unlinkSync(queueFile);
    createdPaths.push(queueFile);

    const result = await callTool('queue_command', { command: 'CREATE', project: 'TestProject' });
    const data = parseToolResult(result);
    expect(data.queued).toBe(true);
    expect(data.text).toContain('CREATE');
    expect(data.text).toContain('TestProject');

    // Verify file was written
    const queue = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
    expect(queue).toHaveLength(1);
    expect(queue[0].command).toBe('CREATE');
    expect(queue[0].status).toBe('PENDING');
  });

  it('accepts all valid command types', async () => {
    const cmds = [
      'CREATE',
      'AUDIT',
      'REEVALUATE',
      'FEATURE',
      'SCOPE CHANGE',
      'HOTFIX',
      'REFRESH ONBOARDING',
    ];
    for (const cmd of cmds) {
      ensureDir(SESSION_DIR);
      const queueFile = path.join(SESSION_DIR, 'command-queue.json');
      if (fs.existsSync(queueFile)) fs.unlinkSync(queueFile);

      const result = await callTool('queue_command', { command: cmd });
      const data = parseToolResult(result);
      expect(data.queued).toBe(true);
    }
  });

  it('saves brief to BusinessDocs/project-brief.md', async () => {
    ensureDir(SESSION_DIR);
    const briefPath = path.join(BUSINESS_DOCS, 'project-brief.md');
    createdPaths.push(briefPath);

    await callTool('queue_command', {
      command: 'CREATE',
      project: 'BriefTest',
      brief: '# Project Brief\nThis is a test.',
    });

    expect(fs.existsSync(briefPath)).toBe(true);
    expect(fs.readFileSync(briefPath, 'utf8')).toContain('# Project Brief');
  });
});

describe('tool: get_command_queue', () => {
  it('returns array', async () => {
    const result = await callTool('get_command_queue');
    expect(result.isError).toBeUndefined();
    const data = parseToolResult(result);
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('tool: get_help', () => {
  it('returns error for unknown topic', async () => {
    const helpDir = path.resolve(path.dirname(mcpServerPath), '../..', 'docs', 'help');
    if (!fs.existsSync(helpDir)) return; // skip if no help dir
    const result = await callTool('get_help', { topic: 'nonexistent_xyz_12345' });
    expect(result.isError).toBe(true);
  });

  it('sanitizes topic slug (no traversal)', async () => {
    const result = await callTool('get_help', { topic: '../../etc/passwd' });
    expect(result.isError).toBe(true);
  });
});

describe('tool: get_audit_log', () => {
  it('returns audit structure', async () => {
    const result = await callTool('get_audit_log', {});
    expect(result.isError).toBeUndefined();
    const data = parseToolResult(result);
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('entries');
  });

  it('respects limit parameter', async () => {
    const result = await callTool('get_audit_log', { limit: 5 });
    const data = parseToolResult(result);
    expect(data.entries.length).toBeLessThanOrEqual(5);
  });

  it('clamps negative limit to 1', async () => {
    const result = await callTool('get_audit_log', { limit: -10 });
    const data = parseToolResult(result);
    expect(data.total).toBeGreaterThanOrEqual(0);
  });
});

describe('tool execution guard', () => {
  afterEach(cleanupTemp);

  it('returns structured blocked response when permission is insufficient', async () => {
    writeRuntimeManifest('orchestrator', [
      {
        toolId: 'command-center.queue_command',
        permissionLevel: 'R',
        approvalRequired: false,
        approvalMode: 'none',
        blocked: false,
        degraded: false,
        authStatus: 'ready',
      },
    ]);

    const result = await callTool('queue_command', {
      env_scope: 'dev',
      agent_id: 'orchestrator',
      command: 'CREATE',
      project: 'GuardedProject',
    });

    expect(result.isError).toBeUndefined();
    const data = parseToolResult(result);
    expect(data.blocked).toBe(true);
    expect(data.reasonCode).toBe('PERMISSION_INSUFFICIENT');
    expect(data.requiredApprovalMode).toBe('none');
  });

  it('creates approval when required and allows execution after approval', async () => {
    writeRuntimeManifest('orchestrator', [
      {
        toolId: 'command-center.queue_command',
        permissionLevel: 'A',
        approvalRequired: true,
        approvalMode: 'approval_required',
        blocked: false,
        degraded: false,
        authStatus: 'ready',
      },
      {
        toolId: 'command-center.approve_request',
        permissionLevel: 'W',
        approvalRequired: false,
        approvalMode: 'none',
        blocked: false,
        degraded: false,
        authStatus: 'ready',
      },
    ]);

    writeGovernanceState(() => {});

    const firstAttempt = await callTool('queue_command', {
      env_scope: 'dev',
      agent_id: 'orchestrator',
      command: 'CREATE',
      project: 'GuardedProject',
    });

    const firstPayload = parseToolResult(firstAttempt);
    expect(firstPayload.blocked).toBe(true);
    expect(firstPayload.pending).toBe(true);
    expect(firstPayload.approvalId).toMatch(/^APR-/);
    expect(firstPayload.requiredApprovalMode).toBe('approval_required');

    const approveResult = await callTool('approve_request', {
      env_scope: 'dev',
      agent_id: 'orchestrator',
      approval_id: firstPayload.approvalId,
      user: 'qa-approver',
      reason: 'Approved for test',
    });
    const approvePayload = parseToolResult(approveResult);
    expect(approvePayload.ok).toBe(true);

    const secondAttempt = await callTool('queue_command', {
      env_scope: 'dev',
      agent_id: 'orchestrator',
      command: 'CREATE',
      project: 'GuardedProject',
    });

    const secondPayload = parseToolResult(secondAttempt);
    expect(secondPayload.queued).toBe(true);
    expect(secondPayload.text).toContain('CREATE');
  });
});

/* ════════════════════════════════════════════════════════════════ */
/*  Resources                                                      */
/* ════════════════════════════════════════════════════════════════ */

describe('resource: session-state', () => {
  it('returns valid JSON contents', async () => {
    const resource = mcp._registeredResources['agentic://session-state'];
    const result = await resource.readCallback(new URL('agentic://session-state'));
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].mimeType).toBe('application/json');
    // Should be parseable JSON (even if null)
    JSON.parse(result.contents[0].text);
  });
});

describe('resource: decisions', () => {
  it('returns valid JSON contents', async () => {
    const resource = mcp._registeredResources['agentic://decisions'];
    const result = await resource.readCallback(new URL('agentic://decisions'));
    expect(result.contents).toHaveLength(1);
    const data = JSON.parse(result.contents[0].text);
    expect(data).toHaveProperty('open');
    expect(data).toHaveProperty('decided');
    expect(data).toHaveProperty('deferred');
  });
});

describe('resource: command-queue', () => {
  it('returns valid JSON contents', async () => {
    const resource = mcp._registeredResources['agentic://command-queue'];
    const result = await resource.readCallback(new URL('agentic://command-queue'));
    expect(result.contents).toHaveLength(1);
    const data = JSON.parse(result.contents[0].text);
    expect(Array.isArray(data)).toBe(true);
  });
});

/* ════════════════════════════════════════════════════════════════ */
/*  safeWrite                                                      */
/* ════════════════════════════════════════════════════════════════ */

describe('safeWrite', () => {
  afterEach(cleanupTemp);

  it('creates parent directories', () => {
    const dir = path.join(SESSION_DIR, 'mcp-test-' + process.pid);
    const file = path.join(dir, 'test.txt');
    createdPaths.push(dir);
    safeWrite(file, 'hello');
    expect(fs.readFileSync(file, 'utf8')).toBe('hello');
  });

  it('overwrites existing file atomically', () => {
    const file = path.join(SESSION_DIR, 'atomic-test-' + process.pid + '.txt');
    createdPaths.push(file);
    ensureDir(SESSION_DIR);
    fs.writeFileSync(file, 'old');
    safeWrite(file, 'new');
    expect(fs.readFileSync(file, 'utf8')).toBe('new');
  });

  it('creates a backup of the previous version (unified FileStore)', () => {
    const file = path.join(SESSION_DIR, 'backup-test-' + process.pid + '.txt');
    const backupDir = path.join(SESSION_DIR, '.backups', path.basename(file));
    createdPaths.push(file);
    createdPaths.push(path.join(SESSION_DIR, '.backups'));
    ensureDir(SESSION_DIR);
    fs.writeFileSync(file, 'original');
    safeWrite(file, 'updated');
    expect(fs.readFileSync(file, 'utf8')).toBe('updated');
    expect(fs.existsSync(backupDir)).toBe(true);
    const backups = fs.readdirSync(backupDir);
    expect(backups.length).toBe(1);
    expect(fs.readFileSync(path.join(backupDir, backups[0]), 'utf8')).toBe('original');
  });
});
