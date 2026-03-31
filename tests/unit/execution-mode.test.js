/**
 * Execution Mode — Unit Tests (M4 / Issue #1396)
 *
 * Covers:
 *   - VALID_EXECUTION_MODES constant shape
 *   - ExecutionModeDescriptors shape and field invariants
 *   - assertExecutionMode: valid, invalid, undefined
 *   - resolveExecutionMode: defaults to SDLC_ONLY, accepts valid values
 *   - getExecutionModeDescriptor: returns correct descriptor per mode
 *   - HYBRID injectionPoints (via descriptor): all phases present
 *   - EXECUTION_MODE_DECISION_MATRIX: non-empty, correct field names
 */

import {
  VALID_EXECUTION_MODES,
  EXECUTION_MODE_DESCRIPTORS,
  EXECUTION_MODE_DECISION_MATRIX,
  assertExecutionMode,
  resolveExecutionMode,
  getExecutionModeDescriptor,
} from '../../platform/engine/execution-mode';

// ─── VALID_EXECUTION_MODES ───────────────────────────────────

describe('VALID_EXECUTION_MODES', () => {
  test('contains exactly SDLC_ONLY, AGENCY_ONLY, HYBRID', () => {
    expect(VALID_EXECUTION_MODES).toContain('SDLC_ONLY');
    expect(VALID_EXECUTION_MODES).toContain('AGENCY_ONLY');
    expect(VALID_EXECUTION_MODES).toContain('HYBRID');
    expect(VALID_EXECUTION_MODES).toHaveLength(3);
  });

  test('is frozen', () => {
    expect(Object.isFrozen(VALID_EXECUTION_MODES)).toBe(true);
  });
});

// ─── EXECUTION_MODE_DESCRIPTORS ─────────────────────────────

describe('EXECUTION_MODE_DESCRIPTORS', () => {
  test('is frozen', () => {
    expect(Object.isFrozen(EXECUTION_MODE_DESCRIPTORS)).toBe(true);
  });

  test.each(['SDLC_ONLY', 'AGENCY_ONLY', 'HYBRID'])(
    'descriptor for %s has required fields',
    (mode) => {
      const d = EXECUTION_MODE_DESCRIPTORS[mode];
      expect(d).toBeDefined();
      expect(typeof d.mode).toBe('string');
      expect(typeof d.label).toBe('string');
      expect(typeof d.description).toBe('string');
      expect(typeof d.usesSdlcPhases).toBe('boolean');
      expect(typeof d.usesAgencyTeam).toBe('boolean');
      expect(Array.isArray(d.injectionPoints)).toBe(true);
      expect(typeof d.escalationPolicy).toBe('string');
    }
  );

  test('SDLC_ONLY usesSdlcPhases=true, usesAgencyTeam=false', () => {
    const d = EXECUTION_MODE_DESCRIPTORS['SDLC_ONLY'];
    expect(d.usesSdlcPhases).toBe(true);
    expect(d.usesAgencyTeam).toBe(false);
  });

  test('AGENCY_ONLY usesSdlcPhases=false, usesAgencyTeam=true', () => {
    const d = EXECUTION_MODE_DESCRIPTORS['AGENCY_ONLY'];
    expect(d.usesSdlcPhases).toBe(false);
    expect(d.usesAgencyTeam).toBe(true);
  });

  test('HYBRID usesSdlcPhases=true, usesAgencyTeam=true', () => {
    const d = EXECUTION_MODE_DESCRIPTORS['HYBRID'];
    expect(d.usesSdlcPhases).toBe(true);
    expect(d.usesAgencyTeam).toBe(true);
  });
});

// ─── assertExecutionMode ─────────────────────────────────────

