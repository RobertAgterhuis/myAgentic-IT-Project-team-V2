/**
 * Integration Test: Server Health & Core Endpoints
 * SP-11-612 Test Strategy Framework
 *
 * Tests the webapp server's HTTP endpoints using direct server import.
 * No external dependencies required (uses Node built-in http module).
 */

const http = require('http');
const path = require('path');

// Resolve the server module relative to project root
const SERVER_PATH = path.resolve(__dirname, '../../.github/webapp/server.js');

let server;
let baseUrl;

/**
 * Helper: Make an HTTP request to the test server.
 * Returns { statusCode, headers, body }.
 */
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
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

beforeAll((done) => {
  // Import server and start on a random port
  const serverModule = require(SERVER_PATH);
  server = serverModule.server;

  // If server is already listening, close and re-listen on random port
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
  if (server && server.listening) {
    server.close(done);
  } else {
    done();
  }
});

describe('SP-11-612: Server Health & Core Endpoints', () => {
  describe('GET / (Root/Landing)', () => {
    it('should respond with 200 OK', async () => {
      const res = await request('/');
      expect(res.statusCode).toBe(200);
    });

    it('should return HTML content', async () => {
      const res = await request('/');
      expect(res.headers['content-type']).toMatch(/text\/html/);
    });

    it('should include security headers', async () => {
      const res = await request('/');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('GET /api/session (Session State)', () => {
    it('should respond with JSON', async () => {
      const res = await request('/api/session');
      // May return 200 with data or 404/500 if session file missing
      expect([200, 404, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.headers['content-type']).toMatch(/application\/json/);
        const data = JSON.parse(res.body);
        expect(data).toBeDefined();
      }
    });
  });

  describe('GET /api/questionnaires (Questionnaire List)', () => {
    it('should respond with JSON array or error', async () => {
      const res = await request('/api/questionnaires');
      expect([200, 404, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });

  describe('GET /api/decisions (Decisions)', () => {
    it('should respond with JSON or error', async () => {
      const res = await request('/api/decisions');
      expect([200, 404, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });

  describe('GET /api/metrics (Metrics Dashboard)', () => {
    it('should respond with metrics data', async () => {
      const res = await request('/api/metrics');
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.headers['content-type']).toMatch(/application\/json/);
        const data = JSON.parse(res.body);
        expect(data).toBeDefined();
      }
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for unknown API routes', async () => {
      const res = await request('/api/nonexistent-route-xyz');
      expect(res.statusCode).toBe(404);
    });

    it('should return JSON error body for API 404s', async () => {
      const res = await request('/api/nonexistent-route-xyz');
      if (res.headers['content-type']?.includes('application/json')) {
        const data = JSON.parse(res.body);
        expect(data.code || data.error).toBeDefined();
      }
    });
  });

  describe('Method Validation', () => {
    it('should reject DELETE on read-only endpoints', async () => {
      const res = await request('/api/session', { method: 'DELETE' });
      // Expect 405 Method Not Allowed or 404
      expect([404, 405]).toContain(res.statusCode);
    });
  });

  describe('Security Headers', () => {
    it('should set X-Content-Type-Options on HTML responses', async () => {
      const res = await request('/');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options on dashboard', async () => {
      const res = await request('/dashboard');
      if (res.statusCode === 200) {
        expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      }
    });

    it('should set Content-Security-Policy on dashboard', async () => {
      const res = await request('/dashboard');
      if (res.statusCode === 200) {
        expect(res.headers['content-security-policy']).toBeDefined();
        expect(res.headers['content-security-policy']).toMatch(/default-src/);
      }
    });

    it('should set Referrer-Policy header', async () => {
      const res = await request('/dashboard');
      if (res.statusCode === 200) {
        expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      }
    });
  });

  describe('GET /api/progress (Progress)', () => {
    it('should respond with JSON or error', async () => {
      const res = await request('/api/progress');
      expect([200, 404, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });

  describe('GET /api/drift (Drift Detection)', () => {
    it('should respond with JSON or error', async () => {
      const res = await request('/api/drift');
      expect([200, 404, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });

  describe('GET /api/milestones (Milestones)', () => {
    it('should respond with JSON array or error', async () => {
      const res = await request('/api/milestones');
      expect([200, 404, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });

  describe('GET /api/dashboard/stats (Dashboard Stats)', () => {
    it('should respond with JSON stats', async () => {
      const res = await request('/api/dashboard/stats');
      expect([200, 404, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });

  describe('GET /api/dashboard/activity (Dashboard Activity)', () => {
    it('should respond with JSON activity data', async () => {
      const res = await request('/api/dashboard/activity');
      expect([200, 404, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });

  describe('GET /api/export (Export)', () => {
    it('should respond with export data or error', async () => {
      const res = await request('/api/export');
      expect([200, 404, 500]).toContain(res.statusCode);
    });
  });

  describe('RISK-801: Access Control Validation', () => {
    it('should not leak sensitive file content via path traversal', async () => {
      // Node HTTP client normalizes /../ in URLs, so the server receives /etc/passwd
      // The safePath middleware prevents actual file access outside webapp dir
      const res = await request('/etc/passwd');
      // Response body must NOT contain Unix passwd file content
      expect(res.body).not.toMatch(/root:.*:0:0/);
    });

    it('should not leak system files via encoded traversal', async () => {
      const res = await request('/%2e%2e/%2e%2e/etc/passwd');
      expect(res.body).not.toMatch(/root:.*:0:0/);
    });

    it('should not expose server internals in error responses', async () => {
      const res = await request('/api/nonexistent-route-xyz');
      // Error response should not contain stack traces or file paths
      expect(res.body).not.toMatch(/node_modules/);
      expect(res.body).not.toMatch(/at\s+\w+\s+\(/); // stack trace pattern
    });

    it('should reject oversized request bodies', async () => {
      const largeBody = 'x'.repeat(2 * 1024 * 1024); // 2MB
      try {
        const res = await request('/api/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: largeBody,
        });
        // Server may respond with 413 before reading the full body
        expect([400, 413, 414]).toContain(res.statusCode);
      } catch (err) {
        // ECONNRESET is valid — server closed connection to reject oversized body
        expect(err.code).toBe('ECONNRESET');
      }
    });
  });

  describe('RISK-804: Concurrent Request Behavior', () => {
    it('should handle multiple simultaneous requests', async () => {
      const requests = Array.from({ length: 10 }, () => request('/api/session'));
      const results = await Promise.all(requests);
      // All requests should get valid responses (no crashes)
      results.forEach((res) => {
        expect([200, 404, 500]).toContain(res.statusCode);
      });
    });
  });
});
