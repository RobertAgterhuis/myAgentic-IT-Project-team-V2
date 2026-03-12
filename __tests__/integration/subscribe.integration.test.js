/**
 * Integration Test: Subscribe Endpoint (SP-2-BTN)
 * Tests the /api/subscribe endpoint validation and local fallback.
 * Buttondown API is not called in tests (no BUTTONDOWN_API_KEY set).
 * Without the key, subscriptions are stored locally.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

const SERVER_PATH = path.resolve(__dirname, '../../.github/webapp/server.js');
const LOCAL_SUBS_FILE = path.resolve(__dirname, '../../BusinessDocs/local-subscriptions.json');

let server;
let baseUrl;

function request(urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body });
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

beforeAll((done) => {
  const serverModule = require(SERVER_PATH);
  server = serverModule.server;

  if (server.listening) {
    server.close(() => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        done();
      });
    });
  } else {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      done();
    });
  }
});

afterAll((done) => {
  // Clean up local subscriptions file created during tests
  try {
    fs.unlinkSync(LOCAL_SUBS_FILE);
  } catch (_) {
    /* ignore */
  }
  if (server && server.listening) {
    server.close(done);
  } else {
    done();
  }
});

describe('SP-2-BTN: POST /api/subscribe', () => {
  const validPayload = JSON.stringify({
    email: 'test@example.com',
    metadata: { segment: 'developers', source: 'landing-page' },
  });

  const jsonHeaders = { 'Content-Type': 'application/json' };

  describe('Input Validation', () => {
    it('should reject requests without Content-Type: application/json', async () => {
      const res = await request('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: validPayload,
      });
      expect(res.statusCode).toBe(415);
    });

    it('should reject invalid JSON', async () => {
      const res = await request('/api/subscribe', {
        method: 'POST',
        headers: jsonHeaders,
        body: '{not valid json',
      });
      expect(res.statusCode).toBe(400);
    });

    it('should reject missing email', async () => {
      const res = await request('/api/subscribe', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ metadata: { segment: 'developers' } }),
      });
      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res.body);
      expect(data.message).toMatch(/email/i);
    });

    it('should reject invalid email format', async () => {
      const res = await request('/api/subscribe', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ email: 'not-an-email' }),
      });
      expect(res.statusCode).toBe(400);
    });

    it('should reject invalid segment', async () => {
      const res = await request('/api/subscribe', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          email: 'test@example.com',
          metadata: { segment: 'invalid-segment' },
        }),
      });
      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res.body);
      expect(data.message).toMatch(/segment/i);
    });

    it('should accept all valid segments', async () => {
      const segments = ['engineering-leaders', 'product-managers', 'developers', 'evaluators'];
      for (const segment of segments) {
        const res = await request('/api/subscribe', {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            email: `segment-test-${segment}@example.com`,
            metadata: { segment },
          }),
        });
        // Without BUTTONDOWN_API_KEY, local fallback stores and returns 201
        expect(res.statusCode).toBe(201);
      }
    });
  });

  describe('Service Availability', () => {
    it('should store locally when BUTTONDOWN_API_KEY is not configured', async () => {
      const res = await request('/api/subscribe', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          email: 'local-test@example.com',
          metadata: { segment: 'developers', source: 'test' },
        }),
      });
      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res.body);
      expect(data.status).toBe('stored_locally');
      expect(data.message).toMatch(/not configured/i);
    });
  });

  describe('Default Values', () => {
    it('should default segment to evaluators when not provided', async () => {
      const res = await request('/api/subscribe', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ email: 'defaults-test@example.com' }),
      });
      // Should reach local fallback (201), meaning defaults worked
      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res.body);
      expect(data.status).toBe('stored_locally');
    });
  });
});
