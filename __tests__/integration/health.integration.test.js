/**
 * Integration Test: Health Check Endpoints
 * SP-11-612 Test Strategy Framework
 *
 * Validates /health and /api/health endpoints respond correctly.
 */

const http = require('http');
const path = require('path');

const SERVER_PATH = path.resolve(__dirname, '../../.github/webapp/server.js');

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
  if (server && server.listening) {
    server.close(done);
  } else {
    done();
  }
});

describe('SP-11-612: Health Check Endpoints', () => {
  describe('GET /health', () => {
    it('should respond with 200 OK', async () => {
      const res = await request('/health');
      expect(res.statusCode).toBe(200);
    });

    it('should return JSON with status field', async () => {
      const res = await request('/health');
      expect(res.headers['content-type']).toMatch(/application\/json/);
      const data = JSON.parse(res.body);
      expect(data.status).toBeDefined();
    });

    it('should report healthy status', async () => {
      const res = await request('/health');
      const data = JSON.parse(res.body);
      expect(['healthy', 'ok']).toContain(data.status);
    });
  });

  describe('GET /api/health', () => {
    it('should respond with 200 OK', async () => {
      const res = await request('/api/health');
      expect(res.statusCode).toBe(200);
    });

    it('should return JSON with status field', async () => {
      const res = await request('/api/health');
      expect(res.headers['content-type']).toMatch(/application\/json/);
      const data = JSON.parse(res.body);
      expect(data.status).toBeDefined();
    });
  });

  describe('GET /api/dashboard/health', () => {
    it('should respond with 200 OK', async () => {
      const res = await request('/api/dashboard/health');
      expect(res.statusCode).toBe(200);
    });

    it('should return JSON dashboard health data', async () => {
      const res = await request('/api/dashboard/health');
      expect(res.headers['content-type']).toMatch(/application\/json/);
      const data = JSON.parse(res.body);
      expect(data).toBeDefined();
    });
  });

  describe('Health endpoint method restrictions', () => {
    it('should reject POST on /health', async () => {
      const res = await request('/health', { method: 'POST' });
      expect([404, 405]).toContain(res.statusCode);
    });

    it('should reject PUT on /api/health', async () => {
      const res = await request('/api/health', { method: 'PUT' });
      expect([404, 405]).toContain(res.statusCode);
    });
  });
});
