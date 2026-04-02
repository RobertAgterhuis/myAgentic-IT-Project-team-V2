// Copyright (c) 2026 Robert Agterhuis. MIT License.

import fs from 'node:fs';
import path from 'node:path';

export interface QueueQuarantineEvent {
  queue: string;
  queuePath: string;
  quarantinePath: string;
  reason: string;
  repairedEntries: number;
}

export interface QueueReadOptions {
  queueName: string;
  queuePath: string;
  validateQueue: (value: unknown) => { valid: boolean; errors: string[] };
  validateEntry: (value: unknown) => { valid: boolean; errors: string[] };
  onQuarantine?: (event: QueueQuarantineEvent) => void;
}

export interface QueueReadResult<T> {
  queue: T[];
  quarantined: boolean;
  repairedEntries: number;
  quarantinePath?: string;
}

function ensureQueueFile(queuePath: string): void {
  const dir = path.dirname(queuePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(queuePath)) {
    fs.writeFileSync(queuePath, '[]\n', 'utf8');
  }
}

function buildQuarantinePath(queuePath: string): string {
  const dir = path.join(path.dirname(queuePath), 'quarantine');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const ext = path.extname(queuePath) || '.json';
  const base = path.basename(queuePath, ext);
  const nonce = Math.random().toString(36).slice(2, 8);
  return path.join(dir, `${base}.corrupt.${Date.now()}.${nonce}${ext}`);
}

function writeQueue(queuePath: string, entries: unknown[]): void {
  fs.writeFileSync(queuePath, JSON.stringify(entries, null, 2), 'utf8');
}

function quarantineAndRepair<T>(
  options: QueueReadOptions,
  rawSource: string,
  parsed: unknown,
  reason: string
): QueueReadResult<T> {
  const quarantinePath = buildQuarantinePath(options.queuePath);
  fs.writeFileSync(quarantinePath, rawSource, 'utf8');

  let repairedEntries: T[] = [];
  if (Array.isArray(parsed)) {
    repairedEntries = parsed.filter((entry) => options.validateEntry(entry).valid) as T[];
  }

  writeQueue(options.queuePath, repairedEntries);
  options.onQuarantine?.({
    queue: options.queueName,
    queuePath: options.queuePath,
    quarantinePath,
    reason,
    repairedEntries: repairedEntries.length,
  });

  return {
    queue: repairedEntries,
    quarantined: true,
    repairedEntries: repairedEntries.length,
    quarantinePath,
  };
}

export function readQueueWithQuarantine<T>(options: QueueReadOptions): QueueReadResult<T> {
  ensureQueueFile(options.queuePath);
  const rawSource = fs.readFileSync(options.queuePath, 'utf8');

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawSource);
  } catch {
    return quarantineAndRepair(options, rawSource, [], 'invalid-json');
  }

  const queueValidation = options.validateQueue(parsed);
  if (!queueValidation.valid) {
    return quarantineAndRepair(
      options,
      rawSource,
      parsed,
      queueValidation.errors.join('; ') || 'invalid-queue-shape'
    );
  }

  return {
    queue: parsed as T[],
    quarantined: false,
    repairedEntries: 0,
  };
}
