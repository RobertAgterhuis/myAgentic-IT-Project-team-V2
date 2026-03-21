import { describe, it, expect } from 'vitest';
import { buildBreadcrumbs, routes } from './routes';

describe('routes', () => {
  it('has expected route entries', () => {
    expect(routes.dashboard.path).toBe('/');
    expect(routes.commands.path).toBe('/commands');
    expect(routes.sessions.path).toBe('/sessions');
    expect(routes.pipeline.path).toBe('/pipeline');
    expect(routes.agents.path).toBe('/agents');
    expect(routes.questionnaires.path).toBe('/questionnaires');
    expect(routes.decisions.path).toBe('/decisions');
    expect(routes.observability.path).toBe('/observability');
  });

  it('has new section groupings', () => {
    expect(routes.dashboard.section).toBe('Overview');
    expect(routes.sessions.section).toBe('Runs');
    expect(routes.commands.section).toBe('Runs');
    expect(routes.agents.section).toBe('Agents');
    expect(routes.artifacts.section).toBe('Audit & Evidence');
    expect(routes.observability.section).toBe('Observability');
    expect(routes.governance.section).toBe('Approvals');
  });
});

describe('buildBreadcrumbs', () => {
  it('returns only Home for root path', () => {
    const crumbs = buildBreadcrumbs('/');
    expect(crumbs).toEqual([{ label: 'Home', path: '/' }]);
  });

  it('returns Home + page for known route', () => {
    const crumbs = buildBreadcrumbs('/commands');
    expect(crumbs).toEqual([
      { label: 'Home', path: '/' },
      { label: 'Runs', path: '/commands' },
      { label: 'Commands', path: '/commands' },
    ]);
  });

  it('returns Home + parent + child for sub-route', () => {
    const crumbs = buildBreadcrumbs('/sessions/sess-123');
    expect(crumbs).toEqual([
      { label: 'Home', path: '/' },
      { label: 'Runs', path: '/sessions' },
      { label: 'sess-123', path: '/sessions/sess-123' },
    ]);
  });

  it('returns only Home for unknown path', () => {
    const crumbs = buildBreadcrumbs('/unknown-path');
    expect(crumbs).toEqual([{ label: 'Home', path: '/' }]);
  });
});
