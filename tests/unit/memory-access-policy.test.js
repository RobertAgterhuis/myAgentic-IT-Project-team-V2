'use strict';

/**
 * Memory Access Policy — Unit Tests (C2.1 / C2.2)
 *
 * Covers:
 *   C2.1 — MEMORY_CLASS_POLICY contract: decision-critical is blocking +
 *           audit-required; advisory is non-blocking.
 *   C2.2 — MemoryAccessPolicy engine: authorized access allowed, unauthorized
 *           access blocked and audited; advisory always permitted.
 */

const {
  MEMORY_CLASS_POLICY,
  MemoryAccessPolicy,
  MemoryAccessDeniedError,
} = require('../../platform/engine/memory-access-policy');

// ─── C2.1: MEMORY_CLASS_POLICY contract ──────────────────────

describe('MEMORY_CLASS_POLICY — C2.1 contract', () => {
  it('decision-critical policy is blocking', () => {
    expect(MEMORY_CLASS_POLICY['decision-critical'].blocking).toBe(true);
  });

  it('decision-critical policy requires audit', () => {
    expect(MEMORY_CLASS_POLICY['decision-critical'].auditRequired).toBe(true);
  });

  it('decision-critical has at least one integrity constraint', () => {
    expect(MEMORY_CLASS_POLICY['decision-critical'].integrityConstraints.length).toBeGreaterThan(0);
  });

  it('advisory policy is non-blocking', () => {
    expect(MEMORY_CLASS_POLICY['advisory'].blocking).toBe(false);
  });

  it('advisory policy does not require audit', () => {
    expect(MEMORY_CLASS_POLICY['advisory'].auditRequired).toBe(false);
  });

  it('advisory has integrity constraints listing non-blocking guarantee', () => {
    const text = MEMORY_CLASS_POLICY['advisory'].integrityConstraints.join(' ');
    expect(text.toLowerCase()).toMatch(/non-blocking/);
  });
});

// ─── C2.2: MemoryAccessPolicy — authorized access ────────────

describe('MemoryAccessPolicy — authorized access (C2.2)', () => {
  function buildPolicy(agentId, operations, classes) {
    return new MemoryAccessPolicy([
      { agentPattern: agentId, allowedOperations: operations, memoryClasses: classes },
    ]);
  }

  it('allows read on decision-critical for authorized agent', () => {
    const policy = buildPolicy('agent-05', ['read'], ['decision-critical']);
    const result = policy.evaluate({
      agentId: 'agent-05',
      operation: 'read',
      memoryClass: 'decision-critical',
      tier: 'project',
    });
    expect(result.allowed).toBe(true);
    expect(result.blocked).toBe(false);
  });

  it('allows write on decision-critical for authorized agent', () => {
    const policy = buildPolicy('agent-06', ['read', 'write'], ['decision-critical']);
    const result = policy.evaluate({
      agentId: 'agent-06',
      operation: 'write',
      memoryClass: 'decision-critical',
      tier: 'org',
      key: 'sprint-verdict',
    });
    expect(result.allowed).toBe(true);
    expect(result.blocked).toBe(false);
  });

  it('produces audit entry for authorized decision-critical access', () => {
    const policy = buildPolicy('agent-05', ['write'], ['decision-critical']);
    const result = policy.evaluate({
      agentId: 'agent-05',
      operation: 'write',
      memoryClass: 'decision-critical',
      tier: 'org',
      key: 'k',
      now: 1000,
    });
    expect(result.auditEntry).not.toBeNull();
    expect(result.auditEntry.agentId).toBe('agent-05');
    expect(result.auditEntry.allowed).toBe(true);
    expect(result.auditEntry.tier).toBe('org');
    expect(result.auditEntry.key).toBe('k');
  });

  it('wildcard agent pattern grants access to all agents', () => {
    const policy = buildPolicy('*', ['read', 'write'], ['decision-critical']);
    const result = policy.evaluate({
      agentId: 'any-agent-999',
      operation: 'write',
      memoryClass: 'decision-critical',
      tier: 'project',
    });
    expect(result.allowed).toBe(true);
  });

  it('regexp agent pattern matches matching agents', () => {
    const policy = new MemoryAccessPolicy([
      {
        agentPattern: /^orchestrator-/,
        allowedOperations: ['write'],
        memoryClasses: ['decision-critical'],
      },
    ]);
    const allowed = policy.evaluate({
      agentId: 'orchestrator-00',
      operation: 'write',
      memoryClass: 'decision-critical',
      tier: 'project',
    });
    const denied = policy.evaluate({
      agentId: 'unknown-agent',
      operation: 'write',
      memoryClass: 'decision-critical',
      tier: 'project',
    });
    expect(allowed.allowed).toBe(true);
    expect(denied.allowed).toBe(false);
  });
});

