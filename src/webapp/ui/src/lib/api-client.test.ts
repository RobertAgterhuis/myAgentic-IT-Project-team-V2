/**
 * Tests: API client utility
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  ApiError,
  AUTH_EXPIRED_EVENT,
} from '@/lib/api-client';

describe('api-client', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(status: number, body: unknown) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: 'Test Status',
      json: () => Promise.resolve(body),
    } as Response);
  }

  it('apiGet sends GET and returns JSON', async () => {
    mockFetch(200, { ok: true });
    const result = await apiGet('/test');
    expect(result).toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it('apiGet appends query params', async () => {
    mockFetch(200, {});
    await apiGet('/test', { foo: 'bar' });
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('foo=bar');
  });

  it('apiPost sends POST with JSON body', async () => {
    mockFetch(200, { ok: true });
    await apiPost('/test', { data: 1 });
    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(JSON.stringify({ data: 1 }));
  });

  it('apiPut sends PUT', async () => {
    mockFetch(200, { ok: true });
    await apiPut('/test', { x: 1 });
    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(opts.method).toBe('PUT');
  });

  it('apiPatch sends PATCH', async () => {
    mockFetch(200, { ok: true });
    await apiPatch('/test');
    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(opts.method).toBe('PATCH');
  });

  it('apiDelete sends DELETE', async () => {
    mockFetch(200, { ok: true });
    await apiDelete('/test');
    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(opts.method).toBe('DELETE');
  });

  it('throws ApiError with status and message on non-OK response', async () => {
    mockFetch(400, { error: 'Bad request' });
    await expect(apiGet('/fail')).rejects.toThrow(ApiError);
    try {
      await apiGet('/fail');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(400);
      expect((e as ApiError).message).toBe('Bad request');
    }
  });

  it('throws ApiError with statusText when body has no error field', async () => {
    mockFetch(500, {});
    try {
      await apiGet('/fail');
    } catch (e) {
      expect((e as ApiError).message).toBe('Test Status');
    }
  });

  it('dispatches auth-expired event on 401 responses', async () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener as EventListener);

    mockFetch(401, { error: 'Unauthorized' });
    await expect(apiGet('/auth/check')).rejects.toThrow(ApiError);

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener as EventListener);
  });
});
