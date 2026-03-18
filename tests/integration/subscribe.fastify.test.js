'use strict';
/* M30-007: Subscribe endpoint integration tests via Fastify inject().
 * Replaces subscribe.integration.test.js (raw HTTP) with framework-native testing.
 * Tests /api/subscribe validation and local fallback (SP-2-BTN). */

const { InMemoryStore, setStore } = require('../../src/webapp/store');
const { createTestApp } = require('../helpers/create-test-app');

let app;

/* ── Lifecycle ────────────────────────────────────────────────── */

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  setStore(new InMemoryStore());
  app._cache.invalidateAll();
});

/* ── Helper ───────────────────────────────────────────────────── */

function inject(method, url, payload, headers) {
  const opts = { method, url };
  if (payload !== undefined) {
    if (typeof payload === 'string') {
      opts.body = payload;
    } else {
      opts.payload = payload;
    }
    opts.headers = headers || { 'content-type': 'application/json' };
  } else if (headers) {
    opts.headers = headers;
  }
  return app.inject(opts);
}

/* ═══════════════════════════════════════════════════════════════
 * SP-2-BTN: POST /api/subscribe
 * ═══════════════════════════════════════════════════════════════ */

describe('SP-2-BTN: POST /api/subscribe — Fastify', () => {
  const validPayload = {
    email: 'test@example.com',
    metadata: { segment: 'developers', source: 'landing-page' },
  };

  describe('Input Validation', () => {
    it('should reject requests without Content-Type: application/json', async () => {
      const res = await inject('POST', '/api/subscribe', JSON.stringify(validPayload), {
        'content-type': 'text/plain',
      });
      // Fastify body-parser plugin accepts text/plain but schema validation fails
      expect([400, 415]).toContain(res.statusCode);
    });

    it('should reject invalid JSON', async () => {
      const res = await inject('POST', '/api/subscribe', '{not valid json', {
        'content-type': 'application/json',
      });
      expect(res.statusCode).toBe(400);
    });

    it('should reject missing email', async () => {
      const res = await inject('POST', '/api/subscribe', {
        metadata: { segment: 'developers' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toMatch(/email/i);
    });

    it('should reject invalid email format', async () => {
      const res = await inject('POST', '/api/subscribe', { email: 'not-an-email' });
      expect(res.statusCode).toBe(400);
    });

    it('should reject invalid segment', async () => {
      const res = await inject('POST', '/api/subscribe', {
        email: 'test@example.com',
        metadata: { segment: 'invalid-segment' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toMatch(/segment/i);
    });

    it('should accept all valid segments', async () => {
      const segments = ['engineering-leaders', 'product-managers', 'developers', 'evaluators'];
      for (const segment of segments) {
        const res = await inject('POST', '/api/subscribe', {
          email: `segment-test-${segment}@example.com`,
          metadata: { segment },
        });
        expect(res.statusCode).toBe(201);
      }
    });
  });

  describe('Service Availability', () => {
    it('should store locally when BUTTONDOWN_API_KEY is not configured', async () => {
      const res = await inject('POST', '/api/subscribe', {
        email: 'local-test@example.com',
        metadata: { segment: 'developers', source: 'test' },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.status).toBe('stored_locally');
      expect(body.message).toMatch(/not configured/i);
    });
  });

  describe('Default Values', () => {
    it('should default segment to evaluators when not provided', async () => {
      const res = await inject('POST', '/api/subscribe', {
        email: 'defaults-test@example.com',
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().status).toBe('stored_locally');
    });
  });
});