// ─── C2.2: MemoryAccessPolicy — unauthorized access blocked ──

describe('MemoryAccessPolicy — unauthorized access blocked (C2.2)', () => {
  it('blocks read on decision-critical for unauthorized agent', () => {
    const policy = new MemoryAccessPolicy([]); // no rules
    const result = policy.evaluate({
      agentId: 'rogue-agent',
      operation: 'read',
      memoryClass: 'decision-critical',
      tier: 'project',
    });
    expect(result.allowed).toBe(false);
    expect(result.blocked).toBe(true);
  });

  it('blocks write on decision-critical for unauthorized agent', () => {
    const policy = new MemoryAccessPolicy([]);
    const result = policy.evaluate({
      agentId: 'rogue-agent',
      operation: 'write',
      memoryClass: 'decision-critical',
      tier: 'org',
      key: 'gate-result',
    });
    expect(result.allowed).toBe(false);
    expect(result.blocked).toBe(true);
  });

  it('records audit entry for blocked decision-critical access', () => {
    const policy = new MemoryAccessPolicy([]);
    policy.evaluate({
      agentId: 'rogue-agent',
      operation: 'write',
      memoryClass: 'decision-critical',
      tier: 'project',
      key: 'verdict',
      now: 5000,
    });
    const log = policy.getAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0].allowed).toBe(false);
    expect(log[0].agentId).toBe('rogue-agent');
    expect(log[0].operation).toBe('write');
    expect(log[0].key).toBe('verdict');
  });

  it('accumulates multiple blocked events in audit log', () => {
    const policy = new MemoryAccessPolicy([]);
    policy.evaluate({
      agentId: 'a',
      operation: 'read',
      memoryClass: 'decision-critical',
      tier: 'project',
    });
    policy.evaluate({
      agentId: 'b',
      operation: 'write',
      memoryClass: 'decision-critical',
      tier: 'org',
    });
    expect(policy.getAuditLog()).toHaveLength(2);
  });

  it('does not block when agent has rule for class but not for an unauthorized op', () => {
    const policy = new MemoryAccessPolicy([
      {
        agentPattern: 'agent-read-only',
        allowedOperations: ['read'],
        memoryClasses: ['decision-critical'],
      },
    ]);
    const readResult = policy.evaluate({
      agentId: 'agent-read-only',
      operation: 'read',
      memoryClass: 'decision-critical',
      tier: 'project',
    });
    const writeResult = policy.evaluate({
      agentId: 'agent-read-only',
      operation: 'write',
      memoryClass: 'decision-critical',
      tier: 'project',
    });
    expect(readResult.allowed).toBe(true);
    expect(writeResult.blocked).toBe(true);
  });

  it('enforceAccess throws MemoryAccessDeniedError for blocked access', () => {
    const policy = new MemoryAccessPolicy([]);
    expect(() =>
      policy.enforceAccess({
        agentId: 'rogue',
        operation: 'write',
        memoryClass: 'decision-critical',
        tier: 'project',
        key: 'gate-verdict',
      })
    ).toThrow(MemoryAccessDeniedError);
  });

  it('MemoryAccessDeniedError has correct properties', () => {
    const policy = new MemoryAccessPolicy([]);
    try {
      policy.enforceAccess({
        agentId: 'rogue',
        operation: 'read',
        memoryClass: 'decision-critical',
        tier: 'org',
        key: 'my-key',
      });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MemoryAccessDeniedError);
      expect(err.name).toBe('MemoryAccessDeniedError');
      expect(err.agentId).toBe('rogue');
      expect(err.operation).toBe('read');
      expect(err.memoryClass).toBe('decision-critical');
      expect(err.tier).toBe('org');
      expect(err.key).toBe('my-key');
      expect(err.message).toMatch(/rogue/);
    }
  });

  it('enforceAccess does not throw for authorized agent', () => {
    const policy = new MemoryAccessPolicy([
      {
        agentPattern: 'trusted',
        allowedOperations: ['write'],
        memoryClasses: ['decision-critical'],
      },
    ]);
    expect(() =>
      policy.enforceAccess({
        agentId: 'trusted',
        operation: 'write',
        memoryClass: 'decision-critical',
        tier: 'project',
      })
    ).not.toThrow();
  });
});

