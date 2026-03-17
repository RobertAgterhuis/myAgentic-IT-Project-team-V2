// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Adapter that converts the HTTP route `ctx` object to a ServiceContext.
 * Used by route modules when delegating to shared services (M20-003).
 */

import path from 'path';
import { getStore } from '../store';
import { FileCache } from '../cache';
import type { ServiceContext } from './types';

/** Lazily created fallback cache for contexts that don't provide one. */
let _fallbackCache: FileCache | null = null;
function fallbackCache(): FileCache {
  if (!_fallbackCache) _fallbackCache = new FileCache();
  return _fallbackCache;
}

/**
 * Build a ServiceContext from the route-level `ctx` shared context.
 * Falls back to getStore() for the store singleton and provides
 * no-op defaults for optional dependencies (audit, cache).
 * Derives sessionDir from SESSION_FILE when SESSION_DIR is absent.
 */
export function toServiceContext(ctx: Record<string, unknown>): ServiceContext {
  const sessionDir =
    (ctx.SESSION_DIR as string) ||
    (ctx.SESSION_FILE ? path.dirname(ctx.SESSION_FILE as string) : '');

  return {
    get store() {
      return getStore();
    },
    cache: (ctx._cache as ServiceContext['cache']) || fallbackCache(),
    audit: (ctx._audit || { log() {}, read: () => [] }) as ServiceContext['audit'],
    safeWrite: ctx.safeWriteSync as ServiceContext['safeWrite'],
    projectRoot: (ctx.PROJECT_ROOT || '') as string,
    businessDocs: (ctx.BUSINESS_DOCS || '') as string,
    sessionDir,
    decisionsFile: (ctx.DECISIONS_FILE || '') as string,
    decisionsDir: (ctx.DECISIONS_DIR || '') as string,
    commandQueue: (ctx.COMMAND_QUEUE || '') as string,
    helpDir: (ctx.HELP_DIR || '') as string,
  };
}
