// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Command service — shared business logic for the command queue (M20-002).
 *
 * Consumed by: HTTP route (routes/commands.ts) and MCP tool (mcp-server.ts).
 * Dependencies are injected via ServiceContext.
 */

import path from 'path';
import fs from 'node:fs';
import * as models from '../models';
import * as schemas from '../schemas';
import { withFileLock } from '../file-lock';
import { sanitizeMarkdown, sanitizeQID, detectSecrets } from '../middleware';
import { structuredLog } from '../middleware';
import { ServiceValidationError } from './decisions-service';
import { readQueueWithQuarantine } from './queue-quarantine';
import {
  getCommandCatalog,
  isKnownCommand,
  resolveKnownCommand,
  type CommandCatalogEntry,
} from './command-catalog';
import type {
  ServiceContext,
  CommandQueueEntry,
  QueueCommandInput,
  QueueCommandResult,
} from './types';

const MAX_QUEUE_SIZE = 50;

export class CommandService {
  private ctx: ServiceContext;
  private _queueDegraded = false;
  private _queueDegradedReason?: string;

  private isInMemoryStore(): boolean {
    return Boolean(
      this.ctx.store &&
      typeof this.ctx.store === 'object' &&
      '_files' in (this.ctx.store as unknown as Record<string, unknown>) &&
      '_dirs' in (this.ctx.store as unknown as Record<string, unknown>)
    );
  }

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }

  /* ── Read the full command queue ────────────────────────────── */

  getQueue(): CommandQueueEntry[] {
    if (!this.ctx.store.exists(this.ctx.commandQueue)) return [];
    try {
      if (this.isInMemoryStore() || !fs.existsSync(this.ctx.commandQueue)) {
        const raw = JSON.parse(this.ctx.cache.read(this.ctx.commandQueue));
        return (Array.isArray(raw) ? raw : raw ? [raw] : []) as CommandQueueEntry[];
      }

      const result = readQueueWithQuarantine<CommandQueueEntry>({
        queueName: 'command-queue',
        queuePath: this.ctx.commandQueue,
        validateQueue: schemas.validateCommandQueue,
        validateEntry: schemas.validateCommandEntryReadCompat,
        onQuarantine: (event) => {
          this._queueDegraded = true;
          this._queueDegradedReason = event.reason;
          structuredLog('error', 'command_queue_quarantined', {
            queue_path: event.queuePath,
            quarantine_path: event.quarantinePath,
            reason: event.reason,
            repaired_entries: event.repairedEntries,
          });
        },
      });
      return result.queue;
    } catch {
      return [];
    }
  }

  getQueueHealth(): { degraded: boolean; reason?: string } {
    return {
      degraded: this._queueDegraded,
      reason: this._queueDegradedReason,
    };
  }

  /* ── Get the latest (most recent) command ───────────────────── */

  getLatest(): CommandQueueEntry | null {
    const queue = this.getQueue();
    return queue.length ? queue[queue.length - 1] : null;
  }

  getCatalog(): CommandCatalogEntry[] {
    return getCommandCatalog();
  }

  /* ── Queue a new command ────────────────────────────────────── */

  async queue(input: QueueCommandInput, user = 'service'): Promise<QueueCommandResult> {
    const cmd = resolveKnownCommand(input.command) || input.command.trim().toUpperCase();
    if (!this.isValidCommand(cmd)) {
      throw new ServiceValidationError(`Unknown command: ${input.command}`);
    }

    // Validate optional fields
    if (input.description) {
      input.description = sanitizeMarkdown(sanitizeQID(input.description));
    }
    if (input.brief) {
      input.brief = sanitizeMarkdown(sanitizeQID(input.brief));
    }

    const warnings = detectSecrets([input.description, input.brief].filter(Boolean).join(' '));

    const entry: CommandQueueEntry = {
      command: cmd,
      project: input.project?.trim() || null,
      description: input.description?.trim() || null,
      scope: input.scope?.trim() || null,
      execution_mode: input.execution_mode || null,
      requested_at: models.isoNow(),
      status: 'PENDING',
      source: user,
    };

    // Save brief if provided
    if (input.brief) {
      await this.saveBrief(input.brief, entry);
    }

    // Build clipboard text
    entry.clipboard_text = this.buildClipboardText(entry);

    // Ensure session dir exists
    this.ctx.store.mkdirp(this.ctx.sessionDir);

    // Append to queue
    await this.appendToQueue(entry);

    const result: QueueCommandResult = {
      ok: true,
      clipboard_text: entry.clipboard_text,
      brief_saved: !!entry.brief_saved,
    };
    if (warnings.length) result.warnings = warnings;
    return result;
  }

  /* ── Validation ─────────────────────────────────────────────── */

  isValidCommand(cmd: string): boolean {
    return isKnownCommand(cmd);
  }

  /* ── Private helpers ────────────────────────────────────────── */

  private buildClipboardText(entry: CommandQueueEntry): string {
    let text = entry.command;
    if (entry.project) text += ' ' + entry.project;
    if (entry.description) text += ': ' + entry.description;
    if (entry.execution_mode) text += ` [${entry.execution_mode}]`;
    return text;
  }

  private async appendToQueue(entry: CommandQueueEntry): Promise<void> {
    await withFileLock(this.ctx.commandQueue, async () => {
      let queue = this.getQueue();
      queue.push(entry);
      if (queue.length > MAX_QUEUE_SIZE) queue = queue.slice(-MAX_QUEUE_SIZE);
      this.ctx.safeWrite(this.ctx.commandQueue, JSON.stringify(queue, null, 2));
    });
  }

  private async saveBrief(brief: string, entry: CommandQueueEntry): Promise<void> {
    if (!brief.trim()) return;
    const check = schemas.validateProjectBrief(brief);
    if (!check.valid) return;
    this.ctx.store.mkdirp(this.ctx.businessDocs);
    const briefPath = path.join(this.ctx.businessDocs, 'project-brief.md');
    await withFileLock(briefPath, async () => {
      const briefContent =
        `# Project Brief — ${entry.project || 'Untitled'}\n\n` +
        `> Auto-generated by Command Center on ${models.isoNow()}\n\n` +
        brief.trim() +
        '\n';
      this.ctx.safeWrite(briefPath, briefContent);
    });
    entry.brief_saved = true;
    entry.brief_path = 'BusinessDocs/project-brief.md';
  }
}
