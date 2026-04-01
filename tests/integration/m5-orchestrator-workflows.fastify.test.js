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

  it('hands off queued CREATE command to orchestrator while preserving queue visibility', async () => {
    const queued = await inject('POST', '/api/command', {
      command: 'CREATE',
      project: 'M5-Handoff-Create',
      description: 'Queue to orchestrator handoff test',
    });
    expect(queued.statusCode).toBe(200);
    expect(queued.json().ok).toBe(true);

    const queueBefore = await inject('GET', '/api/command');
    expect(queueBefore.statusCode).toBe(200);
    expect(queueBefore.json().queue.length).toBeGreaterThan(0);
    expect(queueBefore.json().command.command).toBe('CREATE');
    expect(queueBefore.json().command.status).toBe('PENDING');

    const handoff = await inject('POST', '/api/orchestrator/command', {
      command: 'CREATE',
      platform: 'copilot',
      project: 'M5-Handoff-Create',
    });
    expect(handoff.statusCode).toBe(200);
    expect(handoff.json().ok).toBe(true);
    expect(handoff.json().status.mode).toBe('CREATE');

    const progress = await inject('GET', '/api/progress');
    expect(progress.statusCode).toBe(200);
    expect(progress.json().command).toBeDefined();
    expect(progress.json().command.command).toBe('CREATE');

    const exported = await inject('GET', '/api/export');
    expect(exported.statusCode).toBe(200);
    expect(Array.isArray(exported.json().command_queue)).toBe(true);
    expect(exported.json().command_queue.length).toBeGreaterThan(0);
  });

  it('hands off queued AUDIT command to orchestrator with matching mode and queue record', async () => {
    const queued = await inject('POST', '/api/command', {
      command: 'AUDIT',
      project: 'M5-Handoff-Audit',
      description: 'Queue to orchestrator handoff test for audit',
    });
    expect(queued.statusCode).toBe(200);

    const handoff = await inject('POST', '/api/orchestrator/command', {
      command: 'AUDIT',
      platform: 'claude',
      project: 'M5-Handoff-Audit',
    });
    expect(handoff.statusCode).toBe(200);
    expect(handoff.json().status.mode).toBe('AUDIT');

    const queueAfter = await inject('GET', '/api/command');
    expect(queueAfter.statusCode).toBe(200);
    expect(queueAfter.json().command.command).toBe('AUDIT');
    expect(queueAfter.json().command.status).toBe('PENDING');
  });

  it('automates state transitions across status, advance, error, recover, and reset', async () => {
    await inject('POST', '/api/orchestrator/command', {
      command: 'CREATE',
      platform: 'copilot',
      project: 'M5-Orchestrator-Transitions',
    });

    const initial = await inject('GET', '/api/orchestrator/status');
    expect(initial.statusCode).toBe(200);
    expect(initial.json().state).toBe('IDLE');
    expect(initial.json().mode).toBe('CREATE');

    // Ensure persisted human override state from prior runs does not block advance.
    const resume = await inject('POST', '/api/orchestrator/resume', {
      rationale: 'integration-test-reset',
    });
    expect([200, 409]).toContain(resume.statusCode);

    const advanced = await inject('POST', '/api/orchestrator/advance', {});
    expect(advanced.statusCode).toBe(200);
    expect(advanced.json().ok).toBe(true);
    expect(advanced.json().status.state).not.toBe('IDLE');

    const errored = await inject('POST', '/api/orchestrator/error', {
      reason: 'forced by integration test',
    });
    expect(errored.statusCode).toBe(200);
    expect(errored.json().ok).toBe(true);
    expect(errored.json().status.state).toBe('ERROR');

    const recovered = await inject('POST', '/api/orchestrator/recover');
    expect(recovered.statusCode).toBe(200);
    expect(recovered.json().ok).toBe(true);
    expect(recovered.json().status.state).not.toBe('ERROR');

    const reset = await inject('POST', '/api/orchestrator/reset', {
      mode: 'AUDIT',
      phases: ['ONBOARDING', 'PHASE_2'],
    });
    expect(reset.statusCode).toBe(200);
    expect(reset.json().ok).toBe(true);
    expect(reset.json().status.mode).toBe('AUDIT');
  });

  it('exposes orchestrator dependency health with SLO and alert fields', async () => {
    const res = await inject('GET', '/api/orchestrator/dependencies/health');

    expect([200, 503]).toContain(res.statusCode);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(['healthy', 'degraded', 'unavailable']).toContain(body.overall_status);

    expect(body.dependencies).toBeDefined();
    expect(body.dependencies.state_machine).toBeDefined();
    expect(body.dependencies.dispatcher).toBeDefined();
    expect(body.dependencies.policy_service).toBeDefined();
    expect(['healthy', 'degraded', 'unavailable']).toContain(
      body.dependencies.state_machine.status
    );
    expect(['healthy', 'degraded', 'unavailable']).toContain(body.dependencies.dispatcher.status);
    expect(['healthy', 'degraded', 'unavailable']).toContain(
      body.dependencies.policy_service.status
    );

    expect(body.slos).toBeDefined();
    expect(body.slos.targets).toBeDefined();
    expect(body.slos.observed).toBeDefined();
    expect(Array.isArray(body.slos.alerts)).toBe(true);
    expect(body.slos.targets.unavailable_dependencies_max).toBe(0);
    expect(body.slos.targets.degraded_dependencies_max).toBe(0);
    expect(body.slos.targets.dependency_probe_latency_ms_max).toBe(500);
    expect(typeof body.slos.observed.unavailable_dependencies).toBe('number');
    expect(typeof body.slos.observed.degraded_dependencies).toBe('number');
    expect(typeof body.slos.observed.dependency_probe_latency_ms).toBe('number');
  });

  it('exposes active pack metadata for commands, stages, gates, labels, help, and capabilities', async () => {
    const res = await inject('GET', '/api/orchestrator/pack-metadata');

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.pack).toBeDefined();
    expect(body.pack.id).toBeTruthy();
    expect(Array.isArray(body.commands)).toBe(true);
    expect(Array.isArray(body.stages)).toBe(true);
    expect(Array.isArray(body.gates)).toBe(true);
    expect(body.labels).toBeDefined();
    expect(body.labels.commands).toBeDefined();
    expect(body.labels.stages).toBeDefined();
    expect(body.labels.gates).toBeDefined();
    expect(Array.isArray(body.help_topics)).toBe(true);
    expect(body.capabilities).toBeDefined();
    expect(typeof body.capabilities.supportsCommandCatalog).toBe('boolean');
    expect(Array.isArray(body.capabilities.parallelDispatchStates)).toBe(true);
  });

  it('supports cross-pack switching via active-pack API without kernel changes', async () => {
    const switchToOps = await inject('POST', '/api/orchestrator/active-pack', {
      template: 'ops-command-center',
    });
    expect(switchToOps.statusCode).toBe(200);
    expect(switchToOps.json().active_template).toBe('ops-command-center');

    const opsCommand = await inject('POST', '/api/orchestrator/command', {
      command: 'TRIAGE',
      platform: 'copilot',
      project: 'M5-CrossPack-Ops',
    });
    expect(opsCommand.statusCode).toBe(200);
    expect(opsCommand.json().status.mode).toBe('TRIAGE');

    const switchToSdlc = await inject('POST', '/api/orchestrator/active-pack', {
      template: 'sdlc',
    });
    expect(switchToSdlc.statusCode).toBe(200);
    expect(switchToSdlc.json().active_template).toBe('sdlc');

    const sdlcCommand = await inject('POST', '/api/orchestrator/command', {
      command: 'AUDIT',
      platform: 'copilot',
      project: 'M5-CrossPack-SDLC',
    });
    expect(sdlcCommand.statusCode).toBe(200);
    expect(sdlcCommand.json().status.mode).toBe('AUDIT');
  });

  it('exposes stop + run-history paths for automation observability', async () => {
    await inject('POST', '/api/orchestrator/command', {
      command: 'CREATE',
      platform: 'copilot',
      project: 'M5-Orchestrator-Stop',
    });
    await inject('POST', '/api/orchestrator/advance', {});

    const stop = await inject('POST', '/api/orchestrator/stop');
    expect(stop.statusCode).toBe(200);
    expect(stop.json().ok).toBe(true);
    expect(stop.json().stopped).toBe(true);
    expect(stop.json().status.state).toBe('ERROR');

    const history = await inject('GET', '/api/orchestrator/run-history');
    expect(history.statusCode).toBe(200);
    expect(history.json().ok).toBe(true);
    expect(Array.isArray(history.json().runs)).toBe(true);
  });

  it('rejects recover when engine is not in error state', async () => {
    await inject('POST', '/api/orchestrator/reset', {
      mode: 'CREATE',
    });

    const res = await inject('POST', '/api/orchestrator/recover');
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('INTERNAL_ERROR');
    expect(res.json().message).toContain('Can only recover from ERROR state');
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
