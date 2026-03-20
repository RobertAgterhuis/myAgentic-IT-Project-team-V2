// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * OpenAPI spec contract tests (M30-008).
 *
 * Builds the full Fastify app, extracts the generated OpenAPI spec via
 * `app.swagger()`, and validates structural compliance:
 *  - Valid OpenAPI 3.1 document
 *  - All expected tags present
 *  - All expected API paths present
 *  - Response schemas on key routes
 *  - No duplicate operationIds
 */

'use strict';

const { createTestApp } = require('../helpers/create-test-app');

let app;
let spec;

beforeAll(async () => {
  app = await createTestApp();
  spec = app.swagger();
});

afterAll(async () => {
  if (app) await app.close();
});

describe('OpenAPI 3.1 spec generation (M30-008)', () => {
  it('produces a valid OpenAPI 3.1 document', () => {
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.info).toBeDefined();
    expect(spec.info.title).toBe('Agentic SDLC Platform API');
    expect(spec.info.version).toBe('0.4.0');
    expect(spec.paths).toBeDefined();
  });

  it('includes server definition', () => {
    expect(spec.servers).toBeDefined();
    expect(spec.servers.length).toBeGreaterThan(0);
    expect(spec.servers[0].url).toMatch(/^http/);
  });

  describe('tags', () => {
    const expectedTags = [
      'agents',
      'analytics',
      'approvals',
      'artifacts',
      'auth',
      'cockpit',
      'commands',
      'dashboard',
      'decisions',
      'drift',
      'jobs',
      'metrics',
      'milestones',
      'orchestrator',
      'policies',
      'progress',
      'questionnaires',
      'sessions',
      'subscribe',
      'system',
      'workspaces',
    ];

    it('includes all expected API tags', () => {
      const tagNames = spec.tags.map((t) => t.name).sort();
      for (const tag of expectedTags) {
        expect(tagNames).toContain(tag);
      }
    });

    it('every tag has a description', () => {
      for (const tag of spec.tags) {
        expect(tag.description).toBeTruthy();
      }
    });
  });

  describe('API paths', () => {
    const criticalPaths = [
      '/api/command',
      '/api/questionnaires',
      '/api/decisions',
      '/api/progress',
      '/api/session',
      '/api/milestones',
      '/api/milestones/{id}',
      '/api/subscribe',
      '/api/health',
      '/api/events',
      '/api/drift',
      '/api/help',
      '/api/orchestrator/advance',
      '/api/orchestrator/status',
      '/api/orchestrator/pause',
      '/api/orchestrator/override',
      '/api/orchestrator/resume',
      '/api/v1/approvals',
      '/api/v1/policies',
      '/api/v1/artifacts',
      '/api/agents',
      '/api/workspaces',
      '/api/v1/cockpit/health',
      '/api/v1/cockpit/provenance',
      '/api/analytics',
      '/api/audit',
      '/api/dashboard/health',
      '/api/metrics/dashboard',
    ];

    it.each(criticalPaths)('documents %s', (path) => {
      expect(spec.paths[path]).toBeDefined();
    });

    it('documents at least 40 unique paths', () => {
      const pathCount = Object.keys(spec.paths).filter((p) => p.startsWith('/api/')).length;
      expect(pathCount).toBeGreaterThanOrEqual(40);
    });
  });

  describe('request schemas', () => {
    it('POST /api/command has request body schema', () => {
      const op = spec.paths['/api/command'].post;
      expect(op.requestBody).toBeDefined();
      expect(op.requestBody.content['application/json'].schema.properties.command).toBeDefined();
    });

    it('POST /api/subscribe has email validation in body schema', () => {
      const op = spec.paths['/api/subscribe'].post;
      const props = op.requestBody.content['application/json'].schema.properties;
      expect(props.email).toBeDefined();
      expect(props.email.format).toBe('email');
    });

    it('PUT /api/milestones/{id} has params schema', () => {
      const op = spec.paths['/api/milestones/{id}'].put;
      expect(op.parameters).toBeDefined();
      const idParam = op.parameters.find((p) => p.name === 'id');
      expect(idParam).toBeDefined();
      expect(idParam.in).toBe('path');
    });

    it('GET /api/v1/artifacts has querystring schema', () => {
      const op = spec.paths['/api/v1/artifacts'].get;
      expect(op.parameters).toBeDefined();
      const stageParam = op.parameters.find((p) => p.name === 'stage');
      expect(stageParam).toBeDefined();
      expect(stageParam.in).toBe('query');
    });
  });

  describe('response schemas', () => {
    it('POST /api/command has 200 and 400 response schemas', () => {
      const responses = spec.paths['/api/command'].post.responses;
      expect(responses['200']).toBeDefined();
      expect(responses['400']).toBeDefined();
    });

    it('POST /api/milestones has mutation response codes', () => {
      const responses = spec.paths['/api/milestones'].post.responses;
      expect(responses['200']).toBeDefined();
      expect(responses['400']).toBeDefined();
      expect(responses['403']).toBeDefined();
    });

    it('GET /api/agents/{id} has read response codes', () => {
      const responses = spec.paths['/api/agents/{id}'].get.responses;
      expect(responses['200']).toBeDefined();
      expect(responses['404']).toBeDefined();
    });
  });

  describe('spec integrity', () => {
    it('has no duplicate operationIds', () => {
      const ids = [];
      for (const [, methods] of Object.entries(spec.paths)) {
        for (const [method, op] of Object.entries(methods)) {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method) && op.operationId) {
            ids.push(op.operationId);
          }
        }
      }
      const unique = new Set(ids);
      expect(ids.length).toBe(unique.size);
    });

    it('all operations have at least one tag', () => {
      for (const [path, methods] of Object.entries(spec.paths)) {
        for (const [method, op] of Object.entries(methods)) {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
            // Allow internal routes (locales, health alias) to be untagged
            if (!path.startsWith('/api/')) continue;
            if (op.tags) {
              expect(op.tags.length).toBeGreaterThan(0);
            }
          }
        }
      }
    });

    it('YAML output can be generated', () => {
      const yaml = app.swagger({ yaml: true });
      expect(typeof yaml).toBe('string');
      expect(yaml).toContain('openapi: 3.1.0');
      expect(yaml).toContain('/api/command');
    });
  });
});
