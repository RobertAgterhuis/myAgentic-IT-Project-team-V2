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
    expect(routes.dashboard.section).toBe('Runtime');
    expect(routes.sessions.section).toBe('Runtime');
    expect(routes.commands.section).toBe('Operations');
    expect(routes.agents.section).toBe('Operations');
    expect(routes.artifacts.section).toBe('Data');
    expect(routes.observability.section).toBe('Observability');
    expect(routes.governance.section).toBe('Observability');
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
      { label: 'Commands', path: '/commands' },
    ]);
  });

  it('returns Home + parent + child for sub-route', () => {
    const crumbs = buildBreadcrumbs('/sessions/sess-123');
    expect(crumbs).toEqual([
      { label: 'Home', path: '/' },
      { label: 'Sessions', path: '/sessions' },
      { label: 'sess-123', path: '/sessions/sess-123' },
    ]);
  });

  it('returns only Home for unknown path', () => {
    const crumbs = buildBreadcrumbs('/unknown-path');
    expect(crumbs).toEqual([{ label: 'Home', path: '/' }]);
  });
});
