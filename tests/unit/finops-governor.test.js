import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import { FinopsGovernor, buildCompletionCacheKey } from '../../platform/engine/finops-governor';

describe('FinopsGovernor', () => {
  let tmpRoot;
  let ledgerPath;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'finops-governor-'));
    ledgerPath = path.join(tmpRoot, 'finops-ledger.json');
  });

  afterEach(async () => {
    delete process.env.FINOPS_SESSION_TOKEN_BUDGET;
    delete process.env.FINOPS_WORKFLOW_TOKEN_BUDGET;
    delete process.env.FINOPS_SESSION_COST_BUDGET_USD;
    delete process.env.FINOPS_WORKFLOW_COST_BUDGET_USD;
    if (tmpRoot) {
      await fs.rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = null;
    }
  });

  it('blocks invocations that exceed configured session token ceiling', () => {
    process.env.FINOPS_SESSION_TOKEN_BUDGET = '100';
    process.env.FINOPS_WORKFLOW_TOKEN_BUDGET = '1000';
    process.env.FINOPS_SESSION_COST_BUDGET_USD = '10';
    process.env.FINOPS_WORKFLOW_COST_BUDGET_USD = '20';

    const governor = new FinopsGovernor(ledgerPath);

    const estimate = governor.getBudgetEstimate('gpt-4o', 60, 50);
    const gate = governor.enforceBudget(
      {
        agentId: '01',
        executionPolicy: 'standard',
        workspaceId: 'ws-1',
        sessionState: { session_id: 's-1', mode: 'CREATE' },
      },
      estimate
    );

    expect(gate.allowed).toBe(false);
    expect(gate.reason).toContain('BUDGET_BLOCKED_SESSION_TOKEN_LIMIT');
  });

  it('records usage and accumulates spend for follow-up gating', () => {
    process.env.FINOPS_SESSION_TOKEN_BUDGET = '500';
    process.env.FINOPS_WORKFLOW_TOKEN_BUDGET = '500';
    process.env.FINOPS_SESSION_COST_BUDGET_USD = '0.3';
    process.env.FINOPS_WORKFLOW_COST_BUDGET_USD = '0.3';

    const governor = new FinopsGovernor(ledgerPath);
    governor.recordUsage(
      {
        agentId: '01',
        executionPolicy: 'standard',
        workspaceId: 'ws-1',
        sessionState: { session_id: 's-2', mode: 'CREATE' },
        state: 'PHASE_1',
      },
      { provider: 'openai', model: 'gpt-4o' },
      { promptTokens: 200, completionTokens: 50, totalTokens: 250 }
    );

    const followUpEstimate = governor.getBudgetEstimate('gpt-4o', 50, 400);
    const gate = governor.enforceBudget(
      {
        agentId: '01',
        executionPolicy: 'standard',
        workspaceId: 'ws-1',
        sessionState: { session_id: 's-2', mode: 'CREATE' },
      },
      followUpEstimate
    );

    expect(gate.allowed).toBe(false);
    expect(gate.reason).toMatch(/BUDGET_BLOCKED_SESSION_(TOKEN|COST)_LIMIT/);
  });

  it('stores and retrieves deterministic completion cache entries', () => {
    const governor = new FinopsGovernor(ledgerPath);
    const key = buildCompletionCacheKey({
      provider: 'openai',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
      maxTokens: 200,
      temperature: 0,
      policyFingerprint: '{"allow":[]}',
    });

    expect(governor.getCachedCompletion(key)).toBeNull();

    governor.putCachedCompletion(key, {
      content: 'world',
      model: 'gpt-4o',
      finishReason: 'stop',
    });

    expect(governor.getCachedCompletion(key)?.response.content).toBe('world');
  });
});
