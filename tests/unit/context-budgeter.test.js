'use strict';

/**
 * Context Budgeter — Unit Tests (I-A4-002)
 *
 * Covers:
 *   - rankItems: stable deterministic sorting
 *   - hardTruncate: byte-accurate truncation
 *   - budget: rank → truncate → drop pipeline
 *   - BudgetMetrics: originalBytes, budgetedBytes, dropped/truncated counts
 *   - assembleContext: markdown rendering
 */

const {
  rankItems,
  hardTruncate,
  budget,
  assembleContext,
  evaluateAgentBudget,
} = require('../../platform/engine/context-budgeter');

// ─── rankItems ────────────────────────────────────────────────

describe('rankItems', () => {
  it('sorts by relevanceScore descending', () => {
    const items = [
      { key: 'b', content: '', relevanceScore: 0.3 },
      { key: 'a', content: '', relevanceScore: 0.9 },
      { key: 'c', content: '', relevanceScore: 0.5 },
    ];
    const ranked = rankItems(items);
    expect(ranked.map((i) => i.key)).toEqual(['a', 'c', 'b']);
  });

  it('breaks ties deterministically by key (ascending)', () => {
    const items = [
      { key: 'zappa', content: '', relevanceScore: 0.5 },
      { key: 'alpha', content: '', relevanceScore: 0.5 },
      { key: 'beta', content: '', relevanceScore: 0.5 },
    ];
    const ranked = rankItems(items);
    expect(ranked.map((i) => i.key)).toEqual(['alpha', 'beta', 'zappa']);
  });

  it('clamps scores outside [0,1] for comparison', () => {
    const items = [
      { key: 'over', content: '', relevanceScore: 99 },
      { key: 'under', content: '', relevanceScore: -5 },
      { key: 'normal', content: '', relevanceScore: 0.5 },
    ];
    // All clamped scores: over=1, normal=0.5, under=0
    const ranked = rankItems(items);
    expect(ranked[0].key).toBe('over');
    expect(ranked[2].key).toBe('under');
  });

  it('does not mutate the input array', () => {
    const items = [
      { key: 'a', content: '', relevanceScore: 0.1 },
      { key: 'b', content: '', relevanceScore: 0.9 },
    ];
    const clone = [...items];
    rankItems(items);
    expect(items[0].key).toBe(clone[0].key);
  });

  it('uses freshness as a secondary ranking signal', () => {
    const items = [
      { key: 'older', content: '', relevanceScore: 0.8, freshnessScore: 0.1 },
      { key: 'fresher', content: '', relevanceScore: 0.8, freshnessScore: 0.9 },
    ];
    const ranked = rankItems(items);
    expect(ranked[0].key).toBe('fresher');
  });

  it('returns empty array for empty input', () => {
    expect(rankItems([])).toEqual([]);
  });
});

// ─── hardTruncate ─────────────────────────────────────────────

describe('hardTruncate', () => {
  it('does not truncate when content fits within maxBytes', () => {
    const s = 'hello';
    expect(hardTruncate(s, 100, '…')).toBe('hello');
  });

  it('truncates ASCII content at character boundary', () => {
    const result = hardTruncate('abcdefgh', 4, '[cut]');
    expect(result).toBe('abcd[cut]');
  });

  it('appends suffix after truncation', () => {
    const result = hardTruncate('12345', 3, '…');
    expect(result).toBe('123…');
  });

  it('handles empty string', () => {
    expect(hardTruncate('', 10, '[cut]')).toBe('');
  });

  it('truncates exactly at limit boundary', () => {
    // string of 5 bytes, limit = 5 → no truncation
    const result = hardTruncate('hello', 5, '[cut]');
    expect(result).toBe('hello');
  });
});

// ─── budget ───────────────────────────────────────────────────

