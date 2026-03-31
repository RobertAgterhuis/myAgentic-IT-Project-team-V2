import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Copyright (c) 2026 Robert Agterhuis. MIT License.

const path = require('path');
import * as __req_0 from '../../src/webapp/routes/misc-static';
const { createStaticHandler, registerStaticFallback } = __req_0;

function createReply() {
  const raw = {
    statusCode: 200,
    headers: {},
    body: undefined,
    writeHead(code, headers) {
      this.statusCode = code;
      this.headers = headers;
    },
    end(body) {
      this.body = body;
    },
  };

  return {
    raw,
    hijacked: false,
    hijack() {
      this.hijacked = true;
    },
  };
}

function createStore(files) {
  return {
    exists(filePath) {
      return Object.prototype.hasOwnProperty.call(files, filePath);
    },
    readFile(filePath) {
      if (!Object.prototype.hasOwnProperty.call(files, filePath)) {
        throw new Error('missing');
      }
      return files[filePath];
    },
  };
}

describe('misc static module', () => {
  it('registers catch-all route for static fallback', () => {
    const routes = new Map();
    const app = {
      get(route, handler) {
        routes.set(route, handler);
      },
    };

    registerStaticFallback({
      app,
      webappDir: '/webapp',
      getStore: () => createStore({}),
      safePath: (basePath, relativePath) => path.join(basePath, relativePath),
      setSecurityHeaders: () => {},
      notFoundText: 'not-found',
    });

    expect(routes.has('*')).toBe(true);
  });

  it('serves hashed assets with immutable cache headers', () => {
    const files = {
      [path.join('/webapp', 'ui', 'dist', 'assets', 'app.js')]: 'console.log(1);',
    };

    const handler = createStaticHandler({
      webappDir: '/webapp',
      getStore: () => createStore(files),
      safePath: (basePath, relativePath) => path.join(basePath, relativePath),
      setSecurityHeaders: () => {},
      notFoundText: 'not-found',
    });

    const reply = createReply();
    handler({ url: '/assets/app.js?v=1' }, reply);

    expect(reply.raw.statusCode).toBe(200);
    expect(reply.raw.headers['Content-Type']).toBe('application/javascript; charset=utf-8');
    expect(reply.raw.headers['Cache-Control']).toBe('public, max-age=31536000, immutable');
    expect(reply.raw.body).toBe('console.log(1);');
    expect(reply.hijacked).toBe(true);
  });

  it('falls back to index.html for SPA routes', () => {
    const files = {
      [path.join('/webapp', 'ui', 'dist', 'index.html')]: '<html>ok</html>',
    };

    const handler = createStaticHandler({
      webappDir: '/webapp',
      getStore: () => createStore(files),
      safePath: (basePath, relativePath) => path.join(basePath, relativePath),
      setSecurityHeaders: () => {},
      notFoundText: 'not-found',
    });

    const reply = createReply();
    handler({ url: '/deep/route' }, reply);

    expect(reply.raw.statusCode).toBe(200);
    expect(reply.raw.headers['Content-Type']).toBe('text/html; charset=utf-8');
    expect(String(reply.raw.body)).toBe('<html>ok</html>');
    expect(reply.hijacked).toBe(true);
  });

  it('returns 404 when no static file and no SPA index are available', () => {
    const handler = createStaticHandler({
      webappDir: '/webapp',
      getStore: () => createStore({}),
      safePath: (basePath, relativePath) => path.join(basePath, relativePath),
      setSecurityHeaders: () => {},
      notFoundText: 'not-found',
    });

    const reply = createReply();
    handler({ url: '/missing' }, reply);

    expect(reply.raw.statusCode).toBe(404);
    expect(reply.raw.headers['Content-Type']).toBe('text/plain');
    expect(reply.raw.body).toBe('not-found');
    expect(reply.hijacked).toBe(true);
  });

  it('falls back gracefully when safePath throws (catch branch in serveDistFile)', () => {
    // safePath throws for asset requests → serveDistFile returns false → SPA fallback tried
    const spaIndex = path.join('/webapp', 'ui', 'dist', 'index.html');
    const files = { [spaIndex]: '<html>spa</html>' };

    const handler = createStaticHandler({
      webappDir: '/webapp',
      getStore: () => createStore(files),
      safePath: (_basePath, relativePath) => {
        if (relativePath.includes('evil')) throw new Error('unsafe path');
        return path.join(_basePath, relativePath);
      },
      setSecurityHeaders: () => {},
      notFoundText: 'not-found',
    });

    const reply = createReply();
    handler({ url: '/evil/../etc/passwd' }, reply);

    // safePath threw → serveDistFile returns false → SPA index.html served
    expect(reply.raw.statusCode).toBe(200);
    expect(reply.raw.headers['Content-Type']).toBe('text/html; charset=utf-8');
    expect(reply.hijacked).toBe(true);
  });

  it('returns 404 when safePath throws and SPA is also unavailable', () => {
    const handler = createStaticHandler({
      webappDir: '/webapp',
      getStore: () => createStore({}),
      safePath: () => {
        throw new Error('unsafe path');
      },
      setSecurityHeaders: () => {},
      notFoundText: 'not-found',
    });

    const reply = createReply();
    handler({ url: '/evil' }, reply);

    expect(reply.raw.statusCode).toBe(404);
  });
});
