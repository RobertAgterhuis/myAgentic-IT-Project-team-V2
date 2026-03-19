'use strict';

const path = require('path');
const { createTestApp } = require('../helpers/create-test-app');

let app;

const FLOW_PATH = path.resolve(process.cwd(), 'platform', 'engine', 'flows.yaml');
const FLOW_YAML = `states:
  - IDLE
  - ONBOARDING
  - PHASE_1
  - CRITIC_1
  - PHASE_2
  - CRITIC_2
  - PHASE_3
  - CRITIC_3
  - PHASE_4
  - CRITIC_4
  - SYNTHESIS
  - SPRINT_GATE
  - PHASE_5_EXECUTING
  - DONE
  - ERROR

full_flow:
  - IDLE
  - ONBOARDING
  - PHASE_1
  - CRITIC_1
  - PHASE_2
  - CRITIC_2
  - PHASE_3
  - CRITIC_3
  - PHASE_4
  - CRITIC_4
  - SYNTHESIS
  - SPRINT_GATE
  - PHASE_5_EXECUTING
  - DONE

structural_states:
  - IDLE
  - DONE
  - ERROR

events:
  - ADVANCE
  - ERROR
  - RECOVER
  - RESET

modes:
  CREATE:
    label: Full create workflow
    phases: [ONBOARDING, PHASE_1, PHASE_2, PHASE_3, PHASE_4, SYNTHESIS, PHASE_5_EXECUTING]
  CREATE_BUSINESS:
    label: Business creation workflow
    phases: [ONBOARDING, PHASE_1]
  CREATE_TECH:
    label: Technical creation workflow
    phases: [ONBOARDING, PHASE_2]
  CREATE_UX:
    label: UX creation workflow
    phases: [ONBOARDING, PHASE_3]
  CREATE_MARKETING:
    label: Marketing creation workflow
    phases: [ONBOARDING, PHASE_4]
  AUDIT:
    label: Audit workflow
    phases: [ONBOARDING, PHASE_2, PHASE_3, PHASE_4]
  FEATURE:
    label: Feature delivery workflow
    phases: [PHASE_5_EXECUTING]
  SCOPE_CHANGE:
    label: Scope change workflow
    phases: [PHASE_5_EXECUTING]
  HOTFIX:
    label: Hotfix workflow
    phases: [PHASE_5_EXECUTING]
`;

function inject(method, url, payload) {
  const opts = { method, url };
  if (payload !== undefined) {
    opts.payload = payload;
    opts.headers = { 'content-type': 'application/json' };
  }
  return app.inject(opts);
}

describe('M5 Epic #665 orchestrator workflow automation', () => {
  beforeAll(async () => {
    app = await createTestApp({
      [FLOW_PATH]: FLOW_YAML,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('automates CREATE command through orchestrator API', async () => {
    const res = await inject('POST', '/api/orchestrator/command', {
      command: 'CREATE',
      platform: 'copilot',
      project: 'M5-Orchestrator-Create',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.command).toBe('CREATE');
    expect(body.status.mode).toBe('CREATE');
    expect(body.platform).toBe('copilot');
  });

  it('automates AUDIT command through orchestrator API', async () => {
    const res = await inject('POST', '/api/orchestrator/command', {
      command: 'AUDIT',
      platform: 'claude',
      project: 'M5-Orchestrator-Audit',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.command).toBe('AUDIT');
    expect(body.status.mode).toBe('AUDIT');
    expect(body.platform).toBe('claude');
  });

  it('supports REEVALUATE in resume mode without resetting workflow mode', async () => {
    // Set a known mode first.
    await inject('POST', '/api/orchestrator/command', {
      command: 'AUDIT',
      platform: 'copilot',
      project: 'M5-Orchestrator-Reevaluate',
    });

    const res = await inject('POST', '/api/orchestrator/command', {
      command: 'REEVALUATE',
      platform: 'copilot',
      resume: true,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.command).toBe('REEVALUATE');
    expect(body.resume).toBe(true);
    expect(body.status.mode).toBe('AUDIT');
  });

  it('rejects unknown orchestrator commands with clear error', async () => {
    const res = await inject('POST', '/api/orchestrator/command', {
      command: 'UNKNOWN_MODE',
      platform: 'copilot',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('INTERNAL_ERROR');
    expect(res.json().message).toContain('Unknown command');
  });

  it('rejects unknown orchestrator platforms with clear error', async () => {
    const res = await inject('POST', '/api/orchestrator/command', {
      command: 'CREATE',
      platform: 'some-ai',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('INTERNAL_ERROR');
    expect(res.json().message).toContain('Unknown platform');
  });

  it('validates gate payload requirements and returns structured failure', async () => {
    const res = await inject('POST', '/api/orchestrator/validate-gate', {});
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('INVALID_INPUT');
  });

  it('exposes sprint-gate automation path with structured response', async () => {
    const res = await inject('POST', '/api/orchestrator/sprint-gate', {
      sprintId: 'SP-R2-001',
      stories: [
        { id: 'S1', status: 'DONE' },
        { id: 'S2', status: 'DONE' },
      ],
      plannedItems: 2,
      paths: {},
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(['READY', 'NOT_READY']).toContain(body.verdict);
    expect(body.summary).toBeDefined();
    expect(body.summary.sprintId).toBe('SP-R2-001');
  });
});
