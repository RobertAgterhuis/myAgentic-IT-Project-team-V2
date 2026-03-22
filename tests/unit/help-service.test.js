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
      helpDir: '/repo/docs/help',
    });
  }

  it('loads page help from YAML config', () => {
    const service = makeService({
      [path.join('/repo/docs/help', 'page-help.yaml')]:
        `pages:\n  - routeSlug: commands\n    routePath: /commands\n    pageTitle: Commands\n    purpose: Queue work.\n    coreActions:\n      - label: Queue\n        description: Submit work.\n    inputsOutputs: Reads command inputs and writes queue items.\n    permissions: Operator access.\n    relatedPages:\n      - routeSlug: pipeline\n        title: Pipeline\n    keywords: [commands]\n    topicLinks:\n      - topicId: commands\n        title: Commands\n`,
      [path.join('/repo/docs/help', 'commands.md')]: '# Commands\n\nUse CREATE.',
    });

    const page = service.getPageHelp('commands');

    expect(page).toBeTruthy();
    expect(page.routePath).toBe('/commands');
    expect(page.coreActions[0].label).toBe('Queue');
  });

  it('renders markdown topics without raw HTML execution', () => {
    const service = makeService({
      [path.join('/repo/docs/help', 'page-help.yaml')]: 'pages: []\n',
      [path.join('/repo/docs/help', 'commands.md')]:
        '# Commands\n\n<script>alert("x")</script>\n\n[Safe](https://example.com)',
    });

    const topic = service.getTopic('commands');

    expect(topic).toBeTruthy();
    expect(topic.html).toContain('<h1>Commands</h1>');
    expect(topic.html).not.toContain('<script>');
  });

  it('searches across page help and topic content', () => {
    const service = makeService({
      [path.join('/repo/docs/help', 'page-help.yaml')]:
        `pages:\n  - routeSlug: pipeline\n    routePath: /pipeline\n    pageTitle: Pipeline\n    purpose: Monitor gate progress.\n    coreActions:\n      - label: Inspect gates\n        description: Review critic and risk outcomes.\n    inputsOutputs: Reads pipeline data.\n    permissions: Read only.\n    relatedPages: []\n    keywords: [gates, progress]\n    topicLinks:\n      - topicId: pipeline\n        title: Pipeline\n`,
      [path.join('/repo/docs/help', 'pipeline.md')]:
        '# Pipeline\n\nGate results explain why progress is blocked.',
    });

    const results = service.search('gate progress');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toMatch(/Pipeline/);
  });

  it('matches approval and gate queries across configured pages', () => {
    const service = makeService({
      [path.join('/repo/docs/help', 'page-help.yaml')]:
        `pages:\n  - routeSlug: commands\n    routePath: /commands\n    pageTitle: Commands\n    purpose: Queue and run commands.\n    coreActions:\n      - label: Queue\n        description: Submit work.\n    inputsOutputs: Reads command inputs and writes queue state.\n    permissions: Operator access.\n    relatedPages: []\n    keywords: [commands, approvals, governance]\n    topicLinks:\n      - topicId: commands\n        title: Commands\n  - routeSlug: approvals\n    routePath: /approvals\n    pageTitle: Approvals\n    purpose: Review governance approvals.\n    coreActions:\n      - label: Approve\n        description: Approve pending requests.\n    inputsOutputs: Reads and writes approval decisions.\n    permissions: Elevated access.\n    relatedPages: []\n    keywords: [approval, governance]\n    topicLinks:\n      - topicId: quality-gates\n        title: Quality Gates\n  - routeSlug: pipeline\n    routePath: /pipeline\n    pageTitle: Pipeline\n    purpose: Monitor gate outcomes and progress.\n    coreActions:\n      - label: Inspect gates\n        description: Review critic and risk outcomes.\n    inputsOutputs: Reads pipeline state.\n    permissions: Read only.\n    relatedPages: []\n    keywords: [gate, pipeline]\n    topicLinks:\n      - topicId: pipeline\n        title: Pipeline\n  - routeSlug: sessions\n    routePath: /sessions\n    pageTitle: Sessions\n    purpose: Track session state and gate transitions.\n    coreActions:\n      - label: Inspect session\n        description: Review current state.\n    inputsOutputs: Reads session state.\n    permissions: Read only.\n    relatedPages: []\n    keywords: [sessions, gate]\n    topicLinks:\n      - topicId: troubleshooting\n        title: Troubleshooting\n`,
      [path.join('/repo/docs/help', 'commands.md')]:
        '# Commands\n\nApproval workflows can be triggered from command execution.',
      [path.join('/repo/docs/help', 'pipeline.md')]:
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
});
