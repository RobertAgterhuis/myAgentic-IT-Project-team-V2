/**
 * Memory Namespace — Unit Tests (C2.3)
 *
 * Covers:
 *   C2.3 — Tenant-aware namespace isolation for durable writes:
 *     - Workspace/project context required for durable (project/org) writes.
 *     - Run tier passes through without context.
 *     - NamespaceIsolationError thrown when context missing or invalid.
 *     - Cross-tenant leakage prevention: separate namespaces per tenant.
 *     - Key validation and segment safety.
 */

import * as __req_0 from '../../platform/engine/memory-namespace';
const { MemoryNamespace, NamespaceIsolationError, isDurableTier } = __req_0;

// ─── isDurableTier ────────────────────────────────────────────

describe('isDurableTier', () => {
  it('returns true for project tier', () => {
    expect(isDurableTier('project')).toBe(true);
  });

  it('returns true for org tier', () => {
    expect(isDurableTier('org')).toBe(true);
  });

  it('returns false for run tier', () => {
    expect(isDurableTier('run')).toBe(false);
  });
});

// ─── MemoryNamespace.resolveKey — run tier ────────────────────

describe('MemoryNamespace.resolveKey — run tier (C2.3)', () => {
  const ns = new MemoryNamespace();

  it('returns key unchanged for run tier without context', () => {
    expect(ns.resolveKey('run', 'ephemeral-hint')).toBe('ephemeral-hint');
  });

  it('returns key unchanged for run tier even with context provided', () => {
    expect(ns.resolveKey('run', 'hint', { workspaceId: 'ws-1', projectId: 'proj-a' })).toBe('hint');
  });
});

// ─── MemoryNamespace.resolveKey — durable tiers ───────────────

describe('MemoryNamespace.resolveKey — durable tiers (C2.3)', () => {
  const ns = new MemoryNamespace();
  const ctx = { workspaceId: 'ws-acme', projectId: 'proj-alpha' };

  it('prefixes project tier key with workspaceId/projectId', () => {
    expect(ns.resolveKey('project', 'sprint-verdict', ctx)).toBe(
      'ws-acme/proj-alpha/sprint-verdict'
    );
  });

  it('prefixes org tier key with workspaceId/projectId', () => {
    expect(ns.resolveKey('org', 'brand-guide', ctx)).toBe('ws-acme/proj-alpha/brand-guide');
  });

  it('throws NamespaceIsolationError for project tier without context', () => {
    expect(() => ns.resolveKey('project', 'any-key')).toThrow(NamespaceIsolationError);
    expect(() => ns.resolveKey('project', 'any-key')).toThrow(/project/i);
  });

  it('throws NamespaceIsolationError for org tier without context', () => {
    expect(() => ns.resolveKey('org', 'any-key')).toThrow(NamespaceIsolationError);
    expect(() => ns.resolveKey('org', 'any-key')).toThrow(/org/i);
  });
});

// ─── C2.3: Cross-tenant isolation ────────────────────────────

describe('MemoryNamespace — cross-tenant isolation (C2.3)', () => {
  const ns = new MemoryNamespace();

  it('two tenants resolve different namespaced keys for the same logical key', () => {
    const tenantA = { workspaceId: 'ws-a', projectId: 'project-1' };
    const tenantB = { workspaceId: 'ws-b', projectId: 'project-2' };
    const keyA = ns.resolveKey('project', 'sprint-result', tenantA);
    const keyB = ns.resolveKey('project', 'sprint-result', tenantB);
    expect(keyA).not.toBe(keyB);
  });

  it('same workspace but different projects resolve different keys', () => {
    const ctxA = { workspaceId: 'shared-ws', projectId: 'proj-a' };
    const ctxB = { workspaceId: 'shared-ws', projectId: 'proj-b' };
    expect(ns.resolveKey('org', 'brand-guide', ctxA)).not.toBe(
      ns.resolveKey('org', 'brand-guide', ctxB)
    );
  });

  it('resolved key for tenant A does not collide with tenant B prefix', () => {
    const ctxA = { workspaceId: 'ws-x', projectId: 'p1' };
    const ctxB = { workspaceId: 'ws-y', projectId: 'p1' };
    const keyA = ns.resolveKey('project', 'result', ctxA);
    const keyB = ns.resolveKey('project', 'result', ctxB);
    // Neither key starts with the other's prefix
    expect(keyA.startsWith('ws-y/')).toBe(false);
    expect(keyB.startsWith('ws-x/')).toBe(false);
  });
});

// ─── MemoryNamespace.validateDurableWrite ────────────────────

describe('MemoryNamespace.validateDurableWrite (C2.3)', () => {
  const ns = new MemoryNamespace();

  it('passes for run tier without context', () => {
    expect(() => ns.validateDurableWrite('run')).not.toThrow();
  });

  it('passes for run tier with context', () => {
    expect(() =>
      ns.validateDurableWrite('run', { workspaceId: 'ws', projectId: 'p' })
    ).not.toThrow();
  });

  it('throws for project tier without context', () => {
    expect(() => ns.validateDurableWrite('project')).toThrow(NamespaceIsolationError);
  });

  it('throws for org tier without context', () => {
    expect(() => ns.validateDurableWrite('org')).toThrow(NamespaceIsolationError);
  });

  it('passes for project tier with valid context', () => {
    expect(() =>
      ns.validateDurableWrite('project', { workspaceId: 'ws-1', projectId: 'proj-a' })
    ).not.toThrow();
  });

  it('passes for org tier with valid context', () => {
    expect(() =>
      ns.validateDurableWrite('org', { workspaceId: 'ws-1', projectId: 'proj-a' })
    ).not.toThrow();
  });
});

// ─── Segment validation ───────────────────────────────────────

describe('MemoryNamespace — segment validation (C2.3)', () => {
  const ns = new MemoryNamespace();

  it('throws when workspaceId is empty string', () => {
    expect(() => ns.resolveKey('project', 'key', { workspaceId: '', projectId: 'proj' })).toThrow(
      NamespaceIsolationError
    );
  });

  it('throws when projectId is empty string', () => {
    expect(() => ns.resolveKey('org', 'key', { workspaceId: 'ws', projectId: '' })).toThrow(
      NamespaceIsolationError
    );
  });

  it('throws when workspaceId contains path traversal characters', () => {
    expect(() =>
      ns.resolveKey('project', 'key', { workspaceId: '../etc', projectId: 'proj' })
    ).toThrow(NamespaceIsolationError);
  });

  it('throws when projectId contains slash', () => {
    expect(() =>
      ns.resolveKey('project', 'key', { workspaceId: 'ws', projectId: 'proj/sub' })
    ).toThrow(NamespaceIsolationError);
  });

  it('accepts alphanumeric IDs with hyphens, underscores and dots', () => {
    expect(() =>
      ns.resolveKey('project', 'my-key', {
        workspaceId: 'ws.acme-corp_1',
        projectId: 'proj.alpha_2',
      })
    ).not.toThrow();
  });

  it('throws when key is empty', () => {
    expect(() => ns.resolveKey('project', '', { workspaceId: 'ws', projectId: 'proj' })).toThrow(
      NamespaceIsolationError
    );
  });

  it('NamespaceIsolationError has correct name', () => {
    try {
      ns.resolveKey('project', 'key');
    } catch (err) {
      expect(err.name).toBe('NamespaceIsolationError');
    }
  });
});
