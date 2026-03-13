/**
 * Tests: Query key factory
 */
import { describe, it, expect } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

describe('queryKeys', () => {
  it('questionnaires.all is a stable key', () => {
    expect(queryKeys.questionnaires.all).toEqual(['questionnaires']);
  });

  it('milestones.detail returns parameterized key', () => {
    expect(queryKeys.milestones.detail('abc')).toEqual(['milestones', 'abc']);
  });

  it('orchestrator keys are namespaced', () => {
    expect(queryKeys.orchestrator.status[0]).toBe('orchestrator');
    expect(queryKeys.orchestrator.queue[0]).toBe('command');
  });

  it('dashboard keys are namespaced', () => {
    expect(queryKeys.dashboard.health).toEqual(['dashboard', 'health']);
    expect(queryKeys.dashboard.metrics).toEqual(['dashboard', 'metrics']);
    expect(queryKeys.dashboard.activity).toEqual(['dashboard', 'activity']);
    expect(queryKeys.dashboard.stats).toEqual(['dashboard', 'stats']);
  });

  it('drift and progress have stable keys', () => {
    expect(queryKeys.drift.all).toEqual(['drift']);
    expect(queryKeys.progress.all).toEqual(['progress']);
  });
});
