// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── StorageProvider Factory (M23-005 prep) ───────────────────── *
 * Selects and initializes the correct StorageProvider based on    *
 * configuration.  STORAGE_PROVIDER env var: "file" | "sqlite".   *
 * ─────────────────────────────────────────────────────────────── */

import type { StorageProvider } from './storage-provider';
import { FileStorageProvider } from './file-provider';
import { SQLiteStorageProvider } from './sqlite-provider';

export type ProviderType = 'file' | 'sqlite';

export interface StorageProviderConfig {
  provider?: ProviderType;
  /** Base path for FileStorageProvider. */
  basePath?: string;
  /** Database file path for SQLiteStorageProvider. */
  dbPath?: string;
}

/**
 * Create and initialize a StorageProvider from configuration.
 * Reads STORAGE_PROVIDER env var if config.provider is not set.
 */
export async function createStorageProvider(
  config?: StorageProviderConfig
): Promise<StorageProvider> {
  const type: ProviderType =
    config?.provider || (process.env.STORAGE_PROVIDER as ProviderType) || 'file';

  let provider: StorageProvider;

  switch (type) {
    case 'sqlite':
      provider = new SQLiteStorageProvider({ dbPath: config?.dbPath });
      break;
    case 'file':
    default:
      provider = new FileStorageProvider({ basePath: config?.basePath });
      break;
  }

  await provider.initialize();
  return provider;
}
