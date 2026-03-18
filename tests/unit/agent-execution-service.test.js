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
      invokeSpy.mockResolvedValue({ success: true, outputPath: '/output/test.md' });

      const result = await svc.execute({ agentId: '05' });
      expect(result.agent_id).toBe('05');
      expect(result.agent_name).toBe('Software Architect');
      expect(result.status).toBe('completed');
      expect(result.output_path).toBe('/output/test.md');
      expect(result.started_at).toBeDefined();
      expect(result.completed_at).toBeDefined();
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('returns failed result when invoke returns success: false', async () => {
      invokeSpy.mockResolvedValue({ success: false, error: 'Agent failed' });

      const result = await svc.execute({ agentId: '05' });
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Agent failed');
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
});
