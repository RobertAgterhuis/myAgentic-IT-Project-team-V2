// Copyright (c) 2026 Robert Agterhuis. MIT License.

import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { registerRoutes } from '../../src/webapp/routes/task-assembly';
import {
  assembleTeam,
  validateTaskDefinition,
  listTeamConfigurations,
  getTeamConfiguration,
  type TaskDefinition,
} from '../../platform/engine/task-assembly';

// ─── Minimal stub registry ───────────────────────────────────────────────────

const stubAgent = (overrides: Partial<ReturnType<typeof makeAgent>> = {}) => makeAgent(overrides);

function makeAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'agent-test-01',
    legacyId: null,
    agentType: 'sdlc' as const,
    name: 'Test Agent',
    description: 'A stub agent for testing',
    domain: ['engineering', 'sdlc'],
    color: null,
    emoji: null,
    vibe: null,
    capabilities: ['code review', 'architecture planning'],
    inputs: [],
    outputs: [],
    minPrerequisites: [],
    optionalInputs: [],
    skillPath: 'templates/sdlc/agents/test.md',
    requiredTools: [],
    phase: 'PHASE_2' as const,
    gatekeeper: false,
    gateMembership: [],
    sequenceDependencies: [],
    maxRetries: 3,
    timelineEstimate: '1-3 days' as const,
    successRate: 0.9,
    avgQualityScore: 0.88,
    commonFailures: [],
    worksWith: [],
    conflictsWith: [],
    successPatterns: [],
    lastUpdated: '2026-03-01T00:00:00Z',
    sourceFiles: [],
    ...overrides,
  };
}

const stubRegistry = (agents: ReturnType<typeof makeAgent>[]) => ({
  schemaVersion: '1.0.0',
  source: 'test',
  generatedAt: new Date().toISOString(),
  stats: {
    totalAgents: agents.length,
    agencyAgents: 0,
    sdlcAgents: agents.length,
    domains: ['engineering' as const, 'sdlc' as const],
  },
  agents,
});

const baseTask: TaskDefinition = {
  id: 'TASK-001',
  title: 'Build auth module',
  description: 'Implement authentication and authorisation for the API.',
  goals: ['Secure the API', 'Add JWT support'],
  domains: ['engineering', 'sdlc'],
  constraints: {
    maxAgents: 5,
    timeline: '3-5 days',
    requiredCapabilities: ['code review'],
  },
};

// ─── validateTaskDefinition ──────────────────────────────────────────────────

