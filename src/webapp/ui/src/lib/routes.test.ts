import { describe, it, expect } from 'vitest';
import { buildBreadcrumbs, routes } from './routes';

describe('routes', () => {
  it('has expected route entries', () => {
    expect(routes.dashboard.path).toBe('/');
    expect(routes.commandCenter.path).toBe('/command-center');
    expect(routes.pipeline.path).toBe('/pipeline');
    expect(routes.questionnaires.path).toBe('/questionnaires');
    expect(routes.decisions.path).toBe('/decisions');
    expect(routes.metrics.path).toBe('/metrics');
  });
});

describe('buildBreadcrumbs', () => {
  it('returns only Home for root path', () => {
    const crumbs = buildBreadcrumbs('/');
    expect(crumbs).toEqual([{ label: 'Home', path: '/' }]);
  });

  it('returns Home + page for known route', () => {
    const crumbs = buildBreadcrumbs('/command-center');
    expect(crumbs).toEqual([
      { label: 'Home', path: '/' },
      { label: 'Command Center', path: '/command-center' },
    ]);
  });

  it('returns only Home for unknown path', () => {
    const crumbs = buildBreadcrumbs('/unknown-path');
    expect(crumbs).toEqual([{ label: 'Home', path: '/' }]);
  });
});
