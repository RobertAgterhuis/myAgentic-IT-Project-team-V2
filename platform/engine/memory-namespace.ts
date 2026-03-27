// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Memory Namespace — Tenant-Aware Namespace Isolation for Durable Writes (C2.3)
 *
 * Enforces that all writes to durable memory tiers (project / org) carry an
 * explicit TenantContext. Transparent (run-tier) writes are passed through
 * unchanged.
 *
 * Namespace key format for durable tiers:
 *   {workspaceId}/{projectId}/{key}
 *
 * This ensures entries written by one tenant cannot be read from a different
 * tenant's namespace, providing cross-tenant isolation without a separate DB.
 *
 * Acceptance criteria (C2.3):
 *   - Workspace and project context required for durable writes.
 *   - Cross-tenant leakage tests pass.
 *
 * @module engine/memory-namespace
 */

import type { MemoryTier } from './semantic-memory.js';

// ─── Tenant context ───────────────────────────────────────────

/**
 * Identifies the tenant (workspace + project) for a durable memory operation.
 * Required for all writes to `project` and `org` tiers.
 */
export interface TenantContext {
  /** Workspace identifier (e.g. repository slug or org/repo). Must be non-empty. */
  workspaceId: string;
  /** Project identifier within the workspace. Must be non-empty. */
  projectId: string;
}

// ─── Durable tier helpers ────────────────────────────────────

/** The memory tiers that require tenant-aware namespace isolation. */
export type DurableTier = 'project' | 'org';

/**
 * Returns true when `tier` is a durable tier that requires TenantContext.
 */
export function isDurableTier(tier: MemoryTier): tier is DurableTier {
  return tier === 'project' || tier === 'org';
}

// ─── Error ────────────────────────────────────────────────────

/**
 * Thrown when a durable write is attempted without a valid TenantContext,
 * or when context fields are empty/invalid.
 */
export class NamespaceIsolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NamespaceIsolationError';
  }
}

// ─── Validation helpers ───────────────────────────────────────

/** Allowed characters in workspaceId and projectId segments. */
const SAFE_SEGMENT_RE = /^[A-Za-z0-9_.-]+$/;

/**
 * Validate that a TenantContext segment is non-empty and contains only safe
 * characters (alphanumerics, hyphen, underscore, dot) to prevent path traversal.
 */
function validateSegment(value: string, fieldName: string): void {
  if (!value || typeof value !== 'string') {
    throw new NamespaceIsolationError(
      `TenantContext.${fieldName} must be a non-empty string. Received: ${JSON.stringify(value)}`
    );
  }
  if (!SAFE_SEGMENT_RE.test(value)) {
    throw new NamespaceIsolationError(
      `TenantContext.${fieldName} contains invalid characters. ` +
        `Only alphanumerics, hyphens, underscores and dots are allowed. ` +
        `Received: "${value}"`
    );
  }
}

// ─── MemoryNamespace class ────────────────────────────────────

/**
 * MemoryNamespace enforces tenant-scoped key prefixing for durable tiers.
 *
 * Usage:
 *   const ns = new MemoryNamespace();
 *   const key = ns.resolveKey('project', 'sprint-verdict', { workspaceId: 'ws-1', projectId: 'proj-a' });
 *   // → 'ws-1/proj-a/sprint-verdict'
 *
 *   ns.resolveKey('run', 'ephemeral-key'); // → 'ephemeral-key' (passthrough)
 */
export class MemoryNamespace {
  /**
   * Resolve the namespaced storage key for a memory tier.
   *
   * - For `run` tier: returns `key` unchanged (no tenant isolation needed).
   * - For `project` / `org` tiers: requires `ctx` and returns `{workspaceId}/{projectId}/{key}`.
   *
   * @param tier - Memory tier.
   * @param key  - Logical entry key (must not be empty).
   * @param ctx  - Tenant context. Required for durable tiers.
   * @throws {NamespaceIsolationError} When ctx is missing or invalid for durable tiers.
   */
  resolveKey(tier: MemoryTier, key: string, ctx?: TenantContext): string {
    if (!key || typeof key !== 'string') {
      throw new NamespaceIsolationError(
        `Memory key must be a non-empty string. Received: ${JSON.stringify(key)}`
      );
    }

    if (!isDurableTier(tier)) {
      // run tier: no namespace prefix, no context required
      return key;
    }

    this._requireContext(tier, ctx);
    validateSegment(ctx!.workspaceId, 'workspaceId');
    validateSegment(ctx!.projectId, 'projectId');

    return `${ctx!.workspaceId}/${ctx!.projectId}/${key}`;
  }

  /**
   * Validate that a durable write has a sufficient TenantContext.
   * No-op for ephemeral (run) tier.
   *
   * @param tier - Memory tier.
   * @param ctx  - Tenant context. Required for durable tiers.
   * @throws {NamespaceIsolationError} When ctx is missing or invalid for durable tiers.
   */
  validateDurableWrite(tier: MemoryTier, ctx?: TenantContext): void {
    if (!isDurableTier(tier)) return;
    this._requireContext(tier, ctx);
    validateSegment(ctx!.workspaceId, 'workspaceId');
    validateSegment(ctx!.projectId, 'projectId');
  }

  // ── Private ───────────────────────────────────────────────────

  private _requireContext(tier: MemoryTier, ctx?: TenantContext): void {
    if (!ctx || typeof ctx !== 'object') {
      throw new NamespaceIsolationError(
        `Durable write to "${tier}" tier requires a TenantContext ` +
          '({ workspaceId, projectId }). No context was provided.'
      );
    }
  }
}
