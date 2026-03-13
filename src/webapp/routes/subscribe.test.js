// Copyright (c) 2026 Robert Agterhuis. MIT License.

import * as fs from 'fs';
import createSubscribeRoutes from './subscribe.js';

/* ── Mocks ──────────────────────────────────────────────────────── */

vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => '[]'),
  writeFileSync: vi.fn(),
}));

/* ── Helpers ────────────────────────────────────────────────────── */

function fakeRes() {
  let _status, _body;
  const _headers = {};
  return {
    setHeader(k, v) { _headers[k] = v; },
    writeHead(s, h) { _status = s; if (h) Object.assign(_headers, h); },
    end(data) { _body = data; },
    get status() { return _status; },
    get json() { return JSON.parse(_body); },
    get headers() { return _headers; },
  };
}

function fakeReq(body) {
  const bodyStr = JSON.stringify(body);
  return {
    headers: { 'content-type': 'application/json', host: 'localhost:3000' },
    on(event, cb) {
      if (event === 'data') cb(Buffer.from(bodyStr));
      if (event === 'end') cb();
    },
  };
}

/* ── Tests ──────────────────────────────────────────────────────── */

describe('subscribe routes', () => {
  let routes, handler;
  const originalEnv = process.env.BUTTONDOWN_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.BUTTONDOWN_API_KEY;
    routes = createSubscribeRoutes({});
    handler = routes['POST /api/subscribe'];
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.BUTTONDOWN_API_KEY = originalEnv;
    } else {
      delete process.env.BUTTONDOWN_API_KEY;
    }
  });

  it('exports the POST /api/subscribe route', () => {
    expect(handler).toBeTypeOf('function');
  });

  /* ── Validation ─────────────────────────────────────────────── */

  it('rejects missing email', async () => {
    const res = fakeRes();
    await handler(fakeReq({ email: '', metadata: {} }), res);
    expect(res.status).toBe(400);
    expect(res.json.code).toBe('INVALID_INPUT');
  });

  it('rejects invalid email format', async () => {
    const res = fakeRes();
    await handler(fakeReq({ email: 'not-an-email', metadata: {} }), res);
    expect(res.status).toBe(400);
  });

  it('rejects invalid segment', async () => {
    const res = fakeRes();
    await handler(fakeReq({
      email: 'user@example.com',
      metadata: { segment: 'invalid-segment' },
    }), res);
    expect(res.status).toBe(400);
    expect(res.json.message).toContain('Segment must be one of');
  });

  it('accepts valid segments', async () => {
    fs.existsSync.mockReturnValue(false);
    for (const segment of ['engineering-leaders', 'product-managers', 'developers', 'evaluators']) {
      vi.clearAllMocks();
      fs.existsSync.mockReturnValue(false);
      const res = fakeRes();
      await handler(fakeReq({
        email: 'user@example.com',
        metadata: { segment },
      }), res);
      expect(res.status).toBe(201);
    }
  });

  it('defaults segment to evaluators when missing', async () => {
    fs.existsSync.mockReturnValue(false);
    const res = fakeRes();
    await handler(fakeReq({ email: 'user@example.com', metadata: {} }), res);
    expect(res.status).toBe(201);
  });

  /* ── Content-Type handling ──────────────────────────────────── */

  it('rejects non-JSON content type', async () => {
    const req = {
      headers: { 'content-type': 'text/plain', host: 'localhost:3000' },
      on(event, cb) {
        if (event === 'data') cb(Buffer.from('hello'));
        if (event === 'end') cb();
      },
    };
    const res = fakeRes();
    await handler(req, res);
    expect(res.status).toBe(415);
  });

  /* ── Local fallback (no API key) ───────────────────────────── */

  it('stores locally when no API key is configured', async () => {
    fs.existsSync.mockReturnValue(false);
    const res = fakeRes();
    await handler(fakeReq({
      email: 'test@example.com',
      metadata: { segment: 'developers', source: 'landing' },
    }), res);

    expect(res.status).toBe(201);
    expect(res.json.status).toBe('stored_locally');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('returns 409 for duplicate local subscription', async () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify([
      { email: 'dupe@example.com', segment: 'developers', source: 'landing' },
    ]));

    const res = fakeRes();
    await handler(fakeReq({
      email: 'dupe@example.com',
      metadata: { segment: 'developers' },
    }), res);

    expect(res.status).toBe(409);
    expect(res.json.error).toBe('already_subscribed');
  });

  it('still returns 201 when local write fails', async () => {
    fs.existsSync.mockReturnValue(false);
    fs.writeFileSync.mockImplementation(() => { throw new Error('disk full'); });

    const res = fakeRes();
    await handler(fakeReq({
      email: 'test@example.com',
      metadata: { segment: 'developers' },
    }), res);

    expect(res.status).toBe(201);
    expect(res.json.status).toBe('stored_locally');
  });

  /* ── Upstream (with API key) ───────────────────────────────── */

  it('sends to Buttondown when API key is set and returns 201', async () => {
    process.env.BUTTONDOWN_API_KEY = 'test-key-abc';
    const mockFetch = vi.fn().mockResolvedValue({ status: 201 });
    globalThis.fetch = mockFetch;

    const res = fakeRes();
    await handler(fakeReq({
      email: 'upstream@example.com',
      metadata: { segment: 'developers' },
    }), res);

    expect(res.status).toBe(201);
    expect(res.json.status).toBe('pending_confirmation');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.buttondown.email/v1/subscribers',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Token test-key-abc',
        }),
      })
    );

    delete globalThis.fetch;
  });

  it('returns 409 when Buttondown returns 409', async () => {
    process.env.BUTTONDOWN_API_KEY = 'test-key-abc';
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 409 });

    const res = fakeRes();
    await handler(fakeReq({
      email: 'dupe@example.com',
      metadata: { segment: 'developers' },
    }), res);

    expect(res.status).toBe(409);
    expect(res.json.error).toBe('already_subscribed');

    delete globalThis.fetch;
  });

  it('returns 502 when Buttondown returns unexpected status', async () => {
    process.env.BUTTONDOWN_API_KEY = 'test-key-abc';
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });

    const res = fakeRes();
    await handler(fakeReq({
      email: 'user@example.com',
      metadata: { segment: 'developers' },
    }), res);

    expect(res.status).toBe(502);

    delete globalThis.fetch;
  });

  it('returns 502 when fetch throws', async () => {
    process.env.BUTTONDOWN_API_KEY = 'test-key-abc';
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'));

    const res = fakeRes();
    await handler(fakeReq({
      email: 'user@example.com',
      metadata: { segment: 'developers' },
    }), res);

    expect(res.status).toBe(502);

    delete globalThis.fetch;
  });

  /* ── Source metadata ───────────────────────────────────────── */

  it('uses default source "direct" when not provided', async () => {
    fs.existsSync.mockReturnValue(false);
    const res = fakeRes();
    await handler(fakeReq({ email: 'test@example.com', metadata: {} }), res);
    expect(res.status).toBe(201);
    // Subscription was stored; verify writeFileSync was called with default source
    const written = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(written[0].source).toBe('direct');
  });

  it('truncates overly long source to 100 chars', async () => {
    fs.existsSync.mockReturnValue(false);
    const longSource = 'x'.repeat(200);
    const res = fakeRes();
    await handler(fakeReq({
      email: 'test@example.com',
      metadata: { segment: 'developers', source: longSource },
    }), res);
    expect(res.status).toBe(201);
    const written = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(written[0].source.length).toBe(100);
  });
});
