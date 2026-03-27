// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Memory Access Policy — Classification, Integrity and Access Control (C2.1 / C2.2)
 *
 * Separates decision-critical memory from advisory retrieval memory and enforces
 * per-class access control for agents and tools.
 *
 * Memory classes:
 *   decision-critical — Affects gate verdicts, state transitions, or policy outcomes.
 *                       Writes require explicit agent authorization.
 *                       Unauthorized read/write is blocked and audited.
 *                       Failures are hard-blocking (throw on violation).
 *
 *   advisory          — Retrieval context, hints, and non-binding recommendations.
 *                       Access is always permitted. Failures are non-blocking.
 *                       No authorization gate required.
 *
 * Acceptance criteria:
 *   C2.1 — Decision-critical memory has integrity and audit constraints.
 *           Advisory memory is explicitly non-blocking.
 *   C2.2 — Agent/tool access evaluated per memory class.
 *           Unauthorized read/write is blocked and audited.
 *
 * @module engine/memory-access-policy
 */

import type { MemoryTier } from './semantic-memory.js';

// ─── Memory class definitions ─────────────────────────────────

/** The two memory classes. */
export type MemoryClass = 'decision-critical' | 'advisory';

/** Operations that can be requested on memory. */
export type MemoryOperation = 'read' | 'write';

/**
 * Policy contract associated with a memory class.
 * Defines integrity guarantees and audit requirements.
 */
export interface MemoryClassPolicy {
  /**
   * When true, unauthorized access throws MemoryAccessDeniedError (blocking).
   * When false, unauthorized access is silently allowed (non-blocking).
   */
  blocking: boolean;
  /** When true, all access attempts (allowed and denied) produce an audit entry. */
  auditRequired: boolean;
  /** Human-readable integrity constraints for this class. */
  integrityConstraints: string[];
}

/**
 * Policy definitions per memory class.
 *
 * C2.1 acceptance: decision-critical is blocking + auditRequired;
 *                  advisory is non-blocking.
 */
export const MEMORY_CLASS_POLICY: Record<MemoryClass, MemoryClassPolicy> = {
  'decision-critical': {
    blocking: true,
    auditRequired: true,
    integrityConstraints: [
      'Write requires explicit agent role authorization.',
      'Unauthorized reads must be blocked and audited.',
      'Unauthorized writes must be blocked and audited.',
      'All access events are persisted in the audit log.',
    ],
  },
  advisory: {
    blocking: false,
    auditRequired: false,
    integrityConstraints: [
      'Non-blocking: access failures do not halt execution.',
      'No authorization gate required for read or write.',
    ],
  },
};

// ─── Access rule definition ───────────────────────────────────

/**
 * A single access authorization rule.
 * An agent ID matches if it equals the pattern string or matches the regexp.
 */
export interface AccessRule {
  /** Agent identifier or pattern to match. Use '*' for wildcard match. */
  agentPattern: string | RegExp;
  /** Which operations this rule permits. */
  allowedOperations: MemoryOperation[];
  /** Which memory classes this rule applies to. */
  memoryClasses: MemoryClass[];
}

// ─── Audit event ──────────────────────────────────────────────

/** A single audit record produced by an access evaluation. */
export interface MemoryAccessEvent {
  /** Monotonic event identifier: `{timestamp}-{counter}`. */
  id: string;
  /** Unix epoch ms when the event was recorded. */
  timestamp: number;
  /** Identifier of the requesting agent or tool. */
  agentId: string;
  /** Requested operation. */
  operation: MemoryOperation;
  /** Memory class of the target entry. */
  memoryClass: MemoryClass;
  /** Tier on which the operation was attempted. */
  tier: MemoryTier;
  /** Optional target key for the operation. */
  key?: string;
  /** Whether the access was granted. */
  allowed: boolean;
  /** Human-readable reason for the outcome. */
  reason: string;
}

// ─── Evaluation result ────────────────────────────────────────

/** Result of a single access evaluation. */
export interface AccessEvaluation {
  /** True when access is permitted. */
  allowed: boolean;
  /**
   * True when access was denied and the policy is blocking.
   * When blocked=true the caller should throw MemoryAccessDeniedError.
   */
  blocked: boolean;
  /** Audit entry produced by this evaluation (null for advisory non-audit). */
  auditEntry: MemoryAccessEvent | null;
}

// ─── Error ────────────────────────────────────────────────────

/** Thrown when a blocking policy denies access to decision-critical memory. */
export class MemoryAccessDeniedError extends Error {
  constructor(
    public readonly agentId: string,
    public readonly operation: MemoryOperation,
    public readonly memoryClass: MemoryClass,
    public readonly tier: MemoryTier,
    public readonly key?: string
  ) {
    super(
      `Memory access denied: agent "${agentId}" attempted ${operation} on ${memoryClass} ` +
        `memory (tier="${tier}"${key ? `, key="${key}"` : ''}). ` +
        'Agent is not authorized for this memory class and operation.'
    );
    this.name = 'MemoryAccessDeniedError';
  }
}

