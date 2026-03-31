import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Copyright (c) 2026 Robert Agterhuis. MIT License.

const path = require('path');
import * as __req_0 from '../../src/webapp/static-handler';
const { createStaticHandler, resolveMimeType, MIME_TYPES } = __req_0;

function mockRes() {
  const res = {
    _headers: {},
    _statusCode: null,
    _body: null,
    setHeader: vi.fn((k, v) => {
      res._headers[k] = v;
    }),
    writeHead: vi.fn((code, headers) => {
      res._statusCode = code;
      Object.assign(res._headers, headers);
    }),
    end: vi.fn((body) => {
      res._body = body;
    }),
  };
  return res;
}

describe('createStaticHandler', () => {
  const rootDir = '/fake/dist';
  const files = {
    '/fake/dist/index.html': '<html></html>',
    '/fake/dist/assets/app.js': 'console.log("hi")',
    '/fake/dist/style.css': 'body{}',
  };

  function makeHandler() {
    return createStaticHandler(rootDir, {
      safePath: (base, rel) => path.join(base, rel),
      exists: (p) => !!files[p.replace(/\\/g, '/')],
      readFile: (p) => {
        const normalized = p.replace(/\\/g, '/');
        if (!files[normalized]) throw new Error('Not found');
        return files[normalized];
      },
      setSecurityHeaders: vi.fn(),
      baseUrl: 'http://127.0.0.1:3000',
    });
  }

  it('serves a file from rootDir with correct MIME type', () => {
    const handler = makeHandler();
    const res = mockRes();
    handler.serve({ url: '/style.css' }, res);
    expect(res._statusCode).toBe(200);
    expect(res._headers['Content-Type']).toBe('text/css; charset=utf-8');
    expect(res._body).toBe('body{}');
  });

  it('sets immutable cache for hashed assets', () => {
    const handler = makeHandler();
    const res = mockRes();
    handler.serve({ url: '/assets/app.js' }, res);
    expect(res._statusCode).toBe(200);
    expect(res._headers['Cache-Control']).toContain('immutable');
  });

  it('falls back to index.html for SPA routing', () => {
    const handler = makeHandler();
    const res = mockRes();
    handler.serve({ url: '/dashboard/overview' }, res);
    expect(res._statusCode).toBe(200);
    expect(res._headers['Content-Type']).toBe('text/html; charset=utf-8');
  });

  it('returns 404 when no SPA build exists', () => {
    const handler = createStaticHandler('/nonexistent', {
      safePath: (base, rel) => path.join(base, rel),
      exists: () => false,
      readFile: () => {
        throw new Error('nope');
      },
      setSecurityHeaders: vi.fn(),
      baseUrl: 'http://127.0.0.1:3000',
    });
    const res = mockRes();
    handler.serve({ url: '/anything' }, res);
    expect(res._statusCode).toBe(404);
  });
});

describe('resolveMimeType', () => {
  it('resolves known extensions', () => {
    expect(resolveMimeType('app.js')).toBe('application/javascript; charset=utf-8');
    expect(resolveMimeType('style.css')).toBe('text/css; charset=utf-8');
    expect(resolveMimeType('logo.svg')).toBe('image/svg+xml');
    expect(resolveMimeType('index.html')).toBe('text/html; charset=utf-8');
  });

  it('returns octet-stream for unknown extensions', () => {
    expect(resolveMimeType('file.xyz')).toBe('application/octet-stream');
  });
});

describe('MIME_TYPES', () => {
  it('contains all expected file types', () => {
    expect(MIME_TYPES).toHaveProperty('.html');
    expect(MIME_TYPES).toHaveProperty('.js');
    expect(MIME_TYPES).toHaveProperty('.css');
    expect(MIME_TYPES).toHaveProperty('.json');
    expect(MIME_TYPES).toHaveProperty('.svg');
    expect(MIME_TYPES).toHaveProperty('.png');
    expect(MIME_TYPES).toHaveProperty('.ico');
    expect(MIME_TYPES).toHaveProperty('.woff');
    expect(MIME_TYPES).toHaveProperty('.woff2');
  });
});
