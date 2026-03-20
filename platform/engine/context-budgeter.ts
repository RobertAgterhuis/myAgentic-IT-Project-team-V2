// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Context Budgeter — Rank, Summarize, and Truncate Pipeline (I-A4-002)
 *
 * Before an agent invocation the full set of candidate context items
 * (predecessor outputs, memory entries, decisions, docs) can easily exceed
 * a practical token/byte budget.  This module applies a deterministic
 * three-stage pipeline:
 *
 *   1. Rank    — stable sort by relevanceScore DESC, then key ASC.
 *   2. Summarize — optionally prepend a one-line summary header per item.
 *   3. Truncate  — items that overflow the per-item or total budget are
 *                  hard-truncated with an ellipsis marker.
 *
 * The output carries byte-level metrics so callers can verify that
 * invocation payload size is measured and controlled.
 *
 * Acceptance criteria (I-A4-002):
 *   - Rank order is stable and deterministic.
 *   - Total output bytes ≤ budget.
 *   - Metrics expose original size, budgeted size, dropped/truncated counts.
 *
 * @module engine/context-budgeter
 */

import type { MemoryTier } from './semantic-memory';
import { byteLength } from './semantic-memory';

// ─── Input types ──────────────────────────────────────────────

/**
 * A candidate context item to budget.
 * Callers compose these from predecessor outputs, memory reads, etc.
 */
export interface ContextItem {
  /** Unique identifier (filepath, memory key, decision ID, …). */
  key: string;
  /** Full text content. */
  content: string;
  /**
   * Relevance score in [0, 1].  Higher = more important, injected first.
   * Scores outside [0, 1] are clamped.
   */
  relevanceScore: number;
  /** The memory tier this item originated from (informational). */
  tier?: MemoryTier | 'predecessor' | 'questionnaire' | 'decision' | 'doc';
}

// ─── Output types ─────────────────────────────────────────────

/** A budgeted item as it will appear in the invocation context. */
export interface BudgetedItem {
  key: string;
  content: string;
  relevanceScore: number;
  tier?: ContextItem['tier'];
  /** True if the content was truncated to fit the budget. */
  truncated: boolean;
  /** Byte length of the final content. */
  bytes: number;
}

/** Metrics for the budgeting operation. */
export interface BudgetMetrics {
  /** Byte sum of all input items before budgeting. */
  originalBytes: number;
  /** Byte sum of all output items after budgeting. */
  budgetedBytes: number;
  /** Number of items that were completely dropped. */
  droppedCount: number;
  /** Number of items whose content was truncated (but kept). */
  truncatedCount: number;
  /** Number of input items. */
  inputCount: number;
  /** Number of output items (excluding dropped). */
  outputCount: number;
}

/** Result returned by `budget()`. */
export interface BudgetResult {
  /** Ordered, budgeted items ready for context injection. */
  items: BudgetedItem[];
  metrics: BudgetMetrics;
}

// ─── Options ──────────────────────────────────────────────────

export interface BudgetOptions {
  /**
   * Total byte budget for all items combined.
   * Default: 128 KiB (131_072 bytes).
   */
  totalBudgetBytes?: number;
  /**
   * Maximum bytes allowed for a single item's content.
   * Items exceeding this are truncated (not dropped).
   * Default: 16 KiB (16_384 bytes).
   */
  maxItemBytes?: number;
  /**
   * Minimum items to keep regardless of budget (guarantees at least
   * this many items survive truncation/drop).  Default: 1.
   */
  minItems?: number;
  /**
   * Suffix appended when content is truncated.
   * Default: "\n… [truncated]"
   */
  truncationSuffix?: string;
}

const DEFAULTS: Required<BudgetOptions> = {
  totalBudgetBytes: 128 * 1024, // 128 KiB
  maxItemBytes: 16 * 1024, // 16 KiB
  minItems: 1,
  truncationSuffix: '\n… [truncated]',
};

// ─── Rank ─────────────────────────────────────────────────────

/**
 * Stable-sort context items by relevanceScore DESC, then key ASC.
 * Relevance scores are clamped to [0, 1] before comparison.
 *
 * Determinism guarantee: two items with equal scores are ordered
 * lexicographically by `key`, ensuring the same input always produces
 * the same output regardless of runtime Array.sort stability.
 */
