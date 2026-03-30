'use strict';

const { buildExecutionModePlan } = require('../../platform/engine/execution-mode-plan');

describe('buildExecutionModePlan', () => {
  test('returns selected agency agents for AGENCY_ONLY', () => {
    const plan = buildExecutionModePlan({
      mode: 'AGENCY_ONLY',
      brief: 'Need technical architecture and product strategy support',
      maxAgencyAgents: 5,
    });

    expect(plan.mode).toBe('AGENCY_ONLY');
    expect(Array.isArray(plan.selectedAgencyAgents)).toBe(true);
    expect(plan.selectedAgencyAgents.length).toBe(5);
    expect(plan.hybridInjections).toEqual([]);
  });

  test('builds hybrid injections across configured states', () => {
    const plan = buildExecutionModePlan({
      mode: 'HYBRID',
      brief: 'User research, UX design, accessibility and marketing',
      maxAgencyAgents: 6,
      maxAgentsPerInjection: 2,
    });

    expect(plan.mode).toBe('HYBRID');
    expect(plan.selectedAgencyAgents.length).toBe(6);
    expect(plan.hybridInjections.length).toBeGreaterThan(0);
    expect(plan.hybridInjections.every((entry) => entry.agents.length > 0)).toBe(true);
    expect(plan.hybridInjections.every((entry) => entry.agents.length <= 2)).toBe(true);
  });
});
