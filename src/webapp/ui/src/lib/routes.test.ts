import { describe, expect, it } from 'vitest';
import { buildBreadcrumbs, getPersonaPreset, prioritizeNavSections, routes } from './routes';

describe('routes persona presets', () => {
  it('returns cockpit as the operator landing path', () => {
    expect(getPersonaPreset('operator').landingPath).toBe('/cockpit');
  });

  it('moves prioritized items into a persona section', () => {
    const sections = [
      {
        id: 'runs',
        title: 'Runs',
        items: [
          { id: '/sessions', label: 'Sessions' },
          { id: '/commands', label: 'Commands' },
        ],
      },
      {
        id: 'observability',
        title: 'Observability',
        items: [{ id: '/cockpit', label: 'Cockpit' }],
      },
    ];

    const prioritized = prioritizeNavSections(sections, 'operator');

    expect(prioritized[0].id).toBe('persona-priority');
    expect(prioritized[0].items.map((item) => item.id)).toEqual(['/sessions', '/cockpit']);
  });
});

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
    expect(routes.approvals.section).toBe('Approvals');
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
