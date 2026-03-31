// Copyright (c) 2026 Robert Agterhuis. MIT License.

import * as __req_0 from '../../src/webapp/services/chat/action-proposer';
const { ActionProposer } = __req_0;

describe('ActionProposer', () => {
  const proposer = new ActionProposer();

  it('returns a fallback open_screen /dashboard when no keywords match', () => {
    const actions = proposer.propose({ intent: 'general_assist', message: 'Hello' });
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe('open_screen');
    expect(actions[0].payload.target).toBe('/dashboard');
  });

  it('proposes create_command for a message containing "start"', () => {
    const actions = proposer.propose({ intent: 'general_assist', message: 'start the process' });
    const types = actions.map((a) => a.type);
    expect(types).toContain('create_command');
  });

  it('proposes create_command for a message containing "run"', () => {
    const actions = proposer.propose({
      intent: 'general_assist',
      message: 'please run the pipeline',
    });
    expect(actions.some((a) => a.type === 'create_command')).toBe(true);
  });

  it('returns FEATURE payload when message contains "feature"', () => {
    const actions = proposer.propose({ intent: 'general_assist', message: 'start a feature run' });
    const cmd = actions.find((a) => a.type === 'create_command');
    expect(cmd.payload.command).toBe('FEATURE');
  });

  it('returns AUDIT payload when message contains "audit"', () => {
    const actions = proposer.propose({ intent: 'general_assist', message: 'run an audit now' });
    const cmd = actions.find((a) => a.type === 'create_command');
    expect(cmd.payload.command).toBe('AUDIT');
  });

  it('proposes approve action when message has "approve" and a valid APR-ID', () => {
    const actions = proposer.propose({
      intent: 'approval_guidance',
      message: 'please approve APR-001',
    });
    expect(actions.some((a) => a.type === 'approve')).toBe(true);
  });

  it('proposes reject action when message has "reject" and a valid APR-ID', () => {
    const actions = proposer.propose({
      intent: 'approval_guidance',
      message: 'reject APR-URGENT-01',
    });
    expect(actions.some((a) => a.type === 'reject')).toBe(true);
  });

  it('proposes pause action when message contains "pause"', () => {
    const actions = proposer.propose({
      intent: 'general_assist',
      message: 'pause the current run',
    });
    expect(actions.some((a) => a.type === 'pause')).toBe(true);
  });

  it('proposes resume action when message contains "resume"', () => {
    const actions = proposer.propose({
      intent: 'general_assist',
      message: 'resume where we left off',
    });
    expect(actions.some((a) => a.type === 'resume')).toBe(true);
  });

  it('proposes open_screen /decisions for decision_lookup intent', () => {
    const actions = proposer.propose({
      intent: 'decision_lookup',
      message: 'what decisions exist',
    });
    const screen = actions.find((a) => a.type === 'open_screen');
    expect(screen.payload.target).toBe('/decisions');
  });

  it('proposes open_screen /artifacts for artifact_query intent', () => {
    const actions = proposer.propose({ intent: 'artifact_query', message: 'show artifacts' });
    const screen = actions.find((a) => a.type === 'open_screen');
    expect(screen.payload.target).toBe('/artifacts');
  });

  it('proposes open_screen /approvals for approval_guidance intent', () => {
    const actions = proposer.propose({ intent: 'approval_guidance', message: 'policy info' });
    const screen = actions.find((a) => a.type === 'open_screen');
    expect(screen.payload.target).toBe('/approvals');
  });

  it('returned actions each have an id, label, type, payload and requires_confirmation', () => {
    const actions = proposer.propose({ intent: 'general_assist', message: 'start a run' });
    for (const action of actions) {
      expect(action).toHaveProperty('id');
      expect(action).toHaveProperty('label');
      expect(action).toHaveProperty('type');
      expect(action).toHaveProperty('payload');
      expect(action).toHaveProperty('requires_confirmation');
    }
  });
});
