// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Static file handler for serving SPA builds (React from ui/dist/).
 * @module static-handler
 */

import http from 'http';
import path from 'path';

export interface StaticHandlerOptions {
  /** Function to resolve safe paths (prevents path traversal). */
  safePath: (base: string, relative: string) => string;
  /** Function to check if a file exists. */
  exists: (filePath: string) => boolean;
  /** Function to read file contents as string. */
  readFile: (filePath: string) => string;
  /** Function to set security headers on responses. */
  setSecurityHeaders: (res: http.ServerResponse) => void;
  /** Base URL for constructing URLs from requests (e.g. "http://127.0.0.1:3000"). */
  baseUrl: string;
}

export const MIME_TYPES: Record<string, string> = {
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

export interface StaticHandler {
  /** Serve a request — tries file from dist, falls back to SPA index.html. */
  serve(req: http.IncomingMessage, res: http.ServerResponse): void;
}

export function createStaticHandler(rootDir: string, options: StaticHandlerOptions): StaticHandler {
  const { safePath: safe, exists, readFile, setSecurityHeaders: setHeaders, baseUrl } = options;

  // Cache index.html at startup for SPA fallback
  let cachedSpaHtml: Buffer | null = null;
  try {
    const spaPath = path.join(rootDir, 'index.html');
    if (exists(spaPath)) cachedSpaHtml = Buffer.from(readFile(spaPath));
  } catch {
    /* SPA build not present */
  }

  function serveDistFile(pathname: string, res: http.ServerResponse): boolean {
    try {
      const filePath = safe(rootDir, pathname.startsWith('/') ? pathname.slice(1) : pathname);
      if (!exists(filePath)) return false;
      const content = readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      const isHashed = pathname.startsWith('/assets/');
      setHeaders(res);
      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': Buffer.byteLength(content),
        'Cache-Control': isHashed ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
      });
      res.end(content);
      return true;
    } catch {
      return false;
    }
  }

  function serve(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url!, baseUrl);
    const pathname = url.pathname;

    if (serveDistFile(pathname, res)) return;

    // SPA fallback
    setHeaders(res);
    if (!cachedSpaHtml) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': cachedSpaHtml.length,
    });
    res.end(cachedSpaHtml);
  }

  return { serve };
}

/**
 * Resolve MIME type from file extension.
 */
export function resolveMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}
