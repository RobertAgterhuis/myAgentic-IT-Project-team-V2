'use strict';

const path = require('path');
const { InMemoryStore } = require('../../src/webapp/store');
const { FileCache } = require('../../src/webapp/cache');
const { HelpService } = require('../../src/webapp/services/help-service');

describe('help service', () => {
  function makeService(initialFiles) {
    const store = new InMemoryStore(initialFiles);
    return new HelpService({
      store,
      cache: new FileCache(store),
      audit: { log() {}, read: () => [] },
      safeWrite() {},
      projectRoot: '/repo',
      businessDocs: '/repo/BusinessDocs',
      sessionDir: '/repo/BusinessDocs/session',
      decisionsFile: '/repo/BusinessDocs/decisions.md',
      decisionsDir: '/repo/BusinessDocs/decisions',
      commandQueue: '/repo/BusinessDocs/session/command-queue.json',
      helpDir: '/repo/src/webapp/ui/src/help',
    });
  }

  it('loads page help from YAML config', () => {
    const service = makeService({
      [path.join('/repo/src/webapp/ui/src/help', 'page-help.yaml')]:
        `pages:\n  - routeSlug: commands\n    routePath: /commands\n    pageTitle: Commands\n    purpose: Queue work.\n    coreActions:\n      - label: Queue\n        description: Submit work.\n    inputsOutputs: Reads command inputs and writes queue items.\n    permissions: Operator access.\n    relatedPages:\n      - routeSlug: pipeline\n        title: Pipeline\n    keywords: [commands]\n    topicLinks:\n      - topicId: commands\n        title: Commands\n`,
      [path.join('/repo/src/webapp/ui/src/help', 'commands.md')]: '# Commands\n\nUse CREATE.',
    });

    const page = service.getPageHelp('commands');

    expect(page).toBeTruthy();
    expect(page.routePath).toBe('/commands');
    expect(page.coreActions[0].label).toBe('Queue');
  });

  it('renders markdown topics without raw HTML execution', () => {
    const service = makeService({
      [path.join('/repo/src/webapp/ui/src/help', 'page-help.yaml')]: 'pages: []\n',
      [path.join('/repo/src/webapp/ui/src/help', 'commands.md')]:
        '# Commands\n\n<script>alert("x")</script>\n\n[Safe](https://example.com)',
    });

    const topic = service.getTopic('commands');

    expect(topic).toBeTruthy();
    expect(topic.html).toContain('<h1>Commands</h1>');
    expect(topic.html).not.toContain('<script>');
  });

  it('searches across page help and topic content', () => {
    const service = makeService({
      [path.join('/repo/src/webapp/ui/src/help', 'page-help.yaml')]:
        `pages:\n  - routeSlug: pipeline\n    routePath: /pipeline\n    pageTitle: Pipeline\n    purpose: Monitor gate progress.\n    coreActions:\n      - label: Inspect gates\n        description: Review critic and risk outcomes.\n    inputsOutputs: Reads pipeline data.\n    permissions: Read only.\n    relatedPages: []\n    keywords: [gates, progress]\n    topicLinks:\n      - topicId: pipeline\n        title: Pipeline\n`,
      [path.join('/repo/src/webapp/ui/src/help', 'pipeline.md')]:
        '# Pipeline\n\nGate results explain why progress is blocked.',
    });

    const results = service.search('gate progress');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toMatch(/Pipeline/);
  });

  it('matches approval and gate queries across configured pages', () => {
    const service = makeService({
      [path.join('/repo/src/webapp/ui/src/help', 'page-help.yaml')]:
        `pages:\n  - routeSlug: commands\n    routePath: /commands\n    pageTitle: Commands\n    purpose: Queue and run commands.\n    coreActions:\n      - label: Queue\n        description: Submit work.\n    inputsOutputs: Reads command inputs and writes queue state.\n    permissions: Operator access.\n    relatedPages: []\n    keywords: [commands, approvals, governance]\n    topicLinks:\n      - topicId: commands\n        title: Commands\n  - routeSlug: approvals\n    routePath: /approvals\n    pageTitle: Approvals\n    purpose: Review governance approvals.\n    coreActions:\n      - label: Approve\n        description: Approve pending requests.\n    inputsOutputs: Reads and writes approval decisions.\n    permissions: Elevated access.\n    relatedPages: []\n    keywords: [approval, governance]\n    topicLinks:\n      - topicId: quality-gates\n        title: Quality Gates\n  - routeSlug: pipeline\n    routePath: /pipeline\n    pageTitle: Pipeline\n    purpose: Monitor gate outcomes and progress.\n    coreActions:\n      - label: Inspect gates\n        description: Review critic and risk outcomes.\n    inputsOutputs: Reads pipeline state.\n    permissions: Read only.\n    relatedPages: []\n    keywords: [gate, pipeline]\n    topicLinks:\n      - topicId: pipeline\n        title: Pipeline\n  - routeSlug: sessions\n    routePath: /sessions\n    pageTitle: Sessions\n    purpose: Track session state and gate transitions.\n    coreActions:\n      - label: Inspect session\n        description: Review current state.\n    inputsOutputs: Reads session state.\n    permissions: Read only.\n    relatedPages: []\n    keywords: [sessions, gate]\n    topicLinks:\n      - topicId: troubleshooting\n        title: Troubleshooting\n`,
      [path.join('/repo/src/webapp/ui/src/help', 'commands.md')]:
        '# Commands\n\nApproval workflows can be triggered from command execution.',
      [path.join('/repo/src/webapp/ui/src/help', 'pipeline.md')]:
        '# Pipeline\n\nGate results determine release readiness.',
    });

    const approvalResults = service.search('approval');
    const gateResults = service.search('gate');

    expect(
      approvalResults.some((result) => result.kind === 'page' && result.id === 'commands')
    ).toBe(true);
    expect(
      approvalResults.some((result) => result.kind === 'page' && result.id === 'approvals')
    ).toBe(true);
    expect(gateResults.some((result) => result.kind === 'page' && result.id === 'pipeline')).toBe(
      true
    );
    expect(gateResults.some((result) => result.kind === 'page' && result.id === 'sessions')).toBe(
      true
    );
  });

  it('returns only active state variants based on runtime state files', () => {
    const service = makeService({
      [path.join('/repo/src/webapp/ui/src/help', 'page-help.yaml')]:
        `pages:\n  - routeSlug: commands\n    routePath: /commands\n    pageTitle: Commands\n    purpose: Queue work.\n    coreActions: []\n    inputsOutputs: Reads command inputs and writes queue items.\n    permissions: Operator access.\n    relatedPages: []\n    keywords: [commands]\n    topicLinks:\n      - topicId: commands\n        title: Commands\n    stateVariants:\n      - condition: no_active_workspace\n        additionalContent: Select a workspace first.\n      - condition: pending_approvals_gt_0\n        additionalContent: Pending approvals are blocking.\n      - condition: gate_failed\n        additionalContent: A gate failed.\n      - condition: agent_has_error\n        additionalContent: An agent error occurred.\n`,
      [path.join('/repo/src/webapp/ui/src/help', 'commands.md')]: '# Commands\n\nUse CREATE.',
      '/repo/BusinessDocs/session/session-state.json':
        '{"status":"ERROR","state_history":[{"to":"ERROR"}]}',
      '/repo/BusinessDocs/session/governance-state.json':
        '{"approvals":[{"id":"a1","status":"PENDING"}]}',
      '/repo/BusinessDocs/session/run-history.json':
        '[{"status":"FAILED","gate_results":{"G-ARCH-01":{"verdict":"FAILED"}}}]',
      '/repo/BusinessDocs/session/command-queue.json': '[{"command":"CREATE","status":"ERROR"}]',
    });

    const page = service.getPageHelp('commands');

    expect(page).toBeTruthy();
    expect(page.stateVariants).toBeTruthy();
    expect(page.stateVariants).toHaveLength(4);
    expect(page.stateVariants.map((variant) => variant.condition)).toEqual([
      'no_active_workspace',
      'pending_approvals_gt_0',
      'gate_failed',
      'agent_has_error',
    ]);
  });

  it('omits state variants when none of the conditions are active', () => {
    const service = makeService({
      [path.join('/repo/src/webapp/ui/src/help', 'page-help.yaml')]:
        `pages:\n  - routeSlug: commands\n    routePath: /commands\n    pageTitle: Commands\n    purpose: Queue work.\n    coreActions: []\n    inputsOutputs: Reads command inputs and writes queue items.\n    permissions: Operator access.\n    relatedPages: []\n    keywords: [commands]\n    topicLinks:\n      - topicId: commands\n        title: Commands\n    stateVariants:\n      - condition: no_active_workspace\n        additionalContent: Select a workspace first.\n      - condition: pending_approvals_gt_0\n        additionalContent: Pending approvals are blocking.\n`,
      [path.join('/repo/src/webapp/ui/src/help', 'commands.md')]: '# Commands\n\nUse CREATE.',
      '/repo/BusinessDocs/session/session-state.json':
        '{"projectName":"Project X","workspaceId":"ws-01","status":"IN_PROGRESS"}',
      '/repo/BusinessDocs/session/governance-state.json': '{"approvals":[]}',
      '/repo/BusinessDocs/session/run-history.json': '[{"status":"COMPLETED","gate_results":{}}]',
      '/repo/BusinessDocs/session/command-queue.json': '[{"command":"CREATE","status":"DONE"}]',
    });

    const page = service.getPageHelp('commands');

    expect(page).toBeTruthy();
    expect(page.stateVariants).toBeUndefined();
  });

  it('shows commands no_active_workspace variant when workspace is null', () => {
    const service = makeService({
      [path.join('/repo/src/webapp/ui/src/help', 'page-help.yaml')]:
        `pages:\n  - routeSlug: commands\n    routePath: /commands\n    pageTitle: Commands\n    purpose: Queue work.\n    coreActions: []\n    inputsOutputs: Reads command inputs and writes queue items.\n    permissions: Operator access.\n    relatedPages: []\n    keywords: [commands]\n    topicLinks:\n      - topicId: commands\n        title: Commands\n    stateVariants:\n      - condition: no_active_workspace\n        additionalContent: You need an active workspace and project first.\n`,
      [path.join('/repo/src/webapp/ui/src/help', 'commands.md')]: '# Commands\n\nUse CREATE.',
      '/repo/BusinessDocs/session/session-state.json':
        '{"workspaceId":null,"projectName":null,"status":"IDLE"}',
    });

    const page = service.getPageHelp('commands');

    expect(page).toBeTruthy();
    expect(page.stateVariants).toHaveLength(1);
    expect(page.stateVariants[0].condition).toBe('no_active_workspace');
  });

  it('shows pipeline gate_failed variant when current gate status is failed', () => {
    const service = makeService({
      [path.join('/repo/src/webapp/ui/src/help', 'page-help.yaml')]:
        `pages:\n  - routeSlug: pipeline\n    routePath: /pipeline\n    pageTitle: Pipeline\n    purpose: Monitor work.\n    coreActions: []\n    inputsOutputs: Reads pipeline state.\n    permissions: Operator access.\n    relatedPages: []\n    keywords: [pipeline]\n    topicLinks:\n      - topicId: pipeline\n        title: Pipeline\n    stateVariants:\n      - condition: gate_failed\n        additionalContent: Current run blocked at gate. Here is why and what to do.\n`,
      [path.join('/repo/src/webapp/ui/src/help', 'pipeline.md')]: '# Pipeline\n\nTrack gates.',
      '/repo/BusinessDocs/session/run-history.json':
        '[{"status":"FAILED","gate_results":{"G-REQ-01":{"status":"FAILED"}}}]',
    });

    const page = service.getPageHelp('pipeline');

    expect(page).toBeTruthy();
    expect(page.stateVariants).toHaveLength(1);
    expect(page.stateVariants[0].condition).toBe('gate_failed');
  });
});
