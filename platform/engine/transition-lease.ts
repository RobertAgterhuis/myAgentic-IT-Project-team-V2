// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'node:path';
import { randomUUID } from 'node:crypto';

interface EngineStore {
  exists(p: string): boolean;
  readFile(p: string): string;
  writeFile(p: string, d: string): void;
  mkdirp(p: string): void;
}

interface TransitionLeaseRecord {
  lease_id: string;
  owner_id: string;
  token: string;
  acquired_at: string;
  expires_at: string;
  state_from: string;
  state_to: string;
}

interface AcquireOptions {
  ownerId: string;
  from: string;
  to: string;
  ttlMs: number;
  now?: number;
}

interface LeaseResult {
  acquired: boolean;
  token?: string;
  ownerId?: string;
  reason?: 'owned-by-other' | 'lost-race';
  expiresAt?: string;
}

function ensureDir(store: EngineStore, targetPath: string): void {
  const dir = path.dirname(targetPath);
  if (dir && dir !== '.' && !store.exists(dir)) {
    store.mkdirp(dir);
  }
}

function readLease(store: EngineStore, leasePath: string): TransitionLeaseRecord | null {
  if (!store.exists(leasePath)) return null;
  try {
    const parsed = JSON.parse(store.readFile(leasePath)) as TransitionLeaseRecord;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.owner_id || !parsed.token || !parsed.expires_at) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isExpired(lease: TransitionLeaseRecord | null, now: number): boolean {
  if (!lease) return true;
  const expires = Date.parse(lease.expires_at);
  if (Number.isNaN(expires)) return true;
  return expires <= now;
}

export class TransitionLeaseManager {
  private _store: EngineStore;
  private _leasePath: string;

  constructor(store: EngineStore, leasePath?: string) {
    this._store = store;
    this._leasePath =
      leasePath || path.resolve(process.cwd(), 'BusinessDocs', 'session', 'transition-lease.json');
  }

  acquire(options: AcquireOptions): LeaseResult {
    const now = options.now ?? Date.now();
    const current = readLease(this._store, this._leasePath);

    if (current && !isExpired(current, now) && current.owner_id !== options.ownerId) {
      return {
        acquired: false,
        ownerId: current.owner_id,
        reason: 'owned-by-other',
        expiresAt: current.expires_at,
      };
    }

    const token = randomUUID();
    const next: TransitionLeaseRecord = {
      lease_id: randomUUID(),
      owner_id: options.ownerId,
      token,
      acquired_at: new Date(now).toISOString(),
      expires_at: new Date(now + options.ttlMs).toISOString(),
      state_from: options.from,
      state_to: options.to,
    };

    ensureDir(this._store, this._leasePath);
    this._store.writeFile(this._leasePath, JSON.stringify(next, null, 2));

    const verified = readLease(this._store, this._leasePath);
    if (!verified || verified.token !== token || verified.owner_id !== options.ownerId) {
      return { acquired: false, reason: 'lost-race' };
    }

    return {
      acquired: true,
      token,
      ownerId: options.ownerId,
      expiresAt: verified.expires_at,
    };
  }

  renew(ownerId: string, token: string, ttlMs: number, now?: number): boolean {
    const ts = now ?? Date.now();
    const current = readLease(this._store, this._leasePath);
    if (!current) return false;
    if (current.owner_id !== ownerId || current.token !== token) return false;
    if (isExpired(current, ts)) return false;

    const renewed: TransitionLeaseRecord = {
      ...current,
      expires_at: new Date(ts + ttlMs).toISOString(),
    };
    this._store.writeFile(this._leasePath, JSON.stringify(renewed, null, 2));
    return true;
  }

  release(ownerId: string, token: string): boolean {
    const current = readLease(this._store, this._leasePath);
    if (!current) return false;
    if (current.owner_id !== ownerId || current.token !== token) return false;

    const released: TransitionLeaseRecord = {
      ...current,
      expires_at: new Date(0).toISOString(),
    };
    this._store.writeFile(this._leasePath, JSON.stringify(released, null, 2));
    return true;
  }

  current(): TransitionLeaseRecord | null {
    return readLease(this._store, this._leasePath);
  }
}
