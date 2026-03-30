'use strict';

const fs = require('node:fs');
const {
  REGISTRY_PATH,
  REGISTRY_SCHEMA_PATH,
  validateAgentRegistry,
  loadAgentRegistry,
  getAgent,
  queryAgents,
  findComplementaryAgents,
} = require('../../platform/engine/agent-registry');

describe('Agent registry generation and query API', () => {
  it('loads schema and registry files', () => {
    expect(fs.existsSync(REGISTRY_SCHEMA_PATH)).toBe(true);
    expect(fs.existsSync(REGISTRY_PATH)).toBe(true);
  });

  it('validates generated registry with zero errors', () => {
    const result = validateAgentRegistry();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('contains the expected M1 counts', () => {
    const registry = loadAgentRegistry();
    expect(registry.stats.totalAgents).toBe(230);
    expect(registry.stats.sdlcAgents).toBe(39);
    expect(registry.stats.agencyAgents).toBe(191);
    expect(registry.agents).toHaveLength(230);
  });

  it('includes all known domains', () => {
    const registry = loadAgentRegistry();
    expect(registry.stats.domains).toContain('sdlc');
    expect(registry.stats.domains).toContain('engineering');
    expect(registry.stats.domains).toContain('marketing');
  });

  it('gets a single SDLC agent by registry id', () => {
    const agent = getAgent('sdlc-01-business-analyst');
    expect(agent?.name).toBe('Business Analyst');
  });

  it('gets a single SDLC agent by legacy id', () => {
    const agent = getAgent('01');
    expect(agent?.name).toBe('Business Analyst');
  });

  it('filters by domain', () => {
    const results = queryAgents({ domain: ['marketing'], limit: 50 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((agent) => agent.domain.includes('marketing'))).toBe(true);
  });

  it('filters by capability substring', () => {
    const results = queryAgents({ capability: ['content strategy'], limit: 50 });
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some((agent) =>
        agent.capabilities.some((capability) =>
          capability.toLowerCase().includes('content strategy')
        )
      )
    ).toBe(true);
  });

  it('filters by timeline bucket', () => {
    const results = queryAgents({ timeline: '4-8 hours', limit: 50 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((agent) => agent.timelineEstimate === '4-8 hours')).toBe(true);
  });

  it('filters by minimum success rate', () => {
    const results = queryAgents({ minSuccessRate: 85, limit: 50 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((agent) => agent.successRate >= 85)).toBe(true);
  });

  it('filters by agent type and phase', () => {
    const results = queryAgents({ agentType: 'sdlc', phase: 'PHASE_1', limit: 20 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((agent) => agent.agentType === 'sdlc' && agent.phase === 'PHASE_1')).toBe(
      true
    );
  });

  it('sorts by name by default', () => {
    const results = queryAgents({ limit: 10 });
    const names = results.map((agent) => agent.name);
    expect(names).toEqual([...names].sort((left, right) => left.localeCompare(right)));
  });

  it('supports success-rate sorting', () => {
    const results = queryAgents({ sortBy: 'success_rate', limit: 10 });
    const values = results.map((agent) => agent.successRate);
    expect(values).toEqual([...values].sort((left, right) => right - left));
  });

  it('applies the limit parameter', () => {
    const results = queryAgents({ limit: 3 });
    expect(results).toHaveLength(3);
  });

  it('finds complementary agents from worksWith metadata', () => {
    const registry = loadAgentRegistry();
    const source = registry.agents.find((agent) => agent.worksWith.length > 0);
    expect(source).toBeDefined();
    const matches = findComplementaryAgents(source.id, registry);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((agent) => source.worksWith.includes(agent.id))).toBe(true);
  });
});
