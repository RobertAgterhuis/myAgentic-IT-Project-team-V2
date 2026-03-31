// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const { InMemoryStore, setStore } = require('../../src/webapp/store');
const { FileCache } = require('../../src/webapp/cache');
const { registerRoutes } = require('../../src/webapp/routes/help');
const { HelpService } = require('../../src/webapp/services');
const { createTestableRoutes } = require('../helpers/fastify-test-adapter.js');

/* ── Helpers ──────────────────────────────────────────────────── */

function createRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(k, v) {
      res.headers[k] = v;
    },
    writeHead(code, hdrs) {
      res.statusCode = code;
      if (hdrs) Object.assign(res.headers, hdrs);
    },
    end(data) {
      res.body = data || '';
    },
  };
  return res;
}

function parsed(res) {
  return JSON.parse(res.body);
}

function buildCtx() {
  const store = new InMemoryStore({});
  setStore(store);
  return {
    PROJECT_ROOT: '/project',
    BUSINESS_DOCS: '/project/BusinessDocs',
    SESSION_FILE: '/project/BusinessDocs/session/session-state.json',
    HELP_DIR: '/project/docs/help',
    _cache: new FileCache(store),
    _audit: { read: () => [] },
    safeWriteSync(filePath, data) {
      store.writeFile(filePath, data);
    },
  };
}

/* ── Route table (shared) ─────────────────────────────────────── */

let routes;

beforeEach(() => {
  routes = createTestableRoutes(registerRoutes, buildCtx());
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ── Tests ────────────────────────────────────────────────────── */

describe('routes/help', () => {
  it('exports expected route keys', () => {
    expect(routes).toHaveProperty('GET /api/v1/help/page/:routeSlug');
    expect(routes).toHaveProperty('GET /api/v1/help/topic/:topicId');
    expect(routes).toHaveProperty('GET /api/v1/help/search');
  });

  describe('GET /api/v1/help/page/:routeSlug', () => {
    it('returns 404 when help page is not found (line 16)', async () => {
      // No pages loaded (empty InMemoryStore) → getPageHelp returns null
      const res = createRes();
      await routes['GET /api/v1/help/page/:routeSlug'](
        { url: '/api/v1/help/page/dashboard', params: { routeSlug: 'dashboard' } },
        res
      );
      expect(res.statusCode).toBe(404);
      const body = parsed(res);
      // HELP_PAGE_NOT_FOUND is not in ERROR_CATALOG, so errorResponse falls back to INTERNAL_ERROR.
      expect(body.code).toBe('INTERNAL_ERROR');
    });

    it('returns 200 with page data when page exists', async () => {
      const fakePage = {
        routeSlug: 'dashboard',
        routePath: '/dashboard',
        pageTitle: 'Dashboard',
        purpose: 'Overview',
        coreActions: [],
        inputsOutputs: '',
        permissions: '',
        relatedPages: [],
        keywords: [],
        topicLinks: [],
      };
      vi.spyOn(HelpService.prototype, 'getPageHelp').mockReturnValue(fakePage);

      const res = createRes();
      await routes['GET /api/v1/help/page/:routeSlug'](
        { url: '/api/v1/help/page/dashboard', params: { routeSlug: 'dashboard' } },
        res
      );
      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.routeSlug).toBe('dashboard');
    });
  });

  describe('GET /api/v1/help/topic/:topicId', () => {
    it('returns 404 when help topic is not found', async () => {
      // Empty store → getTopic returns null
      const res = createRes();
      await routes['GET /api/v1/help/topic/:topicId'](
        { url: '/api/v1/help/topic/getting-started', params: { topicId: 'getting-started' } },
        res
      );
      expect(res.statusCode).toBe(404);
      const body = parsed(res);
      // HELP_TOPIC_NOT_FOUND is not in ERROR_CATALOG, so errorResponse falls back to INTERNAL_ERROR.
      expect(body.code).toBe('INTERNAL_ERROR');
    });

    it('returns 200 with topic data when topic exists', async () => {
      const fakeTopic = {
        topicId: 'getting-started',
        title: 'Getting Started',
        description: 'Intro topic',
        markdown: '# Intro',
        html: '<h1>Intro</h1>',
        keywords: ['intro'],
      };
      vi.spyOn(HelpService.prototype, 'getTopic').mockReturnValue(fakeTopic);

      const res = createRes();
      await routes['GET /api/v1/help/topic/:topicId'](
        { url: '/api/v1/help/topic/getting-started', params: { topicId: 'getting-started' } },
        res
      );
      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.topicId).toBe('getting-started');
    });
  });

  describe('GET /api/v1/help/search', () => {
    it('returns 400 when query is empty (line 54)', async () => {
      const res = createRes();
      await routes['GET /api/v1/help/search'](
        { url: '/api/v1/help/search?q=', query: { q: '' } },
        res
      );
      expect(res.statusCode).toBe(400);
      const body = parsed(res);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when query is whitespace only', async () => {
      const res = createRes();
      await routes['GET /api/v1/help/search'](
        { url: '/api/v1/help/search?q=%20', query: { q: '   ' } },
        res
      );
      expect(res.statusCode).toBe(400);
    });

    it('returns 200 with search results for non-empty query', async () => {
      vi.spyOn(HelpService.prototype, 'search').mockReturnValue([
        {
          kind: 'page',
          id: 'dashboard',
          title: 'Dashboard',
          snippet: 'Overview page',
          routePath: '/dashboard',
          score: 1,
        },
      ]);
      vi.spyOn(HelpService.prototype, 'getPageHelp').mockReturnValue({
        routeSlug: 'dashboard',
        routePath: '/dashboard',
        pageTitle: 'Dashboard',
        purpose: 'Overview',
        coreActions: [],
        inputsOutputs: '',
        permissions: '',
        relatedPages: [],
        keywords: [],
        topicLinks: [],
      });

      const res = createRes();
      await routes['GET /api/v1/help/search'](
        { url: '/api/v1/help/search?q=dashboard', query: { q: 'dashboard' } },
        res
      );
      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.query).toBe('dashboard');
      expect(body.count).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(body.results)).toBe(true);
    });

    it('returns 200 with empty results when nothing matches', async () => {
      vi.spyOn(HelpService.prototype, 'search').mockReturnValue([]);

      const res = createRes();
      await routes['GET /api/v1/help/search'](
        { url: '/api/v1/help/search?q=xyzzy', query: { q: 'xyzzy' } },
        res
      );
      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.count).toBe(0);
      expect(body.results).toHaveLength(0);
    });
  });
});
