'use strict';

'use strict';

/**
 * Hybrid Executor — Unit Tests (M4 / Issue #1399)
 *
 * Covers:
 *   - createHybridExecutor factory returns HybridExecutor instance
 *   - runInjection with no matching injection for a state (completed, empty steps)
 *   - runInjection with one injected agent that succeeds
 *   - runInjection with multiple injected agents, all succeed
 *   - runInjection with injected agent that fails validation (failed)
 *   - agencyOutputs getter returns accumulated results (keyed by agent.id)
 *   - injectionSteps getter tracks all injection steps across calls
 *
 * API notes:
 *   - createHybridExecutor({ injections: HybridInjectionSpec[], invokeAgent, ... })
 *   - HybridInjectionSpec: { atState: string, agents: AgencyAgent[] }
 *   - invokeAgent(agent, context) => Promise<{ success, deliverable? }> — REQUIRED
 *   - result.status: 'completed' | 'failed' (no SKIPPED or ESCALATED)
 *   - result.injectionSteps (not result.steps)
 *   - result.failedAgentId (string) + result.failedAtState (string) on failure
 *   - executor.agencyOutputs keyed by agent.id, not phase name
 */

const { createHybridExecutor } = require('../../platform/engine/hybrid-executor');

// ─── Helpers ──────────────────────────────────────────────────

const COMPLETE_HANDOFF = `
## HANDOFF CHECKLIST
- [x] All required sections are filled (not empty, not placeholder)
- [x] All UNCERTAIN: items are documented and escalated
- [x] All INSUFFICIENT_DATA: items are documented and escalated
- [x] Output complies with the contract in /templates/sdlc/contracts/
- [x] Guardrails from /templates/sdlc/guardrails/ have been checked
- [x] Output is machine-readable and ready as input for the next agent
- [x] No contradictory statements in this document
- [x] All findings include a source reference
- [x] Deliverable written to file (not only in chat) per MEMORY MANAGEMENT PROTOCOL
`.trim();

const INCOMPLETE_HANDOFF = `
## HANDOFF CHECKLIST
- [x] All required sections are filled
- [ ] All UNCERTAIN: items are documented
`.trim();

function makeAgent(id) {
  return { id, name: `Agent ${id}` };
}

function makeInvokeAgent(deliverable = COMPLETE_HANDOFF) {
  return vi.fn().mockResolvedValue({ success: true, deliverable });
}

function makeFailingInvokeAgent() {
  return vi.fn().mockResolvedValue({ success: true, deliverable: INCOMPLETE_HANDOFF });
}

// ─── Factory ─────────────────────────────────────────────────

describe('createHybridExecutor', () => {
  test('returns an object with runInjection method', () => {
    const executor = createHybridExecutor({ injections: [], invokeAgent: vi.fn() });
    expect(typeof executor.runInjection).toBe('function');
  });

  test('agencyOutputs starts as empty object', () => {
    const executor = createHybridExecutor({ injections: [], invokeAgent: vi.fn() });
    expect(executor.agencyOutputs).toEqual({});
  });

  test('injectionSteps starts as empty array', () => {
    const executor = createHybridExecutor({ injections: [], invokeAgent: vi.fn() });
    expect(executor.injectionSteps).toEqual([]);
  });
});

// ─── runInjection — no agents for state ──────────────────────

describe('runInjection — no matching agents', () => {
  test('returns completed with empty injectionSteps when no injection for the state', async () => {
    const executor = createHybridExecutor({ injections: [], invokeAgent: vi.fn() });
    const result = await executor.runInjection('PHASE_1', {});
    expect(result.status).toBe('completed');
    expect(result.injectionSteps).toHaveLength(0);
  });

  test('returns completed when injection spec for state has empty agents array', async () => {
    const executor = createHybridExecutor({
      injections: [{ atState: 'PHASE_1', agents: [] }],
      invokeAgent: vi.fn(),
    });
    const result = await executor.runInjection('PHASE_1', {});
    expect(result.status).toBe('completed');
    expect(result.injectionSteps).toHaveLength(0);
  });
});

// ─── runInjection — single agent success ─────────────────────