export function rankItems(items: ContextItem[]): ContextItem[] {
  return [...items].sort((a, b) => {
    const sa = Math.max(0, Math.min(1, a.relevanceScore));
    const sb = Math.max(0, Math.min(1, b.relevanceScore));
    if (sb !== sa) return sb - sa; // higher score first
    return a.key.localeCompare(b.key); // tie-break by key
  });
}

// ─── Truncate single item ─────────────────────────────────────

/**
 * Hard-truncate a string to `maxBytes` UTF-8 bytes, appending `suffix`.
 * The suffix itself is not counted against the byte limit.
 */
export function hardTruncate(content: string, maxBytes: number, suffix: string): string {
  if (byteLength(content) <= maxBytes) return content;
  // Walk characters until we hit the byte limit, no mid-surrogate splits
  let n = 0;
  let i = 0;
  while (i < content.length && n < maxBytes) {
    const c = content.charCodeAt(i);
    const charBytes = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0xd800 || c >= 0xe000 ? 3 : (i++, 4);
    if (n + charBytes > maxBytes) break;
    n += charBytes;
    i++;
  }
  return content.slice(0, i) + suffix;
}

// ─── Budget pipeline ──────────────────────────────────────────

/**
 * Apply the rank → truncate pipeline to a set of context items.
 *
 * The pipeline proceeds as follows:
 *   1. Clamp and rank items (highest relevance first).
 *   2. For each item in rank order:
 *      a. Apply per-item byte cap (truncate to maxItemBytes if exceeded).
 *      b. If adding the item would exceed the remaining total budget:
 *         - If at least `minItems` items are already included, drop the item.
 *         - Otherwise, truncate the item to the remaining budget and include it.
 *   3. Return budgeted items with metrics.
 *
 * @param items   - Candidate context items
 * @param options - Budget configuration
 */
export function budget(items: ContextItem[], options: BudgetOptions = {}): BudgetResult {
  const opts: Required<BudgetOptions> = { ...DEFAULTS, ...options };
  const suffix = opts.truncationSuffix;

  const ranked = rankItems(items);

  const originalBytes = items.reduce((s, it) => s + byteLength(it.content), 0);

  const output: BudgetedItem[] = [];
  let remaining = opts.totalBudgetBytes;
  let droppedCount = 0;
  let truncatedCount = 0;

  for (const item of ranked) {
    let content = item.content;
    let wasTruncated = false;

    // Stage: per-item cap
    if (byteLength(content) > opts.maxItemBytes) {
      content = hardTruncate(content, opts.maxItemBytes, suffix);
      wasTruncated = true;
    }

    const itemBytes = byteLength(content);

    // Stage: total budget gate
    if (itemBytes > remaining) {
      if (output.length >= opts.minItems) {
        // Drop item — budget is exhausted and minimum already met
        droppedCount++;
        continue;
      }
      // Must include at least minItems — truncate to remaining
      content = hardTruncate(content, remaining, suffix);
      wasTruncated = true;
    }

    if (wasTruncated) truncatedCount++;

    const finalBytes = byteLength(content);
    remaining -= finalBytes;

    output.push({
      key: item.key,
      content,
      relevanceScore: Math.max(0, Math.min(1, item.relevanceScore)),
      tier: item.tier,
      truncated: wasTruncated,
      bytes: finalBytes,
    });
  }

  const budgetedBytes = output.reduce((s, it) => s + it.bytes, 0);

  return {
    items: output,
    metrics: {
      originalBytes,
      budgetedBytes,
      droppedCount,
      truncatedCount,
      inputCount: items.length,
      outputCount: output.length,
    },
  };
}

// ─── Context assembly helper ──────────────────────────────────

/**
 * Flatten a BudgetResult into a single string suitable for injection
 * into an agent prompt.  Each item is separated by a `---` rule and
 * prefixed with its key as a Markdown heading.
 *
 * @param result - Output from `budget()`
 * @returns Assembled context block string
 */
export function assembleContext(result: BudgetResult): string {
  return result.items.map((item) => `### ${item.key}\n\n${item.content}`).join('\n\n---\n\n');
}
