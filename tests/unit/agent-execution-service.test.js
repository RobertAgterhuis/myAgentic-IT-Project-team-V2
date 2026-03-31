// Copyright (c) 2026 Robert Agterhuis. MIT License.

import {
  AgentExecutionService,
  AgentNotFoundError,
  AgentCancelledError,
} from '../../src/webapp/services/agent-execution-service';
import { Dispatcher } from '../../platform/engine/dispatcher';

/* ── Mock ServiceContext ─────────────────────────────────── */

function createMockServiceContext() {
  return {
    store: {
      exists: vi.fn().mockReturnValue(false),
      readFile: vi.fn(),
    },
    cache: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
    audit: { log: vi.fn() },
    safeWrite: vi.fn(),
    projectRoot: '/tmp/test',
    businessDocs: '/tmp/test/BusinessDocs',
    sessionDir: '/tmp/test/BusinessDocs/session',
    decisionsFile: '/tmp/test/BusinessDocs/decisions.md',
    decisionsDir: '/tmp/test/BusinessDocs/decisions',
    commandQueue: '/tmp/test/BusinessDocs/session/command-queue.json',
    helpDir: '/tmp/test/src/webapp/ui/src/help',
    ragStore: undefined,
    embeddingProvider: undefined,
  };
}

/* ── Tests ────────────────────────────────────────────────── */

