// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * HTTP middleware, request/response helpers, sanitization utilities,
 * and structured logging for the Questionnaire Manager server.
 * All exports are pure functions — no shared state.
 */

import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import { errorResponse, statusToCode } from './utils/errors';

/* ── Structured logging (IMPL-CONSTRAINT-006: no PII in logs) ── */
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const LOG_LEVELS: Record<string, number> = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LOG_LEVEL = LOG_LEVELS[LOG_LEVEL] ?? 2;

export function structuredLog(
  level: string,
  message: string,
  fields: Record<string, unknown> = {}
): void {
  if ((LOG_LEVELS[level] ?? 2) > CURRENT_LOG_LEVEL) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

export function log(method: string, url: string, status: number, ms: number): void {
  structuredLog('info', 'http_request', { method, url, status, duration_ms: ms });
}

/* ── Security headers ─────────────────────────────────────────── */

export function setSecurityHeaders(res: ServerResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'self'; base-uri 'self'; object-src 'none'"
  );
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
}

/* ── Path safety (IMPL-CONSTRAINT-003) ────────────────────────── */

export function safePath(base: string, relative: string): string {
  const absBase = path.resolve(base);
  const resolved = path.resolve(base, relative);
  const rel = path.relative(absBase, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw Object.assign(new Error('Path traversal blocked'), {
      status: 403,
      errorCode: 'PATH_TRAVERSAL',
    });
  }
  return resolved;
}

/* ── Input validation ─────────────────────────────────────────── */

export function assertString(val: unknown, name: string, maxLen = 1000): void {
  if (typeof val !== 'string')
    throw Object.assign(new Error(`${name} must be a string`), {
      status: 400,
      errorCode: 'INVALID_INPUT',
    });
  if (val.length > maxLen)
    throw Object.assign(new Error(`${name} exceeds max length (${maxLen})`), {
      status: 400,
      errorCode: 'INVALID_INPUT',
    });
}

/* ── Response helpers ─────────────────────────────────────────── */

export function json(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  setSecurityHeaders(res);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

/* ── Body parsing (IMPL-CONSTRAINT-005: Content-Type enforcement) */

export const MAX_BODY = 1_048_576; // 1 MB

export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        req.destroy();
        return reject(
          Object.assign(new Error('Payload too large'), {
            status: 413,
            errorCode: 'PAYLOAD_TOO_LARGE',
          })
        );
      }
      chunks.push(c);
    });
    req.on('end', () =>
      resolve(
        Buffer.concat(chunks)
          .toString('utf8')
          // eslint-disable-next-line no-control-regex -- intentional control-char sanitization
          .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
      )
    );
    req.on('error', reject);
  });
}

export async function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const ct = req.headers['content-type'] || '';
  const mediaType = ct.split(';')[0].trim().toLowerCase();
  if (mediaType !== 'application/json') {
    throw Object.assign(new Error('Content-Type must be application/json'), {
      status: 415,
      errorCode: 'INVALID_CONTENT_TYPE',
    });
  }
  const raw = await readBody(req);
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('Invalid JSON in request body'), {
      status: 400,
      errorCode: 'INVALID_JSON',
    });
  }
}

/* ── Content sanitization (IMPL-CONSTRAINT-002) ───────────────── */

export function sanitizeMarkdown(text: string): string {
  if (typeof text !== 'string') return text;
  return text
    .replace(/^(#{1,6})\s/gm, '\\$1 ')
    .replace(/^(\s*---+\s*)$/gm, '\\---')
    .replace(/(Q-\d{1,3}-\d{1,4})/g, 'Q\\u2010$1'.replace('Q\\u2010Q-', 'Q\u2010'))
    .replace(/^\|/gm, '\\|')
    .replace(/^(\s*>\s*#{1,6})\s/gm, '$1\\');
}

export function sanitizeQID(text: string): string {
  if (typeof text !== 'string') return text;
  return text.replace(/Q-(\d{1,3})-(\d{1,4})/g, 'Q\u2010$1\u2010$2');
}

/* ── Secret detection (IMPL-CONSTRAINT-008) ───────────────────── */

export const SECRET_PATTERNS = [
  { name: 'AWS Access Key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub Token', re: /gh[ps]_[A-Za-z0-9_]{36,}/ },
  { name: 'Azure Storage Key', re: /[A-Za-z0-9/+]{86}==/ },
  {
    name: 'Generic API Key',
    re: /(?:^|[^/\w])(?:api[_-]?key|apikey|secret[_-]?key)\s*[:=]\s*['"]?[A-Za-z0-9_-]{20,}/i,
  },
  { name: 'Private Key', re: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/ },
  { name: 'Bearer Token', re: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/i },
];

export function detectSecrets(text: string): string[] {
  if (typeof text !== 'string') return [];
  const found: string[] = [];
  for (const { name, re } of SECRET_PATTERNS) {
    if (re.test(text)) found.push(name);
  }
  return found;
}

export function checkSecretsInBody(
  body: Record<string, unknown>,
  fieldsToCheck: string[]
): string[] {
  const warnings: string[] = [];
  for (const field of fieldsToCheck) {
    if (body[field]) {
      const hits = detectSecrets(body[field] as string);
      if (hits.length > 0) {
        structuredLog('warn', 'secret_pattern_detected', { field, patterns: hits });
        warnings.push(...hits);
      }
    }
  }
  return [...new Set(warnings)];
}

/* ── Error handling ───────────────────────────────────────────── */

export function handleMethodNotAllowed(
  res: ServerResponse,
  pathname: string,
  routes: Record<string, unknown>
): boolean {
  const matchPathTemplate = (template: string, pathValue: string): boolean => {
    if (template === pathValue) return true;
    if (!template.includes(':')) return false;
    const tParts = template.split('/').filter(Boolean);
    const pParts = pathValue.split('/').filter(Boolean);
    if (tParts.length !== pParts.length) return false;
    for (let i = 0; i < tParts.length; i++) {
      if (tParts[i].startsWith(':')) continue;
      if (tParts[i] !== pParts[i]) return false;
    }
    return true;
  };

  const allowed = Object.keys(routes)
    .filter((k) => {
      const splitAt = k.indexOf(' ');
      if (splitAt < 0) return false;
      const routePath = k.slice(splitAt + 1);
      return matchPathTemplate(routePath, pathname);
    })
    .map((k) => k.split(' ')[0]);
  if (allowed.length === 0) return false;
  setSecurityHeaders(res);
  const body = JSON.stringify(errorResponse('METHOD_NOT_ALLOWED', 'Method Not Allowed'));
  res.writeHead(405, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    Allow: allowed.join(', '),
  });
  res.end(body);
  return true;
}

export function handleRouteError(
  err: Error & { errorCode?: string; status?: number },
  res: ServerResponse
): void {
  if (!res.headersSent) {
    const code = err.errorCode || statusToCode(err.status || 500);
    json(res, err.status || 500, errorResponse(code, err.message));
  } else {
    res.end();
  }
}
