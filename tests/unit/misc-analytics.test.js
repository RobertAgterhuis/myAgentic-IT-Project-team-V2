// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const { registerAnalyticsRoutes } = require('../../src/webapp/routes/misc-analytics');

function createFakeApp() {
  const routes = new Map();
  const add = (method) => (route, optsOrHandler, maybeHandler) => {
    const handler = typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler;
    const schema = typeof optsOrHandler === 'function' ? undefined : optsOrHandler?.schema;
    routes.set(`${method} ${route}`, { handler, schema });
  };
  return {
    routes,
    get: add('GET'),
    post: add('POST'),
  };
}

function createReply() {
  return {
    statusCode: 200,
    payload: undefined,
    code(c) {
      this.statusCode = c;
      return this;
    },
    send(body) {
      this.payload = body;
      return this;
    },
  };
}

describe('registerAnalyticsRoutes', () => {
  it('registers GET/POST analytics endpoints with schemas', () => {
    const app = createFakeApp();
    registerAnalyticsRoutes({
      app,
      analyticsPostSchema: { type: 'object' },
      analyticsGetSchema: { type: 'object' },
      analyticsFile: '/tmp/analytics.json',
      analyticsMaxEvents: 100,
      getStore: () => ({ exists: () => false, mkdirp: () => {} }),
      cache: { read: () => '[]' },
      safeWriteSync: () => {},
    });

    expect(app.routes.get('POST /api/analytics').schema).toEqual({ type: 'object' });
    expect(app.routes.get('GET /api/analytics').schema).toEqual({ type: 'object' });
  });

  it('accepts valid analytics payload and returns accepted/rejected counts', async () => {
    const app = createFakeApp();
    const memory = {};

    registerAnalyticsRoutes({
      app,
      analyticsFile: '/tmp/analytics.json',
      analyticsMaxEvents: 100,
      getStore: () => ({
        exists: (p) => Object.prototype.hasOwnProperty.call(memory, p),
        mkdirp: () => {},
      }),
      cache: {
        read: (p) => memory[p],
      },
      safeWriteSync: (p, c) => {
        memory[p] = c;
      },
    });

    const post = app.routes.get('POST /api/analytics').handler;
    const reply = createReply();
    await post(
      {
        body: {
          events: [
            { event: 'page_view', properties: { page: 'questionnaires' } },
            { event: 'invalid_event', properties: {} },
          ],
        },
      },
      reply
    );

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.accepted).toBe(1);
    expect(reply.payload.rejected).toBe(1);
  });
});