describe('validateTaskDefinition', () => {
  it('accepts a valid task definition', () => {
    const { valid, errors } = validateTaskDefinition(baseTask);
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('rejects a task missing required fields', () => {
    const { valid, errors } = validateTaskDefinition({ id: 'x', title: 'y' });
    expect(valid).toBe(false);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a task with invalid domain', () => {
    const bad = { ...baseTask, domains: ['nonexistent-domain'] };
    const { valid } = validateTaskDefinition(bad);
    expect(valid).toBe(false);
  });

  it('rejects a task with maxAgents below 1', () => {
    const bad = { ...baseTask, constraints: { ...baseTask.constraints, maxAgents: 0 } };
    const { valid } = validateTaskDefinition(bad);
    expect(valid).toBe(false);
  });

  it('accepts optional commandMode', () => {
    const task = { ...baseTask, commandMode: 'CREATE' };
    const { valid } = validateTaskDefinition(task);
    expect(valid).toBe(true);
  });

  it('rejects invalid commandMode', () => {
    const task = { ...baseTask, commandMode: 'UNKNOWN_MODE' };
    const { valid } = validateTaskDefinition(task);
    expect(valid).toBe(false);
  });
});

// ─── assembleTeam ─────────────────────────────────────────────────────────────

describe('assembleTeam', () => {
  it('returns an empty selected team when no registry agents match', () => {
    const registry = stubRegistry([
      stubAgent({ domain: ['marketing'], timelineEstimate: '>1 week' }),
    ]);
    // maxAgents=3, timeline '1-3 days' — the marketing />1 week agent is filtered out
    const result = assembleTeam(baseTask, { registry });
    expect(result.taskId).toBe('TASK-001');
    expect(result.selectedTeam).toHaveLength(0);
    expect(result.risks.some((r) => r.includes('No agents'))).toBe(true);
  });

  it('selects matching agents up to maxAgents', () => {
    const registry = stubRegistry([
      stubAgent({ id: 'agent-a', name: 'Agent A', successRate: 0.9, avgQualityScore: 0.9 }),
      stubAgent({ id: 'agent-b', name: 'Agent B', successRate: 0.8, avgQualityScore: 0.85 }),
      stubAgent({ id: 'agent-c', name: 'Agent C', successRate: 0.7, avgQualityScore: 0.8 }),
    ]);
    const task: TaskDefinition = {
      ...baseTask,
      constraints: { ...baseTask.constraints, maxAgents: 2 },
    };
    const result = assembleTeam(task, { registry });
    expect(result.selectedTeam.length).toBeLessThanOrEqual(2);
    expect(result.assembledAt).toBeTruthy();
  });

  it('scores preferred agents higher', () => {
    const registry = stubRegistry([
      stubAgent({
        id: 'agent-preferred',
        name: 'Preferred Agent',
        successRate: 0.7,
        avgQualityScore: 0.7,
      }),
      stubAgent({
        id: 'agent-normal',
        name: 'Normal Agent',
        successRate: 0.71,
        avgQualityScore: 0.71,
      }),
    ]);
    const task: TaskDefinition = {
      ...baseTask,
      preferences: { preferredAgentIds: ['agent-preferred'], includeAlternatives: true },
    };
    const result = assembleTeam(task, { registry });
    const preferredEntry = result.selectedTeam.find((s) => s.agent.id === 'agent-preferred');
    const normalEntry = result.selectedTeam.find((s) => s.agent.id === 'agent-normal');
    if (preferredEntry && normalEntry) {
      expect(preferredEntry.score).toBeGreaterThan(normalEntry.score);
    }
  });

  it('excludes explicitly excluded agents', () => {
    const registry = stubRegistry([
      stubAgent({ id: 'agent-excluded', name: 'Excluded Agent' }),
      stubAgent({ id: 'agent-ok', name: 'OK Agent' }),
    ]);
    const task: TaskDefinition = {
      ...baseTask,
      constraints: { ...baseTask.constraints, excludedAgentIds: ['agent-excluded'] },
    };
    const result = assembleTeam(task, { registry });
    const ids = result.selectedTeam.map((s) => s.agent.id);
    expect(ids).not.toContain('agent-excluded');
  });

  it('identifies capability gaps as risks', () => {
    const registry = stubRegistry([
      stubAgent({ capabilities: ['architecture planning'] }), // missing 'code review'
    ]);
    const task: TaskDefinition = {
      ...baseTask,
      constraints: { ...baseTask.constraints, requiredCapabilities: ['code review'] },
    };
    const result = assembleTeam(task, { registry });
    expect(result.risks.some((r) => r.includes('Required capabilities'))).toBe(true);
  });

  it('identifies agent conflicts as risks', () => {
    const registry = stubRegistry([
      stubAgent({ id: 'agent-x', name: 'Agent X', conflictsWith: ['agent-y'] }),
      stubAgent({ id: 'agent-y', name: 'Agent Y', conflictsWith: ['agent-x'] }),
    ]);
    const task: TaskDefinition = {
      ...baseTask,
      constraints: { ...baseTask.constraints, maxAgents: 10 },
    };
    const result = assembleTeam(task, { registry });
    const hasConflictRisk = result.risks.some((r) => r.toLowerCase().includes('conflict'));
    expect(hasConflictRisk).toBe(true);
  });

  it('returns alternatives when includeAlternatives is true', () => {
    const agents = Array.from({ length: 8 }, (_, i) =>
      stubAgent({ id: `agent-${i}`, name: `Agent ${i}`, successRate: 0.8 - i * 0.01 })
    );
    const registry = stubRegistry(agents);
    const task: TaskDefinition = {
      ...baseTask,
      constraints: { ...baseTask.constraints, maxAgents: 3 },
      preferences: { includeAlternatives: true },
    };
    const result = assembleTeam(task, { registry });
    expect(result.selectedTeam.length).toBeLessThanOrEqual(3);
    expect(result.alternatives.length).toBeGreaterThan(0);
  });

  it('returns no alternatives when includeAlternatives is false', () => {
    const agents = Array.from({ length: 5 }, (_, i) =>
      stubAgent({ id: `agent-${i}`, name: `Agent ${i}` })
    );
    const registry = stubRegistry(agents);
    const task: TaskDefinition = {
      ...baseTask,
      constraints: { ...baseTask.constraints, maxAgents: 2 },
      preferences: { includeAlternatives: false },
    };
    const result = assembleTeam(task, { registry });
    expect(result.alternatives).toHaveLength(0);
  });

  it('computes confidence between 0 and 1', () => {
    const registry = stubRegistry([
      stubAgent({ id: 'a1', name: 'A1', successRate: 0.9 }),
      stubAgent({ id: 'a2', name: 'A2', successRate: 0.6 }),
    ]);
    const result = assembleTeam(baseTask, { registry });
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('filters agents whose timeline exceeds the constraint', () => {
    const registry = stubRegistry([
      stubAgent({ id: 'fast', name: 'Fast', timelineEstimate: '<4 hours' }),
      stubAgent({ id: 'slow', name: 'Slow', timelineEstimate: '>1 week' }),
    ]);
    const task: TaskDefinition = {
      ...baseTask,
      constraints: { ...baseTask.constraints, timeline: '1-3 days' },
    };
    const result = assembleTeam(task, { registry });
    const ids = result.selectedTeam.map((s) => s.agent.id);
    expect(ids).not.toContain('slow');
    expect(ids).toContain('fast');
  });

  it('filters agents below minQuality', () => {
    const registry = stubRegistry([
      stubAgent({ id: 'hq', name: 'High Quality', avgQualityScore: 0.9 }),
      stubAgent({ id: 'lq', name: 'Low Quality', avgQualityScore: 0.4 }),
    ]);
    const task: TaskDefinition = {
      ...baseTask,
      constraints: { ...baseTask.constraints, minQuality: 0.8 },
    };
    const result = assembleTeam(task, { registry });
    const ids = result.selectedTeam.map((s) => s.agent.id);
    expect(ids).not.toContain('lq');
    expect(ids).toContain('hq');
  });

  it('includes per-agent scoring detail', () => {
    const registry = stubRegistry([stubAgent()]);
    const result = assembleTeam(baseTask, { registry });
    if (result.selectedTeam.length > 0) {
      const detail = result.selectedTeam[0].scoringDetail;
      expect(typeof detail.domainScore).toBe('number');
      expect(typeof detail.capabilityScore).toBe('number');
      expect(typeof detail.successRateScore).toBe('number');
      expect(typeof detail.timelineScore).toBe('number');
      expect(typeof detail.preferenceBoost).toBe('number');
    }
  });
});

// ─── Team Configurations ─────────────────────────────────────────────────────

describe('listTeamConfigurations', () => {
  it('returns all pre-built configurations', () => {
    const configs = listTeamConfigurations();
    expect(configs.length).toBeGreaterThan(0);
    for (const c of configs) {
      expect(c.id).toBeTruthy();
      expect(c.commandMode).toBeTruthy();
      expect(Array.isArray(c.agentIds)).toBe(true);
      expect(c.agentIds.length).toBeGreaterThan(0);
    }
  });

  it('includes configurations for all main command modes', () => {
    const configs = listTeamConfigurations();
    const modes = configs.map((c) => c.commandMode);
    expect(modes).toContain('CREATE');
    expect(modes).toContain('AUDIT');
    expect(modes).toContain('FEATURE');
    expect(modes).toContain('HOTFIX');
    expect(modes).toContain('SCOPE_CHANGE');
  });
});

describe('getTeamConfiguration', () => {
  it('finds a config by id', () => {
    const config = getTeamConfiguration('config-create-full');
    expect(config).toBeDefined();
    expect(config?.commandMode).toBe('CREATE');
  });

  it('finds a config by commandMode', () => {
    const config = getTeamConfiguration('HOTFIX');
    expect(config).toBeDefined();
    expect(config?.id).toBe('config-hotfix');
  });

  it('returns undefined for unknown id', () => {
    const config = getTeamConfiguration('does-not-exist');
    expect(config).toBeUndefined();
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────

describe('routes/task-assembly', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await registerRoutes(app, {} as ServerContext);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/m3/team-configs returns all configurations', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/m3/team-configs' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBeGreaterThan(0);
    expect(Array.isArray(body.configs)).toBe(true);
  });

  it('GET /api/m3/team-configs/:id returns a specific config', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/m3/team-configs/config-hotfix' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.config.commandMode).toBe('HOTFIX');
  });

  it('GET /api/m3/team-configs/:id returns 404 for unknown id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/m3/team-configs/unknown-xyz' });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/m3/validate-task accepts valid task', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/m3/validate-task',
      payload: baseTask,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.valid).toBe(true);
    expect(body.errors).toHaveLength(0);
  });

  it('POST /api/m3/validate-task reports errors for invalid task', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/m3/validate-task',
      payload: { title: 'missing required fields' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.valid).toBe(false);
    expect(body.errors.length).toBeGreaterThan(0);
  });

  it('POST /api/m3/assemble-team returns 400 for invalid task', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/m3/assemble-team',
      payload: { title: 'incomplete' },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.ok).toBe(false);
  });

  it('POST /api/m3/assemble-team assembles a team from the live registry', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/m3/assemble-team',
      payload: {
        id: 'TASK-API-001',
        title: 'Integration test task',
        description: 'Validate the assemble-team endpoint with the live registry',
        goals: ['Assemble a team'],
        domains: ['sdlc'],
        constraints: {
          maxAgents: 3,
          timeline: '>1 week',
        },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.team.taskId).toBe('TASK-API-001');
    expect(typeof body.team.confidence).toBe('number');
    expect(Array.isArray(body.team.selectedTeam)).toBe(true);
    expect(Array.isArray(body.team.risks)).toBe(true);
  });
});

// ─── Fix import complaint ────────────────────────────────────────────────────
type ServerContext = import('../../src/webapp/context').ServerContext;
