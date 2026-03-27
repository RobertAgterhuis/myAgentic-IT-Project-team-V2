// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── RemoteStorageProvider (M0.2 / BLOCKING 2.1) ──────────────── *
 * StorageProvider implementation that delegates persistence to a    *
 * remote service. A loopback transport helper is provided so the    *
 * same provider contract tests can run in-process.                  *
 * ─────────────────────────────────────────────────────────────── */

import type {
  StorageProvider,
  Document,
  Filter,
  Query,
  Operation,
  HealthStatus,
  StorageMetrics,
} from './storage-provider';

const MAX_LATENCY_SAMPLES = 200;

export type RemoteStorageAction =
  | 'initialize'
  | 'close'
  | 'read'
  | 'write'
  | 'delete'
  | 'list'
  | 'transaction'
  | 'query'
  | 'health';

export interface RemoteStorageRequest {
  action: RemoteStorageAction;
  collection?: string;
  id?: string;
  data?: Document;
  filter?: Filter;
  query?: Query;
  ops?: Operation[];
}

export interface RemoteStorageResponse {
  document?: Document | null;
  documents?: Document[];
  health?: HealthStatus;
}

export type RemoteStorageTransport = (
  request: RemoteStorageRequest
) => Promise<RemoteStorageResponse>;

export interface RemoteStorageProviderOptions {
  /** Base URL of the remote storage endpoint. */
  baseUrl?: string;
  /** API key sent as X-Storage-Api-Key header when present. */
  apiKey?: string;
  /** Optional custom transport (used by tests/loopback). */
  transport?: RemoteStorageTransport;
}

export class RemoteStorageProvider implements StorageProvider {
  readonly name = 'remote';

  private _baseUrl: string;
  private _apiKey?: string;
  private _transport: RemoteStorageTransport;
  private _metrics: StorageMetrics = {
    reads: 0,
    writes: 0,
    deletes: 0,
    errors: 0,
    readLatencies: [],
    writeLatencies: [],
  };

  constructor(opts?: RemoteStorageProviderOptions) {
    this._baseUrl =
      opts?.baseUrl || process.env.REMOTE_STORAGE_URL || 'http://127.0.0.1:3131/storage';
    this._apiKey = opts?.apiKey || process.env.REMOTE_STORAGE_API_KEY || undefined;
    this._transport = opts?.transport || this._createFetchTransport();
  }

  private _recordLatency(arr: number[], ms: number): void {
    arr.push(ms);
    if (arr.length > MAX_LATENCY_SAMPLES) arr.shift();
  }

  private _createFetchTransport(): RemoteStorageTransport {
    return async (request: RemoteStorageRequest): Promise<RemoteStorageResponse> => {
      const response = await fetch(this._baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this._apiKey ? { 'X-Storage-Api-Key': this._apiKey } : {}),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `Remote storage request failed (${response.status}): ${body || 'unknown error'}`
        );
      }

      return (await response.json()) as RemoteStorageResponse;
    };
  }

  async initialize(): Promise<void> {
    await this._transport({ action: 'initialize' });
  }

  async close(): Promise<void> {
    await this._transport({ action: 'close' });
  }

  async read(collection: string, id: string): Promise<Document | null> {
    const start = Date.now();
    try {
      const result = await this._transport({ action: 'read', collection, id });
      this._metrics.reads++;
      this._recordLatency(this._metrics.readLatencies, Date.now() - start);
      return result.document ?? null;
    } catch {
      this._metrics.errors++;
      return null;
    }
  }

  async write(collection: string, id: string, data: Document): Promise<void> {
    const start = Date.now();
    try {
      await this._transport({ action: 'write', collection, id, data });
      this._metrics.writes++;
      this._recordLatency(this._metrics.writeLatencies, Date.now() - start);
    } catch (err) {
      this._metrics.errors++;
      throw err;
    }
  }

  async delete(collection: string, id: string): Promise<void> {
    try {
      await this._transport({ action: 'delete', collection, id });
      this._metrics.deletes++;
    } catch (err) {
      this._metrics.errors++;
      throw err;
    }
  }

  async list(collection: string, filter?: Filter): Promise<Document[]> {
    const start = Date.now();
    try {
      const result = await this._transport({ action: 'list', collection, filter });
      this._metrics.reads++;
      this._recordLatency(this._metrics.readLatencies, Date.now() - start);
      return result.documents || [];
    } catch {
      this._metrics.errors++;
      return [];
    }
  }

  async transaction(ops: Operation[]): Promise<void> {
    await this._transport({ action: 'transaction', ops });
  }

  async query(collection: string, query: Query): Promise<Document[]> {
    const result = await this._transport({ action: 'query', collection, query });
    return result.documents || [];
  }

  async health(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const result = await this._transport({ action: 'health' });
      if (result.health) {
        return {
          ...result.health,
          provider: this.name,
        };
      }
      return {
        status: 'healthy',
        provider: this.name,
        latencyMs: Date.now() - start,
      };
    } catch {
      return {
        status: 'unhealthy',
        provider: this.name,
        latencyMs: Date.now() - start,
        details: { error: 'Remote endpoint unavailable' },
      };
    }
  }

  metrics(): StorageMetrics {
    return { ...this._metrics };
  }
}

/**
 * Loopback transport for tests: routes requests into another provider instance.
 */
export function createLoopbackRemoteTransport(provider: StorageProvider): RemoteStorageTransport {
  return async (request: RemoteStorageRequest): Promise<RemoteStorageResponse> => {
    switch (request.action) {
      case 'initialize':
        await provider.initialize();
        return {};
      case 'close':
        await provider.close();
        return {};
      case 'read':
        return {
          document: await provider.read(request.collection || '', request.id || ''),
        };
      case 'write':
        await provider.write(
          request.collection || '',
          request.id || '',
          request.data || { id: '' }
        );
        return {};
      case 'delete':
        await provider.delete(request.collection || '', request.id || '');
        return {};
      case 'list':
        return {
          documents: await provider.list(request.collection || '', request.filter),
        };
      case 'transaction':
        await provider.transaction(request.ops || []);
        return {};
      case 'query':
        return {
          documents: await provider.query(request.collection || '', request.query || {}),
        };
      case 'health':
        return {
          health: await provider.health(),
        };
      default:
        throw new Error(`Unsupported loopback action: ${String(request.action)}`);
    }
  };
}
