/**
 * SDLC Lifecycle Model — Unit Tests
 *
 * Validates stage definitions, transition rules, gate conditions, and
 * the canonical stage sequence.
 */

import * as __req_0 from '../../platform/sdlc/lifecycle';
const {
  STAGE_DEFINITIONS,
  STAGE_SEQUENCE,
  getStageDefinition,
  canTransition,
  validateTransition,
  nextStage,
} = __req_0;

// ─── Stage Definitions ───────────────────────────────────────

describe('STAGE_DEFINITIONS', () => {
  it('has 10 stages', () => {
    expect(STAGE_DEFINITIONS).toHaveLength(10);
  });

  it('all stages have unique order values', () => {
    const orders = STAGE_DEFINITIONS.map((s) => s.order);
    expect(new Set(orders).size).toBe(STAGE_DEFINITIONS.length);
  });

  it('every stage has at least one gate', () => {
    for (const def of STAGE_DEFINITIONS) {
      expect(def.gates.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('IDEA has no predecessors', () => {
    const idea = getStageDefinition('IDEA');
    expect(idea.predecessors).toEqual([]);
  });

  it('IMPROVEMENT loops back to REQUIREMENTS or ARCHITECTURE', () => {
    const imp = getStageDefinition('IMPROVEMENT');
    expect(imp.successors).toContain('REQUIREMENTS');
    expect(imp.successors).toContain('ARCHITECTURE');
  });
});

// ─── Stage Sequence ──────────────────────────────────────────

describe('STAGE_SEQUENCE', () => {
  it('starts with IDEA and ends with IMPROVEMENT', () => {
    expect(STAGE_SEQUENCE[0]).toBe('IDEA');
    expect(STAGE_SEQUENCE[STAGE_SEQUENCE.length - 1]).toBe('IMPROVEMENT');
  });

  it('has all 10 stages', () => {
    expect(STAGE_SEQUENCE).toHaveLength(10);
  });
});

// ─── getStageDefinition ──────────────────────────────────────

describe('getStageDefinition', () => {
  it('returns definition for valid stage', () => {
    const def = getStageDefinition('ARCHITECTURE');
    expect(def).toBeDefined();
    expect(def.stage).toBe('ARCHITECTURE');
    expect(def.label).toBe('Architecture');
  });

  it('returns undefined for unknown stage', () => {
    expect(getStageDefinition('NONEXISTENT')).toBeUndefined();
  });
});

// ─── canTransition ───────────────────────────────────────────

describe('canTransition', () => {
  it('allows IDEA → REQUIREMENTS', () => {
    const result = canTransition('IDEA', 'REQUIREMENTS');
    expect(result.allowed).toBe(true);
  });

  it('blocks IDEA → IMPLEMENTATION (not a valid successor)', () => {
    const result = canTransition('IDEA', 'IMPLEMENTATION');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not allowed');
  });

  it('blocks unknown source stage', () => {
    const result = canTransition('NONEXISTENT', 'REQUIREMENTS');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Unknown source');
  });

  it('returns required gates for valid transition', () => {
    const result = canTransition('IDEA', 'REQUIREMENTS');
    expect(result.unmet_gates.length).toBeGreaterThan(0);
    expect(result.unmet_gates.every((g) => g.required)).toBe(true);
  });

  it('allows the full forward chain', () => {
    const chain = [
      ['IDEA', 'REQUIREMENTS'],
      ['REQUIREMENTS', 'ARCHITECTURE'],
      ['ARCHITECTURE', 'PLANNING'],
      ['PLANNING', 'IMPLEMENTATION'],
      ['IMPLEMENTATION', 'TESTING'],
      ['TESTING', 'SECURITY_VALIDATION'],
      ['SECURITY_VALIDATION', 'RELEASE'],
      ['RELEASE', 'OPERATIONS'],
      ['OPERATIONS', 'IMPROVEMENT'],
    ];
    for (const [from, to] of chain) {
      expect(canTransition(from, to).allowed).toBe(true);
    }
  });

  it('allows IMPROVEMENT → REQUIREMENTS (feedback loop)', () => {
    expect(canTransition('IMPROVEMENT', 'REQUIREMENTS').allowed).toBe(true);
  });

  it('allows IMPROVEMENT → ARCHITECTURE (feedback loop)', () => {
    expect(canTransition('IMPROVEMENT', 'ARCHITECTURE').allowed).toBe(true);
  });
});

// ─── validateTransition ──────────────────────────────────────

describe('validateTransition', () => {
  it('blocks transition when required gates are not passed', () => {
    const result = validateTransition('IDEA', 'REQUIREMENTS', new Set());
    expect(result.allowed).toBe(false);
    expect(result.unmet_gates.length).toBeGreaterThan(0);
  });

  it('allows transition when all required gates are passed', () => {
    const reqDef = getStageDefinition('REQUIREMENTS');
    const requiredIds = reqDef.gates.filter((g) => g.required).map((g) => g.id);
    const result = validateTransition('IDEA', 'REQUIREMENTS', new Set(requiredIds));
    expect(result.allowed).toBe(true);
  });

  it('reports unmet optional gates when required gates pass', () => {
    const reqDef = getStageDefinition('REQUIREMENTS');
    const requiredIds = reqDef.gates.filter((g) => g.required).map((g) => g.id);
    const optionalGates = reqDef.gates.filter((g) => !g.required);
    const result = validateTransition('IDEA', 'REQUIREMENTS', new Set(requiredIds));
    expect(result.unmet_gates.length).toBe(optionalGates.length);
  });
});

// ─── nextStage ───────────────────────────────────────────────

describe('nextStage', () => {
  it('returns REQUIREMENTS after IDEA', () => {
    expect(nextStage('IDEA')).toBe('REQUIREMENTS');
  });

  it('returns SECURITY_VALIDATION after TESTING', () => {
    expect(nextStage('TESTING')).toBe('SECURITY_VALIDATION');
  });

  it('returns undefined after IMPROVEMENT (last stage)', () => {
    expect(nextStage('IMPROVEMENT')).toBeUndefined();
  });

  it('returns undefined for unknown stage', () => {
    expect(nextStage('BOGUS')).toBeUndefined();
  });
});
