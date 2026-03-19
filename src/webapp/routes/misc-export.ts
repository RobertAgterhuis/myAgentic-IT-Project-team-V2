// Copyright (c) 2026 Robert Agterhuis. MIT License.

export interface ExportStoreLike {
  exists(filePath: string): boolean;
}

export interface ExportCacheLike {
  read(filePath: string): string;
}

export interface CollectPhaseOutputsOptions {
  store: ExportStoreLike;
  cache: ExportCacheLike;
  projectRoot: string;
  maxExportSize: number;
  safePath: (basePath: string, relativePath: string) => string;
}

function readSafeFile(
  store: ExportStoreLike,
  cache: ExportCacheLike,
  safePathFn: (basePath: string, relativePath: string) => string,
  basePath: string,
  relativePath: string
): string | null {
  let filePath: string;
  try {
    filePath = safePathFn(basePath, relativePath);
  } catch {
    return null;
  }

  if (!store.exists(filePath)) return null;

  try {
    return cache.read(filePath);
  } catch {
    return null;
  }
}

function tryReadExportFile(
  store: ExportStoreLike,
  cache: ExportCacheLike,
  safePathFn: (basePath: string, relativePath: string) => string,
  projectRoot: string,
  filePath: string,
  sizeCtx: { size: number },
  maxExportSize: number
): string | null {
  const txt = readSafeFile(store, cache, safePathFn, projectRoot, filePath);
  if (!txt) return null;

  sizeCtx.size += Buffer.byteLength(txt);
  return sizeCtx.size <= maxExportSize ? txt : null;
}

function collectStringPhaseOutput(
  val: unknown,
  store: ExportStoreLike,
  cache: ExportCacheLike,
  safePathFn: (basePath: string, relativePath: string) => string,
  projectRoot: string,
  sizeCtx: { size: number },
  maxExportSize: number
): string | null {
  if (typeof val !== 'string' || val === 'null' || !val) {
    return null;
  }

  return tryReadExportFile(store, cache, safePathFn, projectRoot, val, sizeCtx, maxExportSize);
}

function collectObjectPhaseOutput(
  val: unknown,
  store: ExportStoreLike,
  cache: ExportCacheLike,
  safePathFn: (basePath: string, relativePath: string) => string,
  projectRoot: string,
  sizeCtx: { size: number },
  maxExportSize: number
): Record<string, string> | null {
  if (!val || typeof val !== 'object') {
    return null;
  }

  const entries: Record<string, string> = {};
  for (const [agentId, filePath] of Object.entries(val)) {
    if (sizeCtx.size > maxExportSize) {
      break;
    }

    if (typeof filePath === 'string' && filePath !== 'null') {
      const txt = tryReadExportFile(
        store,
        cache,
        safePathFn,
        projectRoot,
        filePath,
        sizeCtx,
        maxExportSize
      );
      if (txt) {
        entries[agentId] = txt;
      }
    }
  }

  return entries;
}

export function collectPhaseOutputs(
  phaseOutputs: Record<string, unknown>,
  options: CollectPhaseOutputsOptions
): Record<string, unknown> {
  const { store, cache, projectRoot, maxExportSize, safePath: safePathFn } = options;
  const result: Record<string, unknown> = {};
  const sizeCtx = { size: 0 };

  for (const [phase, val] of Object.entries(phaseOutputs)) {
    if (sizeCtx.size > maxExportSize) {
      break;
    }

    const out =
      collectStringPhaseOutput(
        val,
        store,
        cache,
        safePathFn,
        projectRoot,
        sizeCtx,
        maxExportSize
      ) ||
      collectObjectPhaseOutput(val, store, cache, safePathFn, projectRoot, sizeCtx, maxExportSize);

    if (out) {
      result[phase] = out;
    }
  }

  return result;
}
