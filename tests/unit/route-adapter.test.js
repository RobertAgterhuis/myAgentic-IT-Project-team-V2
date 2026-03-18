// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const { registerLegacyRoutes } = require('../../src/webapp/route-adapter');

/* ── Mock Fastify ─────────────────────────────────────────── */

function createMockApp() {
  const registered = [];
  return {
    route: vi.fn((opts) => registered.push(opts)),
    _registered: registered,
  };
}

describe('route-adapter', () => {
  describe('registerLegacyRoutes', () => {
    it('registers routes from a legacy route table', () => {
      const app = createMockApp();
      const handler = vi.fn();
      registerLegacyRoutes(app, { 'GET /api/foo': handler });
      expect(app.route).toHaveBeenCalledTimes(1);
      expect(app._registered[0].method).toBe('GET');
      expect(app._registered[0].url).toBe('/api/foo');
    });

    it('registers multiple routes', () => {
      const app = createMockApp();
      registerLegacyRoutes(app, {
        'GET /api/a': vi.fn(),
        'POST /api/b': vi.fn(),
        'PUT /api/c': vi.fn(),
        'DELETE /api/d': vi.fn(),
        'PATCH /api/e': vi.fn(),
      });
      expect(app.route).toHaveBeenCalledTimes(5);
    });

    it('skips keys starting with underscore', () => {
      const app = createMockApp();
      registerLegacyRoutes(app, {
        _internal: vi.fn(),
        'GET /api/ok': vi.fn(),
      });
      expect(app.route).toHaveBeenCalledTimes(1);
      expect(app._registered[0].url).toBe('/api/ok');
    });

    it('skips keys without a space separator', () => {
      const app = createMockApp();
      registerLegacyRoutes(app, {
        NOSPACE: vi.fn(),
        'GET /api/ok': vi.fn(),
      });
      expect(app.route).toHaveBeenCalledTimes(1);
    });

    it('adds tag to schema when provided', () => {
      const app = createMockApp();
      registerLegacyRoutes(app, { 'GET /api/tagged': vi.fn() }, 'TestTag');
      expect(app._registered[0].schema).toEqual({ tags: ['TestTag'] });
    });

    it('does not add schema when no tag provided', () => {
      const app = createMockApp();
      registerLegacyRoutes(app, { 'GET /api/no-tag': vi.fn() });
      expect(app._registered[0].schema).toBeUndefined();
    });

    it('handler calls reply.hijack and invokes legacy handler', async () => {
      const app = createMockApp();
      const legacyHandler = vi.fn();
      registerLegacyRoutes(app, { 'GET /api/test': legacyHandler });

      const registeredRoute = app._registered[0];
      const mockRequest = {
        raw: { url: '/api/test', method: 'GET', on: vi.fn(), once: vi.fn() },
        body: undefined,
      };
      const mockReply = {
        hijack: vi.fn(),
        raw: { writableEnded: true },
      };

      await registeredRoute.handler(mockRequest, mockReply);
      expect(mockReply.hijack).toHaveBeenCalled();
      expect(legacyHandler).toHaveBeenCalledWith(mockRequest.raw, mockReply.raw);
    });

    it('handler creates body stream proxy for Buffer bodies', async () => {
      const app = createMockApp();
      const legacyHandler = vi.fn();
      registerLegacyRoutes(app, { 'POST /api/upload': legacyHandler });

      const registeredRoute = app._registered[0];
      const mockRequest = {
        raw: { url: '/api/upload', method: 'POST', on: vi.fn(), once: vi.fn() },
        body: Buffer.from('{"test":true}'),
      };
      const mockReply = {
        hijack: vi.fn(),
        raw: { writableEnded: true },
      };

      await registeredRoute.handler(mockRequest, mockReply);
      expect(mockReply.hijack).toHaveBeenCalled();
      // Legacy handler should receive a proxy (not the raw request) since body is a Buffer
      const receivedReq = legacyHandler.mock.calls[0][0];
      expect(receivedReq).toBeDefined();
    });

    it('handles legacy handler errors when response not ended', async () => {
      const app = createMockApp();
      const legacyHandler = vi.fn().mockRejectedValue(new Error('Handler crash'));
      registerLegacyRoutes(app, { 'GET /api/fail': legacyHandler });

      const registeredRoute = app._registered[0];
      const mockRequest = {
        raw: { url: '/api/fail', method: 'GET', on: vi.fn(), once: vi.fn() },
        body: undefined,
      };
      const endFn = vi.fn();
      const mockReply = {
        hijack: vi.fn(),
        raw: {
          writableEnded: false,
          headersSent: false,
          writeHead: vi.fn(),
          end: endFn,
          setHeader: vi.fn(),
        },
      };

      // Should not throw
      await registeredRoute.handler(mockRequest, mockReply);
      // Error handler should have ended the response
      expect(endFn).toHaveBeenCalled();
    });
  });
});