// ─── Policy engine ────────────────────────────────────────────

let _eventCounter = 0;

function nextEventId(now: number): string {
  _eventCounter += 1;
  return `${now}-${_eventCounter}`;
}

/**
 * MemoryAccessPolicy — evaluates agent access per memory class.
 *
 * Usage:
 *   const policy = new MemoryAccessPolicy([
 *     { agentPattern: 'agent-05', allowedOperations: ['read', 'write'],
 *       memoryClasses: ['decision-critical'] },
 *   ]);
 *
 *   const result = policy.evaluate({
 *     agentId: 'agent-05',
 *     operation: 'write',
 *     memoryClass: 'decision-critical',
 *     tier: 'project',
 *     key: 'sprint-verdict',
 *   });
 *
 *   if (result.blocked) throw new MemoryAccessDeniedError(...);
 */
export class MemoryAccessPolicy {
  private _rules: AccessRule[];
  private _auditLog: MemoryAccessEvent[];

  constructor(rules: AccessRule[] = []) {
    this._rules = rules.slice();
    this._auditLog = [];
  }

  /**
   * Evaluate whether an agent is authorized to perform an operation on
   * a memory entry of a given class.
   *
   * Decision logic:
   *   - advisory class → always allowed, no audit entry (unless overridden by rule).
   *   - decision-critical class → allowed only if a matching rule grants it;
   *     otherwise blocked and audited.
   *
   * @param params.agentId      - Identifier of the requesting agent/tool.
   * @param params.operation    - 'read' or 'write'.
   * @param params.memoryClass  - 'decision-critical' or 'advisory'.
   * @param params.tier         - Memory tier ('run', 'project', 'org').
   * @param params.key          - Optional key being accessed.
   * @param params.now          - Optional timestamp override (ms).
   */
  evaluate(params: {
    agentId: string;
    operation: MemoryOperation;
    memoryClass: MemoryClass;
    tier: MemoryTier;
    key?: string;
    now?: number;
  }): AccessEvaluation {
    const { agentId, operation, memoryClass, tier, key, now = Date.now() } = params;
    const classPolicy = MEMORY_CLASS_POLICY[memoryClass];

    // Advisory: always allowed, no audit unless explicitly configured
    if (memoryClass === 'advisory') {
      return { allowed: true, blocked: false, auditEntry: null };
    }

    // decision-critical: check rules
    const authorized = this._isAuthorized(agentId, operation, memoryClass);

    const auditEntry: MemoryAccessEvent = {
      id: nextEventId(now),
      timestamp: now,
      agentId,
      operation,
      memoryClass,
      tier,
      ...(key !== undefined ? { key } : {}),
      allowed: authorized,
      reason: authorized
        ? `Agent "${agentId}" is authorized for ${operation} on ${memoryClass} memory.`
        : `Agent "${agentId}" is NOT authorized for ${operation} on ${memoryClass} memory. ` +
          'No matching access rule found.',
    };

    if (classPolicy.auditRequired) {
      this._auditLog.push(auditEntry);
    }

    if (!authorized) {
      return { allowed: false, blocked: classPolicy.blocking, auditEntry };
    }

    return { allowed: true, blocked: false, auditEntry };
  }

  /**
   * Convenience: evaluate and automatically throw MemoryAccessDeniedError
   * when the result is blocked. Returns the audit entry (or null).
   */
  enforceAccess(params: Parameters<MemoryAccessPolicy['evaluate']>[0]): MemoryAccessEvent | null {
    const result = this.evaluate(params);
    if (result.blocked) {
      throw new MemoryAccessDeniedError(
        params.agentId,
        params.operation,
        params.memoryClass,
        params.tier,
        params.key
      );
    }
    return result.auditEntry;
  }

  /** Return a copy of all audit events recorded so far. */
  getAuditLog(): MemoryAccessEvent[] {
    return this._auditLog.slice();
  }

  /** Clear all recorded audit events. Useful for test isolation. */
  clearAuditLog(): void {
    this._auditLog = [];
  }

  /** Add a new access rule at runtime. */
  addRule(rule: AccessRule): void {
    this._rules.push(rule);
  }

  // ── Private ──────────────────────────────────────────────────

  private _isAuthorized(
    agentId: string,
    operation: MemoryOperation,
    memoryClass: MemoryClass
  ): boolean {
    for (const rule of this._rules) {
      if (!this._matchesClass(rule, memoryClass)) continue;
      if (!rule.allowedOperations.includes(operation)) continue;
      if (this._matchesAgent(rule.agentPattern, agentId)) return true;
    }
    return false;
  }

  private _matchesAgent(pattern: string | RegExp, agentId: string): boolean {
    if (pattern instanceof RegExp) return pattern.test(agentId);
    if (pattern === '*') return true;
    return pattern === agentId;
  }

  private _matchesClass(rule: AccessRule, memoryClass: MemoryClass): boolean {
    return rule.memoryClasses.includes(memoryClass);
  }
}