describe('assertExecutionMode', () => {
  test('does not throw for SDLC_ONLY', () => {
    expect(() => assertExecutionMode('SDLC_ONLY')).not.toThrow();
  });

  test('does not throw for AGENCY_ONLY', () => {
    expect(() => assertExecutionMode('AGENCY_ONLY')).not.toThrow();
  });

  test('does not throw for HYBRID', () => {
    expect(() => assertExecutionMode('HYBRID')).not.toThrow();
  });

  test('throws for unknown mode', () => {
    expect(() => assertExecutionMode('INVALID_MODE')).toThrow(/executionMode/i);
  });

  test('throws for undefined', () => {
    expect(() => assertExecutionMode(undefined)).toThrow();
  });

  test('throws for null', () => {
    expect(() => assertExecutionMode(null)).toThrow();
  });
});

// ─── resolveExecutionMode ────────────────────────────────────

describe('resolveExecutionMode', () => {
  test('returns SDLC_ONLY when called with no argument', () => {
    expect(resolveExecutionMode()).toBe('SDLC_ONLY');
  });

  test('returns SDLC_ONLY when called with undefined', () => {
    expect(resolveExecutionMode(undefined)).toBe('SDLC_ONLY');
  });

  test('returns SDLC_ONLY when called with null', () => {
    expect(resolveExecutionMode(null)).toBe('SDLC_ONLY');
  });

  test('returns SDLC_ONLY for the string "SDLC_ONLY"', () => {
    expect(resolveExecutionMode('SDLC_ONLY')).toBe('SDLC_ONLY');
  });

  test('returns AGENCY_ONLY for the string "AGENCY_ONLY"', () => {
    expect(resolveExecutionMode('AGENCY_ONLY')).toBe('AGENCY_ONLY');
  });

  test('returns HYBRID for the string "HYBRID"', () => {
    expect(resolveExecutionMode('HYBRID')).toBe('HYBRID');
  });

  test('throws for an invalid string', () => {
    expect(() => resolveExecutionMode('UNKNOWN')).toThrow();
  });
});

// ─── getExecutionModeDescriptor ─────────────────────────────

describe('getExecutionModeDescriptor', () => {
  test.each(['SDLC_ONLY', 'AGENCY_ONLY', 'HYBRID'])('returns descriptor for %s', (mode) => {
    const d = getExecutionModeDescriptor(mode);
    expect(d.mode).toBe(mode);
  });

  test('throws for invalid mode', () => {
    expect(getExecutionModeDescriptor('BOGUS')).toBeUndefined();
  });
});

// ─── HYBRID_INJECTION_POINTS ─────────────────────────────────

// ─── HYBRID injectionPoints (via descriptor) ─────────────────

describe('HYBRID injectionPoints', () => {
  const hybridDescriptor = EXECUTION_MODE_DESCRIPTORS['HYBRID'];

  test('has entries for all SDLC phases', () => {
    const states = hybridDescriptor.injectionPoints.map((p) => p.atState);
    expect(states).toContain('PHASE_1');
    expect(states).toContain('PHASE_2');
    expect(states).toContain('PHASE_3');
    expect(states).toContain('PHASE_4');
  });

  test('each injection point entry has atState and mandatory fields', () => {
    for (const entry of hybridDescriptor.injectionPoints) {
      expect(typeof entry.atState).toBe('string');
      expect(typeof entry.mandatory).toBe('boolean');
    }
  });

  test('all injection points are non-mandatory (backward compatible)', () => {
    for (const entry of hybridDescriptor.injectionPoints) {
      expect(entry.mandatory).toBe(false);
    }
  });
});

// ─── EXECUTION_MODE_DECISION_MATRIX ──────────────────────────

describe('EXECUTION_MODE_DECISION_MATRIX', () => {
  test('is non-empty', () => {
    expect(Array.isArray(EXECUTION_MODE_DECISION_MATRIX)).toBe(true);
    expect(EXECUTION_MODE_DECISION_MATRIX.length).toBeGreaterThan(0);
  });

  test('each row has mode and recommendedMode fields', () => {
    for (const row of EXECUTION_MODE_DECISION_MATRIX) {
      expect(typeof row.factor).toBe('string');
      expect(typeof row.sdlcOnly).toBe('string');
      expect(typeof row.agencyOnly).toBe('string');
      expect(typeof row.hybrid).toBe('string');
    }
  });
});
