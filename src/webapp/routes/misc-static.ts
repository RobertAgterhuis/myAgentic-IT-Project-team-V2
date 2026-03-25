// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'path';
import type { ServerResponse } from 'http';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export interface StaticStoreLike {
  exists(filePath: string): boolean;
  readFile(filePath: string): string;
}

export interface CreateStaticHandlerOptions {
  webappDir: string;
  getStore: () => StaticStoreLike;
  safePath: (basePath: string, relativePath: string) => string;
  setSecurityHeaders: (res: ServerResponse) => void;
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
  const spaPath = path.join(uiDist, 'index.html');

  function serveDistFile(pathname: string, reply: FastifyReply): boolean {
    try {
      const filePath = safePath(uiDist, pathname.startsWith('/') ? pathname.slice(1) : pathname);
      if (!getStore().exists(filePath)) return false;

      const content = getStore().readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      const isHashed = pathname.startsWith('/assets/');
      const isHtml = ext === '.html';

      const raw = reply.raw;
      setSecurityHeaders(raw);
      raw.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': Buffer.byteLength(content),
        'Cache-Control': isHtml
          ? 'no-store'
          : isHashed
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=3600',
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
    if (!getStore().exists(spaPath)) {
      raw.writeHead(404, { 'Content-Type': 'text/plain' });
      raw.end(notFoundText);
      reply.hijack();
      return;
    }

    const spaHtml = Buffer.from(getStore().readFile(spaPath));

    raw.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': spaHtml.length,
      'Cache-Control': 'no-store',
    });
    raw.end(spaHtml);
    reply.hijack();
  };
}

export function registerStaticFallback(options: RegisterStaticFallbackOptions): void {
  const { app, ...handlerOptions } = options;
  app.get('*', createStaticHandler(handlerOptions));
}
