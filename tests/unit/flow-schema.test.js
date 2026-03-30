'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  validateCanonicalFlows,
  SCHEMA_PATH,
  FLOWS_PATH,
} = require('../../platform/engine/flow-schema');

describe('Canonical flow schema validation (S4-2)', () => {
  it('loads schema and flows files', () => {
    expect(fs.existsSync(SCHEMA_PATH)).toBe(true);
    expect(fs.existsSync(FLOWS_PATH)).toBe(true);
  });

  it('validates flows.json with zero errors', () => {
    const result = validateCanonicalFlows();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('has at least 10 states defined', () => {
    const result = validateCanonicalFlows();
    expect(result.stateCount).toBeGreaterThanOrEqual(10);
  });

  it('has at least 5 command modes', () => {
    const result = validateCanonicalFlows();
    expect(result.modeCount).toBeGreaterThanOrEqual(5);
  });

  it('has gates for all critic/risk checkpoints', () => {
    const result = validateCanonicalFlows();
    expect(result.gateCount).toBeGreaterThanOrEqual(4);
  });

  it('fullFlow starts with IDLE and ends with COMPLETED', () => {
    const data = JSON.parse(fs.readFileSync(FLOWS_PATH, 'utf8'));
    expect(data.fullFlow[0]).toBe('IDLE');
    expect(data.fullFlow[data.fullFlow.length - 1]).toBe('COMPLETED');
  });

  it('all structural states are included in states list', () => {
    const data = JSON.parse(fs.readFileSync(FLOWS_PATH, 'utf8'));
    const stateSet = new Set(data.states);
    for (const s of data.structuralStates) {
      expect(stateSet.has(s)).toBe(true);
    }
  });

  it('CREATE mode includes all 4 phases', () => {
    const data = JSON.parse(fs.readFileSync(FLOWS_PATH, 'utf8'));
    const create = data.modes.CREATE;
    expect(create.phases).toEqual(['PHASE_1', 'PHASE_2', 'PHASE_3', 'PHASE_4']);
  });

  it('rejects invalid flows data', () => {
    const tmpDir = path.join(__dirname, '..', '..', 'platform', 'schema');
    const badPath = path.join(tmpDir, '_test_bad_flows.json');
    fs.writeFileSync(badPath, JSON.stringify({ invalid: true }), 'utf8');
    try {
      const result = validateCanonicalFlows({ flowsPath: badPath });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    } finally {
      fs.unlinkSync(badPath);
    }
  });

  it('rejects fullFlow/structuralStates references to unknown states', () => {
    const tmpDir = path.join(__dirname, '..', '..', 'platform', 'schema');
    const badPath = path.join(tmpDir, '_test_bad_semantics_states.json');

    const data = JSON.parse(fs.readFileSync(FLOWS_PATH, 'utf8'));
    data.fullFlow = [...data.fullFlow, 'PHASE_X'];
    data.structuralStates = [...data.structuralStates, 'STATE_X'];

    fs.writeFileSync(badPath, JSON.stringify(data), 'utf8');
    try {
      const result = validateCanonicalFlows({ flowsPath: badPath });
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => String(e.message).includes('fullFlow references unknown state'))
      ).toBe(true);
      expect(
        result.errors.some((e) =>
          String(e.message).includes('structuralStates references unknown state')
        )
      ).toBe(true);
    } finally {
      fs.unlinkSync(badPath);
    }
  });

  it('rejects gate references to unknown states', () => {
    const tmpDir = path.join(__dirname, '..', '..', 'platform', 'schema');
    const badPath = path.join(tmpDir, '_test_bad_semantics_gate_mode.json');

    const data = JSON.parse(fs.readFileSync(FLOWS_PATH, 'utf8'));
    data.gates = [
      ...data.gates,
      { id: 'gate-test-unknown', after: 'PHASE_DOES_NOT_EXIST', before: 'PHASE_1' },
      { id: 'gate-test-unknown-before', after: 'PHASE_1', before: 'PHASE_DOES_NOT_EXIST_2' },
    ];

    fs.writeFileSync(badPath, JSON.stringify(data), 'utf8');
    try {
      const result = validateCanonicalFlows({ flowsPath: badPath });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    } finally {
      fs.unlinkSync(badPath);
    }
  });
});
