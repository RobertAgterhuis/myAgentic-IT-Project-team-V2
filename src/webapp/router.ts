// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Lightweight path-template router extracted from server.ts.
 * Supports exact and parameterised (`:id`) path matching.
 * @module router
 */

import http from 'http';

export type RouteHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => Promise<void> | void;

export type RouteTable = Record<string, RouteHandler>;

export function matchPathTemplate(template: string, pathname: string): boolean {
  if (!template.includes(':')) return template === pathname;
  const tParts = template.split('/').filter(Boolean);
  const pParts = pathname.split('/').filter(Boolean);
  if (tParts.length !== pParts.length) return false;
  for (let i = 0; i < tParts.length; i++) {
    const t = tParts[i];
    if (t.startsWith(':')) continue;
    if (t !== pParts[i]) return false;
  }
  return true;
}

export function resolveRoute(
  routes: RouteTable,
  method: string,
  pathname: string
): RouteHandler | null {
  const exactKey = `${method} ${pathname}`;
  if (routes[exactKey]) return routes[exactKey];
  for (const [key, handler] of Object.entries(routes)) {
    const splitAt = key.indexOf(' ');
    if (splitAt < 0) continue;
    const routeMethod = key.slice(0, splitAt);
    if (routeMethod !== method) continue;
    const routePath = key.slice(splitAt + 1);
    if (matchPathTemplate(routePath, pathname)) return handler;
  }
  return null;
}

export function findRouteTemplate(
  routes: RouteTable,
  method: string,
  pathname: string
): string | null {
  for (const key of Object.keys(routes)) {
    const splitAt = key.indexOf(' ');
    if (splitAt < 0) continue;
    const routeMethod = key.slice(0, splitAt);
    if (routeMethod !== method) continue;
    const routePath = key.slice(splitAt + 1);
    if (matchPathTemplate(routePath, pathname)) return routePath;
  }
  return null;
}
