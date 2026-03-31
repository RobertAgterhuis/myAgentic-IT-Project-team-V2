// Copyright (c) 2026 Robert Agterhuis. MIT License.

import * as __req_0 from '../../src/webapp/router';
const { matchPathTemplate, resolveRoute, findRouteTemplate } = __req_0;

describe('router', () => {
  describe('matchPathTemplate', () => {
    it('matches exact paths', () => {
      expect(matchPathTemplate('/api/health', '/api/health')).toBe(true);
    });

    it('rejects non-matching exact paths', () => {
      expect(matchPathTemplate('/api/health', '/api/status')).toBe(false);
    });

    it('matches parameterised paths', () => {
      expect(matchPathTemplate('/api/jobs/:id', '/api/jobs/abc-123')).toBe(true);
    });

    it('rejects parameterised paths with wrong segment count', () => {
      expect(matchPathTemplate('/api/jobs/:id', '/api/jobs')).toBe(false);
      expect(matchPathTemplate('/api/jobs/:id', '/api/jobs/abc/extra')).toBe(false);
    });

    it('rejects parameterised paths with wrong prefix', () => {
      expect(matchPathTemplate('/api/jobs/:id', '/api/tasks/abc')).toBe(false);
    });

    it('matches multiple params', () => {
      expect(matchPathTemplate('/api/:type/:id', '/api/agents/05')).toBe(true);
    });
  });

  describe('resolveRoute', () => {
    const routes = {
      'GET /api/health': () => {},
      'GET /api/jobs/:id': () => {},
      'POST /api/jobs': () => {},
    };

    it('resolves exact route', () => {
      expect(resolveRoute(routes, 'GET', '/api/health')).toBe(routes['GET /api/health']);
    });

    it('resolves parameterised route', () => {
      expect(resolveRoute(routes, 'GET', '/api/jobs/abc')).toBe(routes['GET /api/jobs/:id']);
    });

    it('returns null for unmatched path', () => {
      expect(resolveRoute(routes, 'GET', '/api/unknown')).toBeNull();
    });

    it('returns null for wrong method', () => {
      expect(resolveRoute(routes, 'DELETE', '/api/health')).toBeNull();
    });

    it('skips malformed keys (no space)', () => {
      const routesWithBad = { GETFOO: () => {}, 'GET /api/ok': () => {} };
      expect(resolveRoute(routesWithBad, 'GET', '/api/ok')).toBe(routesWithBad['GET /api/ok']);
    });
  });

  describe('findRouteTemplate', () => {
    const routes = {
      'GET /api/health': () => {},
      'GET /api/jobs/:id': () => {},
      'POST /api/jobs': () => {},
    };

    it('returns template for parameterised match', () => {
      expect(findRouteTemplate(routes, 'GET', '/api/jobs/xyz')).toBe('/api/jobs/:id');
    });

    it('returns null for unmatched path', () => {
      expect(findRouteTemplate(routes, 'PUT', '/api/things')).toBeNull();
    });

    it('skips malformed keys', () => {
      const routesWithBad = { NOSPACE: () => {} };
      expect(findRouteTemplate(routesWithBad, 'GET', '/api/test')).toBeNull();
    });
  });
});
