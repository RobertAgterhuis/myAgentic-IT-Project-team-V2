import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OutcomeTrackingService } from '../../src/webapp/services/outcome-tracking-service';
import { mkdirSync } from 'fs';
import os from 'os';
import { join } from 'path';

describe('OutcomeTrackingService', () => {
  let svc;
  let mockCtx;
  let tempDir;

  beforeEach(() => {
    tempDir = join(os.tmpdir(), 'outcome-tracking-test-' + Date.now());
    mkdirSync(tempDir, { recursive: true });

    mockCtx = {
      store: {},
      cache: {},
      audit: {
        log: vi.fn(),
      },
      projectRoot: tempDir,
      businessDocs: join(tempDir, 'BusinessDocs'),
      sessionDir: join(tempDir, 'sessions'),
      decisionsFile: '',
      decisionsDir: '',
      commandQueue: '',
      helpDir: '',
      safeWrite: vi.fn(),
    };

    mkdirSync(mockCtx.businessDocs, { recursive: true });
    svc = new OutcomeTrackingService(mockCtx);
  });

  describe('recordOutcome', () => {
    it('should record a valid outcome', async () => {
      const outcome = {
        sessionId: 'sess-1',
        taskId: 'task-1',
        agentId: 'agent-1',
        agentName: 'Test Agent',
        phaseNumber: 1,
        phaseName: 'PHASE_1',
        executionMode: 'SDLC_ONLY',
        timestamp: new Date().toISOString(),
        recordedAt: new Date().toISOString(),
        taskDefinition: {
          type: 'FEATURE',
          complexity: 'MEDIUM',
        },
        predecessorOutputs: [],
        inputDataSize: 1000,
        deliverables: {
          count: 1,
          paths: ['/output.md'],
          totalSize: 5000,
          types: ['markdown'],
        },
        executionTimeMs: 30000,
        completionStatus: 'SUCCESS',
        blockers: [],
        needsHumanReview: false,
      };

      const id = await svc.recordOutcome(outcome);
      expect(id).toBeDefined();
      expect(id.length).toBeGreaterThan(0);
    });

    it('should reject outcome with missing required fields', async () => {
      const outcome = {
        sessionId: 'sess-1',
        // Missing required fields
      };

      await expect(svc.recordOutcome(outcome)).rejects.toThrow('validation failed');
    });

    it('should reject outcome with invalid quality score', async () => {
      const outcome = {
        sessionId: 'sess-1',
        taskId: 'task-1',
        agentId: 'agent-1',
        agentName: 'Test Agent',
        phaseNumber: 1,
        phaseName: 'PHASE_1',
        executionMode: 'SDLC_ONLY',
        timestamp: new Date().toISOString(),
        recordedAt: new Date().toISOString(),
        taskDefinition: { type: 'FEATURE', complexity: 'MEDIUM' },
        predecessorOutputs: [],
        inputDataSize: 1000,
        deliverables: { count: 1, paths: [], totalSize: 0, types: [] },
        executionTimeMs: 30000,
        completionStatus: 'SUCCESS',
        blockers: [],
        needsHumanReview: false,
        qualityScore: 1.5, // Invalid: > 1.0
      };

      await expect(svc.recordOutcome(outcome)).rejects.toThrow('validation failed');
    });
  });

  describe('queryOutcomes', () => {
    it('should return empty array if no outcomes recorded', async () => {
      const results = await svc.queryOutcomes({});
      expect(results).toEqual([]);
    });
  });

  describe('recordCriticFeedback', () => {
    it('should record critic feedback', async () => {
      const feedback = {
        outcomeid: 'outcome-1',
        criticAgentId: 'critic-1',
        gatePhase: 'PHASE_1',
        passed: true,
        score: 0.85,
        findings: [],
        recordedAt: new Date().toISOString(),
      };

      await expect(svc.recordCriticFeedback(feedback)).resolves.toBeUndefined();
    });
  });

  describe('recordTeamComposition', () => {
    it('should record team composition', async () => {
      const team = {
        teamId: 'team-1',
        teamName: 'Design Team',
        agents: [
          { agentId: 'agent-1', agentName: 'Designer', sequence: 1, role: 'Lead' },
          { agentId: 'agent-2', agentName: 'Dev', sequence: 2, role: 'Support' },
        ],
        createdAt: new Date().toISOString(),
        usageCount: 0,
        successRate: 0.8,
      };

      await expect(svc.recordTeamComposition(team)).resolves.toBeUndefined();
    });
  });

  describe('computeAggregations', () => {
    it('should compute basic aggregations', async () => {
      const agg = await svc.computeAggregations(90);
      expect(agg).toHaveProperty('agentMetrics');
      expect(agg).toHaveProperty('computedAt');
    });
  });

  describe('getPairSuccessRate', () => {
    it('should return 0 if no pairs exist', async () => {
      const rate = await svc.getPairSuccessRate('agent-1', 'agent-2');
      expect(rate).toBe(0);
    });
  });

  describe('exportOutcomes', () => {
    it('should export to JSON format', async () => {
      const path = await svc.exportOutcomes('json');
      expect(path).toContain('.json');
    });

    it('should export to CSV format', async () => {
      const path = await svc.exportOutcomes('csv');
      expect(path).toContain('.csv');
    });
  });
});