describe('AgentExecutionService', () => {
  let svc;
  let mockCtx;

  beforeEach(() => {
    mockCtx = createMockServiceContext();
    svc = new AgentExecutionService(mockCtx);
  });

  describe('getAgentInfo', () => {
    it('returns info for a known agent', () => {
      const info = svc.getAgentInfo('05');
      expect(info).toBeDefined();
      expect(info.id).toBe('05');
      expect(info.name).toBe('Software Architect');
      expect(info.phase).toBeDefined();
    });

    it('returns undefined for an unknown agent', () => {
      expect(svc.getAgentInfo('nonexistent-agent')).toBeUndefined();
    });
  });

  describe('listKnownAgents', () => {
    it('returns an array of agents', () => {
      const agents = svc.listKnownAgents();
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeGreaterThan(0);
    });

    it('each agent has id, name, and phase', () => {
      const agents = svc.listKnownAgents();
      for (const agent of agents) {
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('phase');
      }
    });
  });

  describe('execute', () => {
    let invokeSpy;
    let buildContextSpy;

    beforeEach(() => {
      buildContextSpy = vi
        .spyOn(Dispatcher.prototype, 'buildContext')
        .mockReturnValue({ agentId: '05' });
      invokeSpy = vi.spyOn(Dispatcher.prototype, 'invoke');
    });

    afterEach(() => {
      invokeSpy.mockRestore();
      buildContextSpy.mockRestore();
    });

    it('throws AgentNotFoundError for unknown agent', async () => {
      await expect(svc.execute({ agentId: 'nonexistent-agent' })).rejects.toThrow(
        AgentNotFoundError
      );
    });

    it('throws AgentNotFoundError with descriptive message', async () => {
      await expect(svc.execute({ agentId: 'bad-id' })).rejects.toThrow('Unknown agent ID: bad-id');
    });

    it('returns completed result on successful invoke', async () => {
      invokeSpy.mockResolvedValue({
        success: true,
        outputPath: '/output/test.md',
        confidence: 0.82,
        uncertainty_reasons: ['Model required 1 retry'],
        needs_human_review: true,
      });

      const result = await svc.execute({ agentId: '05' });
      expect(result.agent_id).toBe('05');
      expect(result.agent_name).toBe('Software Architect');
      expect(result.status).toBe('completed');
      expect(result.output_path).toBe('/output/test.md');
      expect(result.started_at).toBeDefined();
      expect(result.completed_at).toBeDefined();
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBe(0.82);
      expect(result.uncertainty_reasons).toEqual(['Model required 1 retry']);
      expect(result.needs_human_review).toBe(true);
      expect(result.logs.some((log) => log.message.includes('Confidence score: 82%'))).toBe(true);
      expect(
        result.logs.some((log) => log.message.includes('Uncertainty: Model required 1 retry'))
      ).toBe(true);
    });

    it('returns failed result when invoke returns success: false', async () => {
      invokeSpy.mockResolvedValue({
        success: false,
        error: 'Agent failed',
        confidence: 0,
        uncertainty_reasons: ['Agent failed'],
        needs_human_review: true,
      });

      const result = await svc.execute({ agentId: '05' });
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Agent failed');
      expect(result.confidence).toBe(0);
      expect(result.needs_human_review).toBe(true);
      expect(result.logs.some((log) => log.message.includes('Confidence score: 0%'))).toBe(true);
      expect(result.logs.some((log) => log.message.includes('Uncertainty: Agent failed'))).toBe(
        true
      );
    });

    it('returns failed result when invoke throws', async () => {
      invokeSpy.mockRejectedValue(new Error('Dispatcher crash'));

      const result = await svc.execute({ agentId: '05' });
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Dispatcher crash');
    });

    it('uses stricter confidence threshold for high-risk phases', async () => {
      invokeSpy.mockResolvedValue({
        success: true,
        outputPath: '/output/security.md',
        confidence: 0.7,
        uncertainty_reasons: [],
      });

      const result = await svc.execute({ agentId: '08' });
      expect(result.status).toBe('completed');
      expect(result.confidence).toBe(0.7);
      expect(result.needs_human_review).toBe(true);
      expect(result.logs.some((log) => log.message.includes('review threshold'))).toBe(true);
    });

    it('applies NEEDS_HUMAN_REVIEW_THRESHOLDS env override', async () => {
      const previous = process.env.NEEDS_HUMAN_REVIEW_THRESHOLDS;
      try {
        process.env.NEEDS_HUMAN_REVIEW_THRESHOLDS = JSON.stringify({ PHASE_2: 0.65 });

        invokeSpy.mockResolvedValue({
          success: true,
          outputPath: '/output/security.md',
          confidence: 0.7,
          uncertainty_reasons: [],
        });

        const result = await svc.execute({ agentId: '08' });
        expect(result.needs_human_review).toBe(false);
      } finally {
        if (previous === undefined) {
          delete process.env.NEEDS_HUMAN_REVIEW_THRESHOLDS;
        } else {
          process.env.NEEDS_HUMAN_REVIEW_THRESHOLDS = previous;
        }
      }
    });

    it('logs to audit on success', async () => {
      invokeSpy.mockResolvedValue({ success: true, outputPath: '/out.md' });

      await svc.execute({ agentId: '05' });
      expect(mockCtx.audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'AGENT_MANUAL_EXECUTE',
          entityId: '05',
        })
      );
    });

    it('injects workspace-scoped GitService into dispatcher context', async () => {
      invokeSpy.mockResolvedValue({ success: true, outputPath: '/out.md' });

      await svc.execute({
        agentId: '05',
        context: {
          workspaceId: 'ws-123',
        },
      });

      expect(buildContextSpy).toHaveBeenCalledWith(
        '05',
        expect.objectContaining({
          workspaceId: 'ws-123',
          gitService: expect.any(Object),
        })
      );
    });

    it('injects retrieved RAG context when predecessor or questionnaire files are provided', async () => {
      const predecessorPath = '/tmp/test/BusinessDocs/Phase2-Tech/05-architecture.md';
      const questionnairePath = '/tmp/test/BusinessDocs/questionnaire.md';
      mockCtx.store.exists.mockImplementation((filePath) =>
        [predecessorPath, questionnairePath].includes(filePath)
      );
      mockCtx.store.readFile.mockImplementation((filePath) => {
        if (filePath === predecessorPath) return 'Use React for the operator-facing shell.';
        if (filePath === questionnairePath) return 'Which UI framework should we use?';
        return '';
      });
      mockCtx.ragStore = {
        query: vi.fn().mockResolvedValue([
          {
            chunk: {
              source_path: '/tmp/test/BusinessDocs/decisions.md',
              chunk_text: 'Use React for the operator-facing web application shell.',
              start_line: 18,
            },
            score: 0.94,
          },
        ]),
      };
      mockCtx.embeddingProvider = {
        embedText: vi.fn().mockResolvedValue([0.2, 0.3, 0.4]),
      };
      invokeSpy.mockResolvedValue({ success: true, outputPath: '/out.md' });

      await svc.execute({
        agentId: '05',
        context: {
          predecessorPaths: [predecessorPath],
          questionnairePath,
        },
      });

      expect(buildContextSpy).toHaveBeenCalledWith(
        '05',
        expect.objectContaining({
          ragContext: expect.objectContaining({
            collections: expect.arrayContaining(['decisions']),
            matches: expect.arrayContaining([
              expect.objectContaining({
                source_path: 'BusinessDocs/decisions.md',
                collection: 'decisions',
              }),
            ]),
          }),
        })
      );

      expect(mockCtx.ragStore.query).toHaveBeenCalledWith('codebase', expect.any(Array), 3, 0.12);
    });

    it('uses non-technical RAG profile collections for strategy agents', async () => {
      const predecessorPath = '/tmp/test/BusinessDocs/Phase4-Marketing/14-brand.md';
      mockCtx.store.exists.mockImplementation((filePath) => [predecessorPath].includes(filePath));
      mockCtx.store.readFile.mockImplementation((filePath) => {
        if (filePath === predecessorPath) return 'Define brand pillars and launch positioning.';
        return '';
      });
      mockCtx.ragStore = {
        query: vi.fn().mockResolvedValue([]),
      };
      mockCtx.embeddingProvider = {
        embedText: vi.fn().mockResolvedValue([0.2, 0.3, 0.4]),
      };
      invokeSpy.mockResolvedValue({ success: true, outputPath: '/out.md' });

      await svc.execute({
        agentId: '14',
        context: {
          predecessorPaths: [predecessorPath],
        },
      });

      const queriedCollections = mockCtx.ragStore.query.mock.calls.map((call) => call[0]);
      expect(queriedCollections).toEqual(
        expect.arrayContaining(['decisions', 'phase-outputs', 'sprint-artifacts--default'])
      );
      expect(queriedCollections).not.toContain('codebase');
    });

    it('persists rag_retrieval_score to runtime metrics when grounding is injected', async () => {
      const predecessorPath = '/tmp/test/BusinessDocs/Phase2-Tech/05-architecture.md';
      mockCtx.store.exists.mockImplementation((filePath) => filePath === predecessorPath);
      mockCtx.store.readFile.mockImplementation((filePath) => {
        if (filePath === predecessorPath) return 'Use provider-based auth with role checks.';
        return '';
      });
      mockCtx.ragStore = {
        query: vi.fn().mockResolvedValue([
          {
            chunk: {
              source_path: '/tmp/test/BusinessDocs/decisions.md',
              chunk_text: 'Adopt provider-based auth middleware.',
              start_line: 10,
            },
            score: 0.7,
          },
          {
            chunk: {
              source_path: '/tmp/test/BusinessDocs/decisions.md',
              chunk_text: 'Persist authentication context in session.',
              start_line: 20,
            },
            score: 0.9,
          },
        ]),
      };
      mockCtx.embeddingProvider = {
        embedText: vi.fn().mockResolvedValue([0.2, 0.3, 0.4]),
      };
      invokeSpy.mockResolvedValue({ success: true, outputPath: '/out.md' });

      await svc.execute({
        agentId: '05',
        context: {
          predecessorPaths: [predecessorPath],
        },
      });

      expect(mockCtx.safeWrite).toHaveBeenCalled();
      const [metricsPath, content] = mockCtx.safeWrite.mock.calls.at(-1);
      expect(metricsPath.replace(/\\/g, '/')).toContain(
        '/BusinessDocs/metrics/runtime-metrics.json'
      );
      const parsed = JSON.parse(content);
      expect(parsed.rag_retrieval_score).toBeCloseTo(0.8, 6);
      expect(typeof parsed.rag_retrieval_score).toBe('number');
    });
  });

  describe('AgentNotFoundError', () => {
    it('is an instance of Error', () => {
      const err = new AgentNotFoundError('test');
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('AgentNotFoundError');
      expect(err.message).toBe('test');
    });
  });

  describe('AgentCancelledError', () => {
    it('is an instance of Error', () => {
      const err = new AgentCancelledError('cancelled');
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('AgentCancelledError');
      expect(err.message).toBe('cancelled');
    });
  });

  /* ── M31-002: getJobStatus ──────────────────────────────── */
  describe('getJobStatus (M31-002)', () => {
    let invokeSpy;
    let buildContextSpy;

    beforeEach(() => {
      buildContextSpy = vi
        .spyOn(Dispatcher.prototype, 'buildContext')
        .mockReturnValue({ agentId: '05' });
      invokeSpy = vi
        .spyOn(Dispatcher.prototype, 'invoke')
        .mockResolvedValue({ success: true, outputPath: '/output/test.md' });
    });

    afterEach(() => {
      invokeSpy.mockRestore();
      buildContextSpy.mockRestore();
    });

    it('returns job after execute', async () => {
      const result = await svc.execute({ agentId: '05' });
      const status = svc.getJobStatus(result.job_id);
      expect(status).toBeDefined();
      expect(status.agent_id).toBe('05');
    });

    it('returns undefined for unknown job', () => {
      expect(svc.getJobStatus('nonexistent-job')).toBeUndefined();
    });
  });

  /* ── M31-004: getJobResult ──────────────────────────────── */
  describe('getJobResult (M31-004)', () => {
    let invokeSpy;
    let buildContextSpy;

    beforeEach(() => {
      buildContextSpy = vi
        .spyOn(Dispatcher.prototype, 'buildContext')
        .mockReturnValue({ agentId: '05' });
      invokeSpy = vi
        .spyOn(Dispatcher.prototype, 'invoke')
        .mockResolvedValue({ success: true, outputPath: '/output/test.md' });
    });

    afterEach(() => {
      invokeSpy.mockRestore();
      buildContextSpy.mockRestore();
    });

    it('returns completed result with output_path', async () => {
      const result = await svc.execute({ agentId: '05' });
      const fetched = svc.getJobResult(result.job_id);
      expect(fetched).toBeDefined();
      expect(fetched.status).toBe('completed');
      expect(fetched.output_path).toBe('/output/test.md');
    });

    it('returns undefined for unknown job', () => {
      expect(svc.getJobResult('unknown-job')).toBeUndefined();
    });
  });

  /* ── M31-005: cancelJob ─────────────────────────────────── */
  describe('cancelJob (M31-005)', () => {
    it('returns false for unknown job', () => {
      expect(svc.cancelJob('nonexistent-job')).toBe(false);
    });
  });

  /* ── M31-009: listExecutionHistory ──────────────────────── */
  describe('listExecutionHistory (M31-009)', () => {
    let invokeSpy;
    let buildContextSpy;

    beforeEach(() => {
      buildContextSpy = vi
        .spyOn(Dispatcher.prototype, 'buildContext')
        .mockReturnValue({ agentId: '05' });
      invokeSpy = vi
        .spyOn(Dispatcher.prototype, 'invoke')
        .mockResolvedValue({ success: true, outputPath: '/output/test.md' });
    });

    afterEach(() => {
      invokeSpy.mockRestore();
      buildContextSpy.mockRestore();
    });

    it('returns an array', () => {
      const history = svc.listExecutionHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('includes executed jobs', async () => {
      await svc.execute({ agentId: '05' });
      const history = svc.listExecutionHistory();
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].agent_id).toBe('05');
    });
  });

  /* ── Execution logs ─────────────────────────────────────── */
  describe('execution logs', () => {
    let invokeSpy;
    let buildContextSpy;

    beforeEach(() => {
      buildContextSpy = vi
        .spyOn(Dispatcher.prototype, 'buildContext')
        .mockReturnValue({ agentId: '05' });
      invokeSpy = vi
        .spyOn(Dispatcher.prototype, 'invoke')
        .mockResolvedValue({ success: true, outputPath: '/output/test.md' });
    });

    afterEach(() => {
      invokeSpy.mockRestore();
      buildContextSpy.mockRestore();
    });

    it('result includes logs array', async () => {
      const result = await svc.execute({ agentId: '05' });
      expect(Array.isArray(result.logs)).toBe(true);
      expect(result.logs.length).toBeGreaterThanOrEqual(1);
    });

    it('each log entry has timestamp, level, and message', async () => {
      const result = await svc.execute({ agentId: '05' });
      for (const entry of result.logs) {
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('level');
        expect(entry).toHaveProperty('message');
      }
    });

    it('result includes job_id', async () => {
      const result = await svc.execute({ agentId: '05' });
      expect(result.job_id).toBeDefined();
      expect(result.job_id).toMatch(/^exec-/);
    });
  });
});
