// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export interface StaticStoreLike {
  exists(filePath: string): boolean;
  readFile(filePath: string): string;
}

export interface CreateStaticHandlerOptions {
  webappDir: string;
  getStore: () => StaticStoreLike;
  safePath: (basePath: string, relativePath: string) => string;
  setSecurityHeaders: (rawResponse: unknown) => void;
  notFoundText: string;
}

export interface RegisterStaticFallbackOptions extends CreateStaticHandlerOptions {
  app: FastifyInstance;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export function createStaticHandler(options: CreateStaticHandlerOptions) {
  const { webappDir, getStore, safePath, setSecurityHeaders, notFoundText } = options;
  const uiDist = path.join(webappDir, 'ui', 'dist');

  let cachedSpaHtml: Buffer | null = null;
  try {
    const spaPath = path.join(uiDist, 'index.html');
    if (getStore().exists(spaPath)) {
      cachedSpaHtml = Buffer.from(getStore().readFile(spaPath));
    }
  } catch {
    // React build not present — fallback handler returns 404 for non-API routes.
  }

  function serveDistFile(pathname: string, reply: FastifyReply): boolean {
    try {
      const filePath = safePath(uiDist, pathname.startsWith('/') ? pathname.slice(1) : pathname);
      if (!getStore().exists(filePath)) return false;

      const content = getStore().readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      const isHashed = pathname.startsWith('/assets/');

      const raw = reply.raw;
      setSecurityHeaders(raw);
      raw.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': Buffer.byteLength(content),
        'Cache-Control': isHashed ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
      });
      raw.end(content);
      reply.hijack();
      return true;
    } catch {
      return false;
    }
  }

  return function serveStatic(request: FastifyRequest, reply: FastifyReply): void {
    const pathname = (request.url || '/').split('?')[0];

    // Try serving a real file from ui/dist/
    if (serveDistFile(pathname, reply)) return;

    // SPA fallback — serve index.html for client-side routing
    const raw = reply.raw;
    setSecurityHeaders(raw);
    if (!cachedSpaHtml) {
      raw.writeHead(404, { 'Content-Type': 'text/plain' });
      raw.end(notFoundText);
      reply.hijack();
      return;
    }

    raw.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': cachedSpaHtml.length,
    });
    raw.end(cachedSpaHtml);
    reply.hijack();
  };
}

export function registerStaticFallback(options: RegisterStaticFallbackOptions): void {
  const { app, ...handlerOptions } = options;
  app.get('*', createStaticHandler(handlerOptions));
}
