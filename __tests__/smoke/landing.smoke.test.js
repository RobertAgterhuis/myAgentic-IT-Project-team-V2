/**
 * E2E Smoke Test Suite — SP-11-613
 * Critical User Journey Validation
 *
 * HTTP-based smoke tests for the Questionnaire Manager webapp.
 * Uses Node built-in http module — no Playwright dependency required.
 * Follows the same server-import pattern proven in integration tests.
 *
 * Run:  npm run test:smoke
 */

const http = require('http');
const path = require('path');

const SERVER_PATH = path.resolve(__dirname, '../../.github/webapp/server.js');

let server;
let baseUrl;

/** Make an HTTP request to the test server. */
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
      res.on('data', (chunk) => { body += chunk; });
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
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        done();
      });
    });
  } else {
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
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

/* ── SMOKE-001: Landing page loads ──────────────────────────────── */
describe('SMOKE-001: Landing page loads', () => {
  it('should return 200 for the root path', async () => {
    const res = await request('/');
    expect(res.statusCode).toBe(200);
  });

  it('should return HTML content', async () => {
    const res = await request('/');
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.body).toContain('<');
  });

  it('should include security headers', async () => {
    const res = await request('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

/* ── SMOKE-002: Dashboard accessible ────────────────────────────── */
describe('SMOKE-002: Dashboard accessible', () => {
  it('should return 200 for /dashboard', async () => {
    const res = await request('/dashboard');
    expect(res.statusCode).toBe(200);
  });

  it('should return HTML with dashboard content', async () => {
    const res = await request('/dashboard');
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should include security headers', async () => {
    const res = await request('/dashboard');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

/* ── SMOKE-003: Health endpoint healthy ─────────────────────────── */
describe('SMOKE-003: Health endpoint', () => {
  it('should return 200 OK on /health', async () => {
    const res = await request('/health');
    expect(res.statusCode).toBe(200);
  });

  it('should return JSON with status ok', async () => {
    const res = await request('/health');
    const data = JSON.parse(res.body);
    expect(data.status).toBe('ok');
  });

  it('should return 200 OK on /api/health', async () => {
    const res = await request('/api/health');
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.status).toBe('ok');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('uptime');
  });

  it('should respond within 500ms', async () => {
    const start = Date.now();
    await request('/health');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});

/* ── SMOKE-004: API session reachable ───────────────────────────── */
describe('SMOKE-004: API session reachable', () => {
  it('should return 200 or 404 for /api/session', async () => {
    const res = await request('/api/session');
    expect([200, 404]).toContain(res.statusCode);
  });

  it('should return JSON response', async () => {
    const res = await request('/api/session');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('should not return a 5xx server error', async () => {
    const res = await request('/api/session');
    expect(res.statusCode).toBeLessThan(500);
  });
});

/* ── SMOKE-005: Questionnaire list loads ────────────────────────── */
describe('SMOKE-005: Questionnaire list loads', () => {
  it('should return 200 or 404 for /api/questionnaires', async () => {
    const res = await request('/api/questionnaires');
    expect([200, 404]).toContain(res.statusCode);
  });

  it('should return JSON response', async () => {
    const res = await request('/api/questionnaires');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('should not return a 5xx server error', async () => {
    const res = await request('/api/questionnaires');
    expect(res.statusCode).toBeLessThan(500);
  });
});

/* ── SMOKE-006: Security headers on all endpoints ───────────────── */
describe('SMOKE-006: Security headers baseline', () => {
  const endpoints = ['/', '/health', '/api/health', '/api/session'];

  it.each(endpoints)('should set X-Content-Type-Options on %s', async (ep) => {
    const res = await request(ep);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should reject unsupported HTTP methods', async () => {
    const res = await request('/api/health', { method: 'DELETE' });
    expect([404, 405]).toContain(res.statusCode);
  });
});

/* ── SMOKE-007: API decisions endpoint ──────────────────────────── */
describe('SMOKE-007: Decisions endpoint', () => {
  it('should return 200 or 404 for /api/decisions', async () => {
    const res = await request('/api/decisions');
    expect([200, 404]).toContain(res.statusCode);
  });

  it('should return JSON and no server errors', async () => {
    const res = await request('/api/decisions');
    if (res.statusCode === 200) {
      expect(res.headers['content-type']).toMatch(/application\/json/);
    }
    expect(res.statusCode).toBeLessThan(500);
  });
});

/* ── SMOKE-008: Marketing landing page ──────────────────────────── */
describe('SMOKE-008: Marketing landing page', () => {
  it('should return 200 for /landing', async () => {
    const res = await request('/landing');
    expect(res.statusCode).toBe(200);
  });

  it('should return HTML with hero heading', async () => {
    const res = await request('/landing');
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.body).toContain('Design it right. Build it fast.');
  });

  it('should include value proposition pillars', async () => {
    const res = await request('/landing');
    expect(res.body).toContain('End-to-End Rigor');
    expect(res.body).toContain('Multi-Discipline');
    expect(res.body).toContain('Built-In Governance');
    expect(res.body).toContain('Execution Speed');
  });

  it('should include subscribe form', async () => {
    const res = await request('/landing');
    expect(res.body).toContain('subscribeForm');
    expect(res.body).toContain('/api/subscribe');
  });

  it('should include security headers', async () => {
    const res = await request('/landing');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('should include accessibility features', async () => {
    const res = await request('/landing');
    expect(res.body).toContain('skip-link');
    expect(res.body).toContain('aria-label');
    expect(res.body).toContain('lang="en"');
  });
});

/* ── Critical journey export (backward compat) ──────────────────── */
module.exports = {
  criticalJourneys: [
    { id: 'SMOKE-001', name: 'Landing page loads', path: '/', assertions: ['200 OK', 'HTML content', 'security headers'] },
    { id: 'SMOKE-002', name: 'Dashboard accessible', path: '/dashboard', assertions: ['200 OK', 'HTML content', 'security headers'] },
    { id: 'SMOKE-003', name: 'Health endpoint healthy', path: '/health', assertions: ['200 OK', 'status: ok', 'response < 500ms'] },
    { id: 'SMOKE-004', name: 'API session reachable', path: '/api/session', assertions: ['200 or 404', 'JSON response', 'no 5xx'] },
    { id: 'SMOKE-005', name: 'Questionnaire list loads', path: '/api/questionnaires', assertions: ['200 or 404', 'JSON response', 'no 5xx'] },
    { id: 'SMOKE-006', name: 'Security headers baseline', path: '*', assertions: ['X-Content-Type-Options', 'method rejection'] },
    { id: 'SMOKE-007', name: 'Decisions endpoint', path: '/api/decisions', assertions: ['200 or 404', 'JSON', 'no 5xx'] },
    { id: 'SMOKE-008', name: 'Marketing landing page', path: '/landing', assertions: ['200 OK', 'hero', 'pillars', 'subscribe', 'security', 'a11y'] },
  ],
};