// ─── C2.2: Advisory class — always allowed ────────────────────

describe('MemoryAccessPolicy — advisory class always allowed (C2.2)', () => {
  it('allows advisory read for any agent (no rules)', () => {
    const policy = new MemoryAccessPolicy([]);
    const result = policy.evaluate({
      agentId: 'any-agent',
      operation: 'read',
      memoryClass: 'advisory',
      tier: 'run',
    });
    expect(result.allowed).toBe(true);
    expect(result.blocked).toBe(false);
  });

  it('allows advisory write for any agent (no rules)', () => {
    const policy = new MemoryAccessPolicy([]);
    const result = policy.evaluate({
      agentId: 'tool-x',
      operation: 'write',
      memoryClass: 'advisory',
      tier: 'project',
    });
    expect(result.allowed).toBe(true);
    expect(result.blocked).toBe(false);
  });

  it('produces no audit entry for advisory access', () => {
    const policy = new MemoryAccessPolicy([]);
    const result = policy.evaluate({
      agentId: 'agent-00',
      operation: 'write',
      memoryClass: 'advisory',
      tier: 'org',
    });
    expect(result.auditEntry).toBeNull();
    expect(policy.getAuditLog()).toHaveLength(0);
  });
});

// ─── Audit log management ────────────────────────────────────

describe('MemoryAccessPolicy — audit log management', () => {
  it('getAuditLog returns a copy (mutations do not affect internal log)', () => {
    const policy = new MemoryAccessPolicy([]);
    policy.evaluate({
      agentId: 'x',
      operation: 'write',
      memoryClass: 'decision-critical',
      tier: 'project',
    });
    const log = policy.getAuditLog();
    log.pop(); // mutate the copy
    expect(policy.getAuditLog()).toHaveLength(1); // internal log untouched
  });

  it('clearAuditLog empties the log', () => {
    const policy = new MemoryAccessPolicy([]);
    policy.evaluate({
      agentId: 'x',
      operation: 'read',
      memoryClass: 'decision-critical',
      tier: 'org',
    });
    policy.clearAuditLog();
    expect(policy.getAuditLog()).toHaveLength(0);
  });

  it('audit events have unique ids', () => {
    const policy = new MemoryAccessPolicy([]);
    policy.evaluate({
      agentId: 'a',
      operation: 'read',
      memoryClass: 'decision-critical',
      tier: 'project',
      now: 100,
    });
    policy.evaluate({
      agentId: 'b',
      operation: 'write',
      memoryClass: 'decision-critical',
      tier: 'org',
      now: 100,
    });
    const ids = policy.getAuditLog().map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─── addRule ─────────────────────────────────────────────────

describe('MemoryAccessPolicy — addRule', () => {
  it('dynamically added rule takes effect immediately', () => {
    const policy = new MemoryAccessPolicy([]);
    const before = policy.evaluate({
      agentId: 'dynamic-agent',
      operation: 'write',
      memoryClass: 'decision-critical',
      tier: 'project',
    });
    expect(before.blocked).toBe(true);

    policy.addRule({
      agentPattern: 'dynamic-agent',
      allowedOperations: ['write'],
      memoryClasses: ['decision-critical'],
    });

    const after = policy.evaluate({
      agentId: 'dynamic-agent',
      operation: 'write',
      memoryClass: 'decision-critical',
      tier: 'project',
    });
    expect(after.allowed).toBe(true);
  });
});
