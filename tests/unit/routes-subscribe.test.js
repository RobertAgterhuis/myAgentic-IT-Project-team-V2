// Copyright (c) 2026 Robert Agterhuis. MIT License.
// Integration tests — no mocking (vitest v4 cannot intercept CJS require).

import path from 'path';
import crypto from 'crypto';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import createSubscribeRoutes from '../../src/webapp/routes/subscribe.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_SUBS_FILE = path.resolve(
  __dirname,
  '..',
  '..',
  'BusinessDocs',
  'local-subscriptions.json'
);

function cleanupSubsFile() {
  try {
    unlinkSync(LOCAL_SUBS_FILE);
  } catch {
    /* ignore */
  }
}

/* ── Helpers ────────────────────────────────────────────────────── */

function fakeRes() {
  let _status, _body;
  const _headers = {};
  return {
    setHeader(k, v) {
      _headers[k] = v;
    },
    writeHead(s, h) {
      _status = s;
      if (h) Object.assign(_headers, h);
    },
    end(data) {
      _body = data;
    },
    get status() {
      return _status;
    },
    get json() {
      return JSON.parse(_body);
    },
    get headers() {
      return _headers;
    },
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
    cleanupSubsFile();
    delete process.env.BUTTONDOWN_API_KEY;
    routes = createSubscribeRoutes({});
    handler = routes['POST /api/subscribe'];
  });

  afterEach(() => {
    cleanupSubsFile();
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
    await handler(
      fakeReq({
        email: 'user@example.com',
        metadata: { segment: 'invalid-segment' },
      }),
      res
    );
    expect(res.status).toBe(400);
    expect(res.json.message).toContain('Segment must be one of');
  });

  it('accepts valid segments', async () => {
    for (const segment of ['engineering-leaders', 'product-managers', 'developers', 'evaluators']) {
      cleanupSubsFile();
      const res = fakeRes();
      await handler(
        fakeReq({
          email: 'user@example.com',
          metadata: { segment },
        }),
        res
      );
      expect(res.status).toBe(201);
    }
  });

  it('defaults segment to evaluators when missing', async () => {
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
    const res = fakeRes();
    await handler(
      fakeReq({
        email: 'test@example.com',
        metadata: { segment: 'developers', source: 'landing' },
      }),
      res
    );

    expect(res.status).toBe(201);
    expect(res.json.status).toBe('stored_locally');
    expect(existsSync(LOCAL_SUBS_FILE)).toBe(true);
  });

  it('returns 409 for duplicate local subscription', async () => {
    const emailHash = crypto.createHash('sha256').update('dupe@example.com').digest('hex');
    writeFileSync(
      LOCAL_SUBS_FILE,
      JSON.stringify([{ emailHash, segment: 'developers', source: 'landing' }])
    );

    const res = fakeRes();
    await handler(
      fakeReq({
        email: 'dupe@example.com',
        metadata: { segment: 'developers' },
      }),
      res
    );

    expect(res.status).toBe(409);
    expect(res.json.error).toBe('already_subscribed');
  });

  it('returns 201 even when existing subscriptions file is corrupt', async () => {
    writeFileSync(LOCAL_SUBS_FILE, 'not-json');
    const res = fakeRes();
    await handler(
      fakeReq({
        email: 'test@example.com',
        metadata: { segment: 'developers' },
      }),
      res
    );
    expect(res.status).toBe(201);
    expect(res.json.status).toBe('stored_locally');
  });

  /* ── Upstream (with API key) ───────────────────────────────── */

  it('sends to Buttondown when API key is set and returns 201', async () => {
    process.env.BUTTONDOWN_API_KEY = 'test-key-abc';
    const mockFetch = vi.fn().mockResolvedValue({ status: 201 });
    globalThis.fetch = mockFetch;

    const res = fakeRes();
    await handler(
      fakeReq({
        email: 'upstream@example.com',
        metadata: { segment: 'developers' },
      }),
      res
    );

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
    await handler(
      fakeReq({
        email: 'dupe@example.com',
        metadata: { segment: 'developers' },
      }),
      res
    );

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
    await handler(
      fakeReq({
        email: 'user@example.com',
        metadata: { segment: 'developers' },
      }),
      res
    );

    expect(res.status).toBe(502);

    delete globalThis.fetch;
  });

  it('returns 502 when fetch throws', async () => {
    process.env.BUTTONDOWN_API_KEY = 'test-key-abc';
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'));

    const res = fakeRes();
    await handler(
      fakeReq({
        email: 'user@example.com',
        metadata: { segment: 'developers' },
      }),
      res
    );

    expect(res.status).toBe(502);

    delete globalThis.fetch;
  });

  /* ── Source metadata ───────────────────────────────────────── */

  it('uses default source "direct" when not provided', async () => {
    const res = fakeRes();
    await handler(fakeReq({ email: 'test@example.com', metadata: {} }), res);
    expect(res.status).toBe(201);
    const written = JSON.parse(readFileSync(LOCAL_SUBS_FILE, 'utf-8'));
    expect(written[0].source).toBe('direct');
  });

  it('truncates overly long source to 100 chars', async () => {
    const longSource = 'x'.repeat(200);
    const res = fakeRes();
    await handler(
      fakeReq({
        email: 'test@example.com',
        metadata: { segment: 'developers', source: longSource },
      }),
      res
    );
    expect(res.status).toBe(201);
    const written = JSON.parse(readFileSync(LOCAL_SUBS_FILE, 'utf-8'));
    expect(written[0].source.length).toBe(100);
  });

  it('uses fallback when metadata segment is non-string', async () => {
    const res = fakeRes();
    await handler(fakeReq({ email: 'test@example.com', metadata: { segment: 123 } }), res);
    expect(res.status).toBe(201);
    const written = JSON.parse(readFileSync(LOCAL_SUBS_FILE, 'utf-8'));
    expect(written[0].segment).toBe('evaluators');
  });

  it('uses fallback when metadata source is non-string', async () => {
    const res = fakeRes();
    await handler(fakeReq({ email: 'test@example.com', metadata: { source: true } }), res);
    expect(res.status).toBe(201);
    const written = JSON.parse(readFileSync(LOCAL_SUBS_FILE, 'utf-8'));
    expect(written[0].source).toBe('direct');
  });

  it('uses fallback when metadata is null', async () => {
    const res = fakeRes();
    await handler(fakeReq({ email: 'test@example.com', metadata: null }), res);
    expect(res.status).toBe(201);
    const written = JSON.parse(readFileSync(LOCAL_SUBS_FILE, 'utf-8'));
    expect(written[0].segment).toBe('evaluators');
    expect(written[0].source).toBe('direct');
  });

  it('returns 413 for payload exceeding 1 MB', async () => {
    // middleware.ts MAX_BODY = 1_048_576 bytes
    const bigBody = Buffer.alloc(1_048_577, 0x41); // 1 byte over limit
    const req = {
      headers: { 'content-type': 'application/json', host: 'localhost:3000' },
      destroy() {},
      on(event, cb) {
        if (event === 'data') cb(bigBody);
        if (event === 'end') cb();
        if (event === 'error') {
          /* store for potential use */
        }
      },
    };
    const res = fakeRes();
    await handler(req, res);
    expect(res.status).toBe(413);
    expect(res.json.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('handles upstream text() rejection gracefully', async () => {
    process.env.BUTTONDOWN_API_KEY = 'test-key-abc';
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 500,
      text: () => Promise.reject(new Error('text failed')),
    });

    const res = fakeRes();
    await handler(
      fakeReq({
        email: 'user@example.com',
        metadata: { segment: 'developers' },
      }),
      res
    );

    expect(res.status).toBe(502);
    delete globalThis.fetch;
  });
});
