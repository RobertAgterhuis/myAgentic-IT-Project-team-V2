'use strict';

const path = require('path');
const { createTestApp, paths } = require('../helpers/create-test-app');
const { buildApp } = require('../../src/webapp/app');

const { BUSINESS_DOCS, SESSION_FILE, DECISIONS_FILE, HELP_DIR } = paths;

let app;

const Q05_MD = `# Questionnaire: Software Architect

> Phase: Phase 2 | Generated: 2025-01-01 | Version: 1.0

## Section 1: Architecture

### Q-05-001 [REQUIRED]
**Question:** What is the target deployment environment?
**Why we need this:** To determine infrastructure requirements.
**Expected format:** Text description
**Example:** Cloud-based Kubernetes cluster
**Your answer:**
> *(fill in here)*

## Answer Status

| Q-ID | Status | Last Updated |
|------|--------|--------------|
| Q-05-001 | OPEN | — |
`;

const SESSION_STATE = {
  session_id: 'm5-workflow-test-session',
  cycle_type: 'CREATE',
  status: 'ONBOARDING',
  current_phase: 'ONBOARDING',
  current_agent: '25-onboarding-agent',
  initiated_at: '2026-03-19T00:00:00Z',
  last_updated: '2026-03-19T00:00:00Z',
  completed_phases: [],
  completed_agents: [],
  phase_outputs: {},
};

const DECISIONS_MD = `# Decisions & Open Questions

---

## Open Questions (waiting for your answer)

| ID | Priority | Scope | Question | Your answer | Date |
|----|-----------|-------|-------|---------------|-------|

---

## Decided Items (agents act on these)

### Transformation Decisions (DEC-T series)

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------------|-------|

### Reevaluation Decisions (DEC-R2 series)

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------------|-------|

### Operational Decisions

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------------|-------|

---

## Deferred & Expired

| ID | Status | Scope | Subject | Reason | Date |
|----|--------|-------|---------|--------|------|

---

## Audit Trail
`;

function seedFiles() {
  const qPath = path.join(
    BUSINESS_DOCS,
    'Phase2-Tech/Questionnaires/05-software-architect-questionnaire.md'
  );
  const helpPath = path.join(HELP_DIR, 'getting-started.md');
  return {
    [qPath]: Q05_MD,
    [SESSION_FILE]: JSON.stringify(SESSION_STATE),
    [DECISIONS_FILE]: DECISIONS_MD,
    [helpPath]: '# Getting Started\n\nWelcome.',
  };
}

function inject(method, url, payload) {
  const opts = { method, url };
  if (payload !== undefined) {
    opts.payload = payload;
    opts.headers = { 'content-type': 'application/json' };
  }
  return app.inject(opts);
}

describe('M5 Epic #665 workflow automation', () => {
  beforeAll(async () => {
    app = await createTestApp(seedFiles());
  });

  afterAll(async () => {
    await app.close();
  });

  it('automates CREATE workflow command path', async () => {
    const res = await inject('POST', '/api/command', {
      command: 'CREATE',
      project: 'M5CreateProject',
      description: 'Workflow automation acceptance test',
      brief: 'A compact brief for CREATE workflow coverage.',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
    expect(res.json().clipboard_text).toContain('CREATE');
    expect(res.json().brief_saved).toBe(true);

    const read = await inject('GET', '/api/command');
    expect(read.statusCode).toBe(200);
    expect(read.json().command.command).toBe('CREATE');
    expect(read.json().queue).toHaveLength(1);
  });

  it('automates AUDIT workflow command path', async () => {
    const res = await inject('POST', '/api/command', {
      command: 'AUDIT',
      project: 'M5AuditProject',
      scope: 'TECH',
      description: 'Workflow automation audit path test',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
    expect(res.json().clipboard_text).toContain('AUDIT');

    const read = await inject('GET', '/api/command');
    expect(read.statusCode).toBe(200);
    expect(read.json().command.command).toBe('AUDIT');
  });

  it('automates questionnaire + decision lifecycle path', async () => {
    const discover = await inject('GET', '/api/questionnaires');
    expect(discover.statusCode).toBe(200);
    expect(discover.json().questionnaires.length).toBeGreaterThan(0);

    const save = await inject('POST', '/api/save', {
      file: 'Phase2-Tech/Questionnaires/05-software-architect-questionnaire.md',
      updates: [{ questionId: 'Q-05-001', status: 'ANSWERED', answer: 'Node.js 22 on localhost' }],
    });
    expect(save.statusCode).toBe(200);
    expect(save.json().saved).toBe(1);

    const createDecision = await inject('POST', '/api/decisions', {
      action: 'create',
      type: 'OPEN_QUESTION',
      priority: 'MEDIUM',
      scope: 'Phase 5',
      text: 'Should AUDIT include optional UX checks by default?',
    });
    expect(createDecision.statusCode).toBe(200);
    const id = createDecision.json().id;

    const answer = await inject('POST', '/api/decisions', {
      action: 'answer',
      id,
      answer: 'Default to TECH scope and allow UX opt-in',
    });
    expect(answer.statusCode).toBe(200);

    const decide = await inject('POST', '/api/decisions', {
      action: 'decide',
      id,
      answer: 'Approved: TECH default with UX opt-in',
    });
    expect(decide.statusCode).toBe(200);

    const finalState = await inject('GET', '/api/decisions');
    expect(finalState.statusCode).toBe(200);
    expect(finalState.json().open.find((q) => q.id === id)).toBeUndefined();
    expect(finalState.json().decided.find((d) => d.id === id)).toBeDefined();
  }, 15_000);

  it('keeps security regression behavior testable for non-local API access', async () => {
    const originalApiKey = process.env.API_KEY;
    delete process.env.API_KEY;

    const localCtx = {
      HOST: '0.0.0.0',
      PORT: 3000,
      WEBAPP_DIR: path.join(__dirname, '..', '..', 'src', 'webapp'),
      _authMiddleware: null,
      recordMetric() {},
    };

    const securityApp = await buildApp({
      ctx: localCtx,
      disableRequestLogging: true,
      disableRateLimit: true,
      disableSwaggerUi: true,
    });

    securityApp.get('/api/ping', async () => ({ ok: true }));

    const unauthorized = await securityApp.inject({ method: 'GET', url: '/api/ping' });
    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.json().code).toBe('UNAUTHORIZED');

    process.env.API_KEY = 'abcdefghijklmnopqrstuvwxyz123456';
    const authorized = await securityApp.inject({
      method: 'GET',
      url: '/api/ping',
      headers: { 'x-api-key': process.env.API_KEY },
    });
    expect(authorized.statusCode).toBe(200);

    await securityApp.close();

    if (originalApiKey === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = originalApiKey;
  });
});