describe('budget', () => {
  it('returns all items when total content fits within budget', () => {
    const items = [
      { key: 'a', content: 'short', relevanceScore: 0.8 },
      { key: 'b', content: 'also short', relevanceScore: 0.5 },
    ];
    const result = budget(items, { totalBudgetBytes: 10000 });
    expect(result.items).toHaveLength(2);
    expect(result.metrics.droppedCount).toBe(0);
    expect(result.metrics.truncatedCount).toBe(0);
  });

  it('drops low-ranked items when budget is exceeded', () => {
    // Create items where only one fits in a tiny budget
    const bigContent = 'x'.repeat(200);
    const items = [
      { key: 'high', content: bigContent, relevanceScore: 0.9 },
      { key: 'low', content: bigContent, relevanceScore: 0.1 },
    ];
    const result = budget(items, { totalBudgetBytes: 250, maxItemBytes: 250 });
    expect(result.items.some((i) => i.key === 'high')).toBe(true);
    expect(result.metrics.droppedCount).toBe(1);
  });

  it('respects maxItemBytes by truncating large items', () => {
    const items = [{ key: 'big', content: 'a'.repeat(1000), relevanceScore: 1.0 }];
    const result = budget(items, {
      maxItemBytes: 100,
      totalBudgetBytes: 200,
      truncationSuffix: '[cut]',
    });
    expect(result.items[0].truncated).toBe(true);
    expect(result.items[0].bytes).toBeLessThanOrEqual(100 + '[cut]'.length);
    expect(result.metrics.truncatedCount).toBe(1);
  });

  it('always keeps at least minItems (default 1)', () => {
    const items = [{ key: 'only', content: 'x'.repeat(500), relevanceScore: 1.0 }];
    // Budget is smaller than content, but minItems=1 forces truncation
    const result = budget(items, { totalBudgetBytes: 10, minItems: 1 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].truncated).toBe(true);
  });

  it('measures originalBytes vs budgetedBytes in metrics', () => {
    const items = [
      { key: 'a', content: 'hello world', relevanceScore: 0.5 },
      { key: 'b', content: 'foo bar', relevanceScore: 0.3 },
    ];
    const result = budget(items);
    expect(result.metrics.originalBytes).toBeGreaterThan(0);
    expect(result.metrics.budgetedBytes).toBeLessThanOrEqual(result.metrics.originalBytes);
  });

  it('returns items ordered by rank (highest relevance first)', () => {
    const items = [
      { key: 'low', content: 'low', relevanceScore: 0.1 },
      { key: 'high', content: 'high', relevanceScore: 0.9 },
      { key: 'mid', content: 'mid', relevanceScore: 0.5 },
    ];
    const result = budget(items);
    expect(result.items[0].key).toBe('high');
    expect(result.items[1].key).toBe('mid');
    expect(result.items[2].key).toBe('low');
  });

  it('handles empty input', () => {
    const result = budget([]);
    expect(result.items).toHaveLength(0);
    expect(result.metrics.inputCount).toBe(0);
    expect(result.metrics.droppedCount).toBe(0);
  });

  it('preserves tier and truncated=false when no truncation needed', () => {
    const items = [{ key: 'k', content: 'hi', relevanceScore: 0.5, tier: 'org' }];
    const result = budget(items);
    expect(result.items[0].tier).toBe('org');
    expect(result.items[0].truncated).toBe(false);
  });

  it('clamps relevanceScore to [0,1] in output', () => {
    const items = [{ key: 'k', content: 'text', relevanceScore: 1.5 }];
    const result = budget(items);
    expect(result.items[0].relevanceScore).toBe(1);
  });

  it('sets inputCount and outputCount correctly', () => {
    const items = [
      { key: 'a', content: 'x'.repeat(500), relevanceScore: 0.9 },
      { key: 'b', content: 'x'.repeat(500), relevanceScore: 0.5 },
      { key: 'c', content: 'x'.repeat(500), relevanceScore: 0.1 },
    ];
    const result = budget(items, { totalBudgetBytes: 600, maxItemBytes: 600 });
    expect(result.metrics.inputCount).toBe(3);
    expect(result.metrics.outputCount + result.metrics.droppedCount).toBe(3);
  });
});

// ─── assembleContext ──────────────────────────────────────────

describe('assembleContext', () => {
  it('produces a markdown-formatted context block', () => {
    const result = budget([
      { key: 'doc/a.md', content: 'some content', relevanceScore: 1.0 },
      { key: 'doc/b.md', content: 'more content', relevanceScore: 0.5 },
    ]);
    const assembled = assembleContext(result);
    expect(assembled).toContain('### doc/a.md');
    expect(assembled).toContain('some content');
    expect(assembled).toContain('---');
    expect(assembled).toContain('### doc/b.md');
  });

  it('returns empty string for empty budget result', () => {
    const result = budget([]);
    expect(assembleContext(result)).toBe('');
  });
});

describe('evaluateAgentBudget', () => {
  it('blocks invocations that exceed remaining cost budget', () => {
    const evaluation = evaluateAgentBudget(
      {
        tokenBudgetBytes: 1000,
        costUsdLimit: 5,
        consumedCostUsd: 1,
      },
      {
        requiredBytes: 200,
        estimatedCostUsd: 10,
      }
    );

    expect(evaluation.allowed).toBe(false);
    expect(evaluation.executionMode).toBe('blocked');
  });

  it('switches to fast-path mode when remaining token budget is tight', () => {
    const evaluation = evaluateAgentBudget(
      {
        tokenBudgetBytes: 1000,
        consumedBytes: 600,
      },
      {
        requiredBytes: 200,
      }
    );

    expect(evaluation.allowed).toBe(true);
    expect(evaluation.executionMode).toBe('fast-path');
  });
});
