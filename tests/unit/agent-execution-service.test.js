// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const {
  AgentExecutionService,
  AgentNotFoundError,
} = require('../../src/webapp/services/agent-execution-service');
const { Dispatcher } = require('../../platform/engine/dispatcher');

/* ── Mock ServiceContext ─────────────────────────────────── */

function createMockServiceContext() {
  return {
    store: {},
    cache: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
    audit: { log: vi.fn() },
    safeWrite: vi.fn(),
    paths: { root: '/tmp/test', output: '/tmp/test/output' },
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
    });

    it('returns failed result when invoke throws', async () => {
      invokeSpy.mockRejectedValue(new Error('Dispatcher crash'));

      const result = await svc.execute({ agentId: '05' });
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Dispatcher crash');
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
  });

  describe('AgentNotFoundError', () => {
    it('is an instance of Error', () => {
      const err = new AgentNotFoundError('test');
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('AgentNotFoundError');
      expect(err.message).toBe('test');
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