describe('runInjection — single agent success', () => {
  test('returns completed with one step for one injected agent', async () => {
    const invokeAgent = makeInvokeAgent();
    const executor = createHybridExecutor({
      injections: [{ atState: 'PHASE_1', agents: [makeAgent('domain-expert')] }],
      invokeAgent,
    });
    const result = await executor.runInjection('PHASE_1', { existingOutput: 'context' });
    expect(result.status).toBe('completed');
    expect(result.injectionSteps).toHaveLength(1);
    expect(result.injectionSteps[0].agentId).toBe('domain-expert');
  });

  test('accumulates agency output after successful injection (keyed by agent id)', async () => {
    const invokeAgent = makeInvokeAgent();
    const executor = createHybridExecutor({
      injections: [{ atState: 'PHASE_1', agents: [makeAgent('domain-expert')] }],
      invokeAgent,
    });
    await executor.runInjection('PHASE_1', {});
    expect(executor.agencyOutputs).toHaveProperty('domain-expert');
  });

  test('passes sdlcPredecessorOutputs to invokeAgent via context', async () => {
    const invokeAgent = makeInvokeAgent();
    const executor = createHybridExecutor({
      injections: [{ atState: 'PHASE_2', agents: [makeAgent('security-architect')] }],
      invokeAgent,
    });
    const predecessorOutputs = { analysis: 'PHASE_1 output text' };
    await executor.runInjection('PHASE_2', predecessorOutputs);
    expect(invokeAgent).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'security-architect' }),
      expect.objectContaining({ sdlcPredecessorOutputs: predecessorOutputs })
    );
  });
});

// ─── runInjection — multiple agents ──────────────────────────

describe('runInjection — multiple agents', () => {
  test('all agents invoked and result is completed', async () => {
    const invokeAgent = makeInvokeAgent();
    const executor = createHybridExecutor({
      injections: [
        { atState: 'PHASE_3', agents: [makeAgent('a1'), makeAgent('a2'), makeAgent('a3')] },
      ],
      invokeAgent,
    });
    const result = await executor.runInjection('PHASE_3', {});
    expect(result.status).toBe('completed');
    expect(result.injectionSteps).toHaveLength(3);
    expect(invokeAgent).toHaveBeenCalledTimes(3);
  });
});

// ─── runInjection — validation failure ───────────────────────

describe('runInjection — validation failure', () => {
  test('returns failed when injected agent has incomplete checklist', async () => {
    const invokeAgent = makeFailingInvokeAgent();
    const executor = createHybridExecutor({
      injections: [{ atState: 'PHASE_2', agents: [makeAgent('risk-agent')] }],
      invokeAgent,
    });
    const result = await executor.runInjection('PHASE_2', {});
    expect(result.status).toBe('failed');
    expect(result.failedAgentId).toBe('risk-agent');
  });

  test('stops processing agents after first failure', async () => {
    const invokeAgent = vi
      .fn()
      .mockResolvedValueOnce({ success: true, deliverable: INCOMPLETE_HANDOFF })
      .mockResolvedValueOnce({ success: true, deliverable: COMPLETE_HANDOFF });
    const executor = createHybridExecutor({
      injections: [{ atState: 'PHASE_1', agents: [makeAgent('a1'), makeAgent('a2')] }],
      invokeAgent,
    });
    await executor.runInjection('PHASE_1', {});
    expect(invokeAgent).toHaveBeenCalledTimes(1);
  });
});

// ─── Multiple injections — accumulated state ──────────────────

describe('runInjection — accumulated state across multiple phases', () => {
  test('injectionSteps getter tracks all steps across multiple runInjection calls', async () => {
    const invokeAgent = makeInvokeAgent();
    const executor = createHybridExecutor({
      injections: [
        { atState: 'PHASE_1', agents: [makeAgent('a1')] },
        { atState: 'PHASE_2', agents: [makeAgent('a2')] },
      ],
      invokeAgent,
    });
    await executor.runInjection('PHASE_1', {});
    await executor.runInjection('PHASE_2', {});
    expect(executor.injectionSteps).toHaveLength(2);
  });

  test('agencyOutputs accumulates across multiple phases (keyed by agent id)', async () => {
    const invokeAgent = makeInvokeAgent();
    const executor = createHybridExecutor({
      injections: [
        { atState: 'PHASE_1', agents: [makeAgent('a1')] },
        { atState: 'PHASE_2', agents: [makeAgent('a2')] },
      ],
      invokeAgent,
    });
    await executor.runInjection('PHASE_1', { phase1Doc: 'Some output' });
    await executor.runInjection('PHASE_2', { phase2Doc: 'Some tech output' });
    expect(executor.agencyOutputs).toHaveProperty('a1');
    expect(executor.agencyOutputs).toHaveProperty('a2');
  });
});
