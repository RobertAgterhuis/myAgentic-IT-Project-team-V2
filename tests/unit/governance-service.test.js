'use strict';

const path = require('node:path');
const { GovernanceEngine, DEFAULT_POLICIES } = require('../../platform/sdlc/governance');
const { GovernanceService } = require('../../src/webapp/services');

function createStore() {
  const files = new Map();
  return {
    writeFile: (filePath, data) => files.set(filePath, data),
    mkdirp: () => {},
    exists: (filePath) => files.has(filePath),
    readFile: (filePath) => files.get(filePath),
  };
}

function createContext(store) {
  const projectRoot = process.cwd();
  return {
    store,
    cache: {},
    audit: { log: () => {} },
    projectRoot,
    businessDocs: path.join(projectRoot, 'BusinessDocs'),
    sessionDir: path.join(projectRoot, 'BusinessDocs', 'session'),
    decisionsFile: path.join(projectRoot, 'BusinessDocs', 'decisions.md'),
    decisionsDir: path.join(projectRoot, 'BusinessDocs', 'decisions'),
    commandQueue: path.join(projectRoot, 'BusinessDocs', 'session', 'command-queue.json'),
    helpDir: path.join(projectRoot, 'docs', 'help'),
    safeWrite: () => {},
  };
}

function createTimeoutPolicySet() {
  return DEFAULT_POLICIES.map((policy) => {
    if (policy.gate_id === 'G-REL-01') {
      return { ...policy, timeout_hours: 0.000001 };
    }
    return { ...policy };
  });
}

describe('GovernanceService tool execution SLA escalation', () => {
  it('auto-escalates expired tool approval when status is requested', () => {
    const engine = new GovernanceEngine(createTimeoutPolicySet());
    const initial = engine.requestApproval(
      'mcp:agent:prod:delete_resource',
      'RELEASE',
      'G-REL-01',
      'agent'
    );

    // Force timeout deterministically for this test.
    initial.requested_at = new Date(Date.now() - 30_000).toISOString();

    const store = createStore();
    const svc = new GovernanceService(createContext(store), { getEngine: () => engine });

    const status = svc.getToolExecutionApprovalStatus('mcp:agent:prod:delete_resource');

    expect(status.approved).toBe(false);
    expect(status.pending).toBe(true);
    expect(status.status).toBe('PENDING');
    expect(status.approvalId).toBeDefined();
    expect(status.approvalId).not.toBe(initial.id);

    const escalations = engine.getApprovals('mcp:agent:prod:delete_resource', 'G-REL-03');
    expect(escalations).toHaveLength(1);
    expect(escalations[0].status).toBe('PENDING');

    const updatedOriginal = engine.getApprovalById(initial.id);
    expect(updatedOriginal.status).toBe('EXPIRED');
  });

  it('does not create duplicate escalation requests', () => {
    const engine = new GovernanceEngine(createTimeoutPolicySet());
    const initial = engine.requestApproval(
      'mcp:agent:prod:update_config',
      'RELEASE',
      'G-REL-01',
      'agent'
    );
    initial.requested_at = new Date(Date.now() - 30_000).toISOString();

    const store = createStore();
    const svc = new GovernanceService(createContext(store), { getEngine: () => engine });

    const first = svc.getToolExecutionApprovalStatus('mcp:agent:prod:update_config');
    const second = svc.requestToolExecutionApproval({
      entityId: 'mcp:agent:prod:update_config',
      requestedBy: 'agent',
    });

    expect(first.pending).toBe(true);
    expect(second.pending).toBe(true);
    expect(second.approvalId).toBe(first.approvalId);

    const escalations = engine.getApprovals('mcp:agent:prod:update_config', 'G-REL-03');
    expect(escalations).toHaveLength(1);
  });
});
