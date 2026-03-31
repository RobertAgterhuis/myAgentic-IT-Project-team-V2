'use strict';

'use strict';

/**
 * Agency Executor — Unit Tests (M4 / Issue #1398)
 *
 * Covers:
 *   - runAgencyExecution: success path with all agents passing
 *   - runAgencyExecution: step failure on handoff validation
 *   - runAgencyExecution: retry logic on invocation failure
 *   - runAgencyExecution: handoff validation failure for incomplete checklist
 *   - runAgencyExecution: empty agents array returns completed
 *   - runAgencyExecution: custom validateHandoff override
 *
 * API notes:
 *   - Agents are plain { id, name } objects — no invoke method
 *   - invokeAgent is a REQUIRED option: (agent, context) => Promise<{ success, deliverable? }>
 *   - result.status is lowercase: 'completed' | 'failed' | 'partial'
 *   - result.failedAtStep is a zero-based step index number, not an agent id
 *   - validateHandoff returns { passed: boolean, violations: string[] }
 */

const { runAgencyExecution } = require('../../platform/engine/agency-executor');

// ─── Helpers ──────────────────────────────────────────────────

const COMPLETE_HANDOFF = `
# Agent Output

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
# Agent Output

## HANDOFF CHECKLIST
- [x] All required sections are filled
- [ ] All UNCERTAIN: items are documented and escalated
- [ ] All INSUFFICIENT_DATA: items are documented and escalated
`.trim();

function makeAgent(id) {
  return { id, name: `Agent ${id}` };
}

// ─── Success path ─────────────────────────────────────────────

describe('runAgencyExecution — success path', () => {
  test('returns completed with all steps passed', async () => {
    const invokeAgent = vi.fn().mockResolvedValue({ success: true, deliverable: COMPLETE_HANDOFF });
    const agents = [makeAgent('agent-01'), makeAgent('agent-02'), makeAgent('agent-03')];
    const result = await runAgencyExecution({ agents, invokeAgent });
    expect(result.status).toBe('completed');
    expect(result.steps).toHaveLength(3);
    expect(result.failedAtStep).toBeUndefined();
  });

  test('each step has agentId, status completed, and deliverable', async () => {
    const invokeAgent = vi.fn().mockResolvedValue({ success: true, deliverable: COMPLETE_HANDOFF });
    const result = await runAgencyExecution({ agents: [makeAgent('agent-01')], invokeAgent });
    const step = result.steps[0];
    expect(step.agentId).toBe('agent-01');
    expect(step.status).toBe('completed');
    expect(typeof step.deliverable).toBe('string');
  });

  test('empty agents array returns completed with no steps', async () => {
    const invokeAgent = vi.fn();
    const result = await runAgencyExecution({ agents: [], invokeAgent });
    expect(result.status).toBe('completed');
    expect(result.steps).toHaveLength(0);
  });
});

// ─── Handoff validation failure ───────────────────────────────

describe('runAgencyExecution — handoff validation', () => {
  test('step with incomplete checklist causes failed status', async () => {
    const invokeAgent = vi
      .fn()
      .mockResolvedValue({ success: true, deliverable: INCOMPLETE_HANDOFF });
    const result = await runAgencyExecution({ agents: [makeAgent('agent-01')], invokeAgent });
    expect(result.status).toBe('failed');
    expect(result.failedAtStep).toBe(0);
  });

  test('second agent failure stops after the failing step', async () => {
    const invokeAgent = vi
      .fn()
      .mockResolvedValueOnce({ success: true, deliverable: COMPLETE_HANDOFF })
      .mockResolvedValueOnce({ success: true, deliverable: INCOMPLETE_HANDOFF });
    const agents = [makeAgent('agent-01'), makeAgent('agent-02'), makeAgent('agent-03')];
    const result = await runAgencyExecution({ agents, invokeAgent });
    expect(result.status).toBe('failed');
    expect(result.failedAtStep).toBe(1);
    // agent-03 should not have been invoked after agent-02 failed
    expect(invokeAgent).toHaveBeenCalledTimes(2);
  });
});

// ─── Invocation failure + retry ───────────────────────────────

describe('runAgencyExecution — invocation failure', () => {
  test('failed when agent returns success: false and maxRetries=0', async () => {
    const invokeAgent = vi.fn().mockResolvedValue({ success: false, error: 'Agent failed' });
    const result = await runAgencyExecution({
      agents: [makeAgent('agent-01')],
      invokeAgent,
      maxRetries: 0,
    });
    expect(result.status).toBe('failed');
    expect(result.failedAtStep).toBe(0);
  });

  test('retries and succeeds if first invocation returns failure but second succeeds', async () => {
    const invokeAgent = vi
      .fn()
      .mockResolvedValueOnce({ success: false, error: 'transient error' })
      .mockResolvedValueOnce({ success: true, deliverable: COMPLETE_HANDOFF });
    const result = await runAgencyExecution({
      agents: [makeAgent('agent-01')],
      invokeAgent,
      maxRetries: 2,
    });
    expect(result.status).toBe('completed');
    expect(invokeAgent).toHaveBeenCalledTimes(2);
  });
});

// ─── Custom validateHandoff override ─────────────────────────

describe('runAgencyExecution — custom validateHandoff', () => {
  test('custom validator that always passes overrides default', async () => {
    const invokeAgent = vi
      .fn()
      .mockResolvedValue({ success: true, deliverable: INCOMPLETE_HANDOFF });
    const result = await runAgencyExecution({
      agents: [makeAgent('agent-01')],
      invokeAgent,
      validateHandoff: () => ({ passed: true, violations: [] }),
    });
    expect(result.status).toBe('completed');
  });

  test('custom validator that always fails overrides default', async () => {
    const invokeAgent = vi.fn().mockResolvedValue({ success: true, deliverable: COMPLETE_HANDOFF });
    const result = await runAgencyExecution({
      agents: [makeAgent('agent-01')],
      invokeAgent,
      validateHandoff: () => ({ passed: false, violations: ['custom violation'] }),
    });
    expect(result.status).toBe('failed');
  });
});
