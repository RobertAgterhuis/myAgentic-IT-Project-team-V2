/**
 * Centralized API client — single fetch wrapper used by all hooks.
 * Handles base URL, JSON serialization, and error normalization.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function resolveApiBaseUrl(): string {
  const configured = String(import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!configured) return '/api';
  return configured;
}

const BASE_URL = resolveApiBaseUrl();
export const AUTH_EXPIRED_EVENT = 'agentic:auth-expired';
const AUTH_EXPIRED_DEBOUNCE_MS = 15_000;
const CSRF_COOKIE_NAME = 'csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

let lastAuthExpiredEventAt = 0;

function emitAuthExpiredEvent(status: number, endpoint: string): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (now - lastAuthExpiredEventAt < AUTH_EXPIRED_DEBOUNCE_MS) return;
  lastAuthExpiredEventAt = now;
  window.dispatchEvent(
    new CustomEvent(AUTH_EXPIRED_EVENT, {
      detail: {
        status,
        endpoint,
        at: new Date(now).toISOString(),
      },
    })
  );
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const part of parts) {
    const [rawKey, ...rest] = part.split('=');
    if (rawKey !== name) continue;
    const rawValue = rest.join('=');
    return decodeURIComponent(rawValue);
  }
  return null;
}

function getMutationHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const csrfToken = getCookie(CSRF_COOKIE_NAME);
  if (csrfToken) headers[CSRF_HEADER_NAME] = csrfToken;
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      emitAuthExpiredEvent(response.status, response.url || 'unknown');
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      /* non-JSON error body */
    }
    const message =
      (body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : null) ?? response.statusText;
    throw new ApiError(message, response.status, body);
  }
  return response.json() as Promise<T>;
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v == null) return;
      url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: getMutationHeaders(),
    credentials: 'same-origin',
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: getMutationHeaders(),
    credentials: 'same-origin',
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: getMutationHeaders(),
    credentials: 'same-origin',
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: getMutationHeaders(),
    credentials: 'same-origin',
  });
  return handleResponse<T>(res);
}
