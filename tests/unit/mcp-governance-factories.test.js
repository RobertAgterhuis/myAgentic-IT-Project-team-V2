'use strict';

const {
  defineAgents,
  defineMcpServers,
  definePolicies,
  defineEnvironmentPolicies,
  defineToolPolicies,
} = require('../../src/webapp/plugins/mcp-governance/factories');

describe('mcp-governance factories', () => {
  it('instantiates all four factory outputs without side effects', () => {
    const agents = defineAgents([
      {
        id: 'orchestrator',
        category: 'orchestration',
        controlPosture: 'strict',
        requiresWorkloadIdentity: true,
        appRegistrationRef: 'entra://orchestrator',
        templateCategory: 'governance',
      },
    ]);

    const servers = defineMcpServers([
      {
        id: 'workspace-management',
        endpoint: 'https://example.test/health',
        risk: 'medium',
        authType: 'oauth',
        healthStatus: 'healthy',
        tenantEnabled: true,
        workspaceEnabled: {},
        lastHealthCheck: null,
        consecutiveFailures: 0,
      },
    ]);

    const policies = definePolicies([
      {
        agentId: 'orchestrator',
        serverId: 'workspace-management',
        permission: 'R',
      },
    ]);

    const envPolicies = defineEnvironmentPolicies([
      { env: 'dev', defaultPermission: 'W', writeRequiresApproval: false },
    ]);

    const toolPolicies = defineToolPolicies([
      {
        agentId: 'orchestrator',
        serverId: 'workspace-management',
        toolId: 'workspace-management.default',
        overrideMode: 'set',
        permission: 'R',
      },
    ]);

    expect(agents).toHaveLength(1);
    expect(servers).toHaveLength(1);
    expect(policies).toHaveLength(1);
    expect(envPolicies).toHaveLength(1);
    expect(toolPolicies).toHaveLength(1);
  });

  it('returns cloned arrays so callers cannot mutate source objects', () => {
    const input = [
      {
        id: 'a',
        category: 'operations',
        controlPosture: 'strict',
        requiresWorkloadIdentity: true,
        appRegistrationRef: null,
        templateCategory: 'runtime',
      },
    ];

    const output = defineAgents(input);
    output[0].id = 'changed';
    expect(input[0].id).toBe('a');
  });
});
