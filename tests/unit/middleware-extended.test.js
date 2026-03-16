// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const {
  checkSecretsInBody,
  handleMethodNotAllowed,
  handleRouteError,
  json,
  setSecurityHeaders,
} = require('../../src/webapp/middleware');

/* ── Mock helpers for response objects ─────────────────────── */

function createMockResponse() {
  const headers = {};
  const res = {
    headersSent: false,
    statusCode: 0,
    _body: '',
    _headers: headers,
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    writeHead(status, hdrs) {
      res.statusCode = status;
      if (hdrs) Object.entries(hdrs).forEach(([k, v]) => (headers[k.toLowerCase()] = v));
    },
    end(body) {
      if (body) res._body = body;
    },
  };
  return res;
}

/* ── checkSecretsInBody ─────────────────────────────────────── */

describe('checkSecretsInBody', () => {
  it('returns empty array for clean fields', () => {
    const body = { text: 'Hello world', notes: 'No secrets here' };
    expect(checkSecretsInBody(body, ['text', 'notes'])).toEqual([]);
  });

  it('detects secrets in specified fields', () => {
    const body = { answer: 'key=AKIAIOSFODNN7EXAMPLE' };
    const result = checkSecretsInBody(body, ['answer']);
    expect(result).toContain('AWS Access Key');
  });

  it('skips fields that are falsy', () => {
    const body = { text: '', notes: null };
    expect(checkSecretsInBody(body, ['text', 'notes', 'missing'])).toEqual([]);
  });

  it('deduplicates warnings', () => {
    const body = {
      field1: 'key=AKIAIOSFODNN7EXAMPLE',
      field2: 'other AKIAIOSFODNN7EXAMPLE',
    };
    const result = checkSecretsInBody(body, ['field1', 'field2']);
    expect(result.filter((w) => w === 'AWS Access Key').length).toBe(1);
  });
});

/* ── handleMethodNotAllowed ─────────────────────────────────── */

describe('handleMethodNotAllowed', () => {
  it('returns false when no routes match the path', () => {
    const res = createMockResponse();
    const routes = { 'GET /api/status': () => {} };
    const handled = handleMethodNotAllowed(res, '/api/other', routes);
    expect(handled).toBe(false);
  });

  it('returns true and sends 405 when path matches but method differs', () => {
    const res = createMockResponse();
    const routes = {
      'GET /api/decisions': () => {},
      'POST /api/decisions': () => {},
    };
    const handled = handleMethodNotAllowed(res, '/api/decisions', routes);
    expect(handled).toBe(true);
    expect(res.statusCode).toBe(405);
    expect(res._headers['allow']).toContain('GET');
    expect(res._headers['allow']).toContain('POST');
    const body = JSON.parse(res._body);
    expect(body.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('matches parameterized routes like /api/decisions/:id', () => {
    const res = createMockResponse();
    const routes = {
      'PATCH /api/decisions/:id': () => {},
      'DELETE /api/decisions/:id': () => {},
    };
    const handled = handleMethodNotAllowed(res, '/api/decisions/DEC-T-001', routes);
    expect(handled).toBe(true);
    expect(res.statusCode).toBe(405);
    expect(res._headers['allow']).toContain('PATCH');
  });

  it('ignores route keys without a space separator', () => {
    const res = createMockResponse();
    const routes = { 'malformed-route': () => {} };
    expect(handleMethodNotAllowed(res, '/any', routes)).toBe(false);
  });
});

/* ── handleRouteError ───────────────────────────────────────── */

describe('handleRouteError', () => {
  it('sends error JSON when headers not yet sent', () => {
    const res = createMockResponse();
    const err = Object.assign(new Error('Not Found'), { status: 404, errorCode: 'NOT_FOUND' });
    handleRouteError(err, res);
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res._body);
    expect(body.code).toBe('NOT_FOUND');
    expect(body.message).toBe('Not Found');
  });

  it('defaults to 500 when err has no status', () => {
    const res = createMockResponse();
    handleRouteError(new Error('Boom'), res);
    expect(res.statusCode).toBe(500);
  });

  it('just ends response when headers already sent', () => {
    const res = createMockResponse();
    res.headersSent = true;
    let endCalled = false;
    res.end = () => {
      endCalled = true;
    };
    handleRouteError(new Error('Boom'), res);
    expect(endCalled).toBe(true);
    expect(res.statusCode).toBe(0);
  });
});

/* ── json helper ────────────────────────────────────────────── */

describe('json', () => {
  it('sends JSON response with correct headers', () => {
    const res = createMockResponse();
    json(res, 200, { ok: true });
    expect(res.statusCode).toBe(200);
    expect(res._headers['content-type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(res._body)).toEqual({ ok: true });
  });
});

/* ── setSecurityHeaders ─────────────────────────────────────── */

describe('setSecurityHeaders', () => {
  it('sets all required security headers', () => {
    const res = createMockResponse();
    setSecurityHeaders(res);
    expect(res._headers['x-content-type-options']).toBe('nosniff');
    expect(res._headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res._headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res._headers['content-security-policy']).toBeDefined();
    expect(res._headers['permissions-policy']).toBeDefined();
    expect(res._headers['cross-origin-opener-policy']).toBe('same-origin');
  });
});
