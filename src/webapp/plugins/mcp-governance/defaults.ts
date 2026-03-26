// Copyright (c) 2026 Robert Agterhuis. MIT License.

import {
  defineAgents,
  defineEnvironmentPolicies,
  defineMcpServers,
  definePolicies,
  defineToolPolicies,
} from './factories';
import type {
  AgentToolPolicy,
  AgentType,
  AgentServerPolicy,
  EnvironmentPolicy,
  McpServerRegistry,
  PermissionLevel,
} from './types';

export const DEFAULT_AGENTS: AgentType[] = defineAgents([
  {
    id: 'orchestrator',
    category: 'orchestration',
    controlPosture: 'strict',
    requiresWorkloadIdentity: true,
    appRegistrationRef: 'entra://agents/orchestrator',
    templateCategory: 'governance',
  },
  {
    id: 'product',
    category: 'product',
    controlPosture: 'balanced',
    requiresWorkloadIdentity: true,
    appRegistrationRef: 'entra://agents/product',
    templateCategory: 'phase',
  },
  {
    id: 'architect',
    category: 'architecture',
    controlPosture: 'strict',
    requiresWorkloadIdentity: true,
    appRegistrationRef: 'entra://agents/architect',
    templateCategory: 'phase',
  },
  {
    id: 'developer',
    category: 'engineering',
    controlPosture: 'balanced',
    requiresWorkloadIdentity: true,
    appRegistrationRef: 'entra://agents/developer',
    templateCategory: 'phase',
  },
  {
    id: 'ui',
    category: 'engineering',
    controlPosture: 'balanced',
    requiresWorkloadIdentity: true,
    appRegistrationRef: 'entra://agents/ui',
    templateCategory: 'phase',
  },
  {
    id: 'qa',
    category: 'quality',
    controlPosture: 'strict',
    requiresWorkloadIdentity: true,
    appRegistrationRef: 'entra://agents/qa',
    templateCategory: 'phase',
  },
  {
    id: 'devops',
    category: 'operations',
    controlPosture: 'strict',
    requiresWorkloadIdentity: true,
    appRegistrationRef: 'entra://agents/devops',
    templateCategory: 'runtime',
  },
  {
    id: 'infra',
    category: 'operations',
    controlPosture: 'strict',
    requiresWorkloadIdentity: true,
    appRegistrationRef: 'entra://agents/infra',
    templateCategory: 'runtime',
  },
  {
    id: 'security',
    category: 'security',
    controlPosture: 'strict',
    requiresWorkloadIdentity: true,
    appRegistrationRef: 'entra://agents/security',
    templateCategory: 'cross-functional',
  },
  {
    id: 'data',
    category: 'data',
    controlPosture: 'balanced',
    requiresWorkloadIdentity: true,
    appRegistrationRef: 'entra://agents/data',
    templateCategory: 'cross-functional',
  },
  {
    id: 'documentation',
    category: 'documentation',
    controlPosture: 'permissive',
    requiresWorkloadIdentity: false,
    appRegistrationRef: null,
    templateCategory: 'cross-functional',
  },
  {
    id: 'sre',
    category: 'reliability',
    controlPosture: 'strict',
    requiresWorkloadIdentity: true,
    appRegistrationRef: 'entra://agents/sre',
    templateCategory: 'runtime',
  },
]);

export const DEFAULT_SERVERS: McpServerRegistry[] = defineMcpServers([
  {
    id: 'workspace-management',
    endpoint: 'http://127.0.0.1:3000/api/health',
    risk: 'medium',
    authType: 'oauth',
    healthStatus: 'healthy',
    tenantEnabled: true,
    workspaceEnabled: {},
    lastHealthCheck: null,
    consecutiveFailures: 0,
  },
  {
    id: 'questionnaire-management',
    endpoint: 'http://127.0.0.1:3000/api/health',
    risk: 'medium',
    authType: 'oauth',
    healthStatus: 'healthy',
    tenantEnabled: true,
    workspaceEnabled: {},
    lastHealthCheck: null,
    consecutiveFailures: 0,
  },
  {
    id: 'decision-management',
    endpoint: 'http://127.0.0.1:3000/api/health',
    risk: 'medium',
    authType: 'oauth',
    healthStatus: 'healthy',
    tenantEnabled: true,
    workspaceEnabled: {},
    lastHealthCheck: null,
    consecutiveFailures: 0,
  },
  {
    id: 'project-progress',
    endpoint: 'http://127.0.0.1:3000/api/health',
    risk: 'low',
    authType: 'oauth',
    healthStatus: 'healthy',
    tenantEnabled: true,
    workspaceEnabled: {},
    lastHealthCheck: null,
    consecutiveFailures: 0,
  },
  {
    id: 'github-repository',
    endpoint: 'http://127.0.0.1:3000/api/health',
    risk: 'medium',
    authType: 'oauth',
    healthStatus: 'healthy',
    tenantEnabled: true,
    workspaceEnabled: {},
    lastHealthCheck: null,
    consecutiveFailures: 0,
  },
  {
    id: 'pull-request-management',
    endpoint: 'http://127.0.0.1:3000/api/health',
    risk: 'medium',
    authType: 'oauth',
    healthStatus: 'healthy',
    tenantEnabled: true,
    workspaceEnabled: {},
    lastHealthCheck: null,
    consecutiveFailures: 0,
  },
  {
    id: 'governance-approval',
    endpoint: 'http://127.0.0.1:3000/api/health',
    risk: 'high',
    authType: 'entra',
    healthStatus: 'healthy',
    tenantEnabled: true,
    workspaceEnabled: {},
    lastHealthCheck: null,
    consecutiveFailures: 0,
  },
  {
    id: 'azure-management',
    endpoint: 'http://127.0.0.1:3000/api/health',
    risk: 'high',
    authType: 'entra',
    healthStatus: 'healthy',
    tenantEnabled: true,
    workspaceEnabled: {},
    lastHealthCheck: null,
    consecutiveFailures: 0,
  },
]);

const BASE_SERVER_PERMISSIONS: Record<string, PermissionLevel> = {
  'workspace-management': 'R',
  'questionnaire-management': 'R',
  'decision-management': 'R',
  'project-progress': 'R',
  'github-repository': 'R',
  'pull-request-management': 'R',
  'governance-approval': 'N',
  'azure-management': 'N',
};

function buildDefaultPolicies(): AgentServerPolicy[] {
  const map = new Map<string, AgentServerPolicy>();

  for (const agent of DEFAULT_AGENTS) {
    for (const server of DEFAULT_SERVERS) {
      const permission = BASE_SERVER_PERMISSIONS[server.id] || 'N';
      map.set(`${agent.id}:${server.id}`, {
        agentId: agent.id,
        serverId: server.id,
        permission,
      });
    }
  }

  const set = (agentId: string, serverId: string, permission: PermissionLevel) => {
    map.set(`${agentId}:${serverId}`, { agentId, serverId, permission });
  };

  // Orchestration and governance lanes
  set('orchestrator', 'workspace-management', 'W');
  set('orchestrator', 'questionnaire-management', 'P');
  set('orchestrator', 'decision-management', 'P');
  set('orchestrator', 'github-repository', 'P');
  set('orchestrator', 'project-progress', 'W');
  set('orchestrator', 'pull-request-management', 'P');
  set('orchestrator', 'governance-approval', 'P');

  set('product', 'workspace-management', 'P');
  set('product', 'decision-management', 'P');
  set('product', 'questionnaire-management', 'P');
  set('product', 'github-repository', 'P');
  set('product', 'project-progress', 'P');
  set('product', 'pull-request-management', 'P');
  set('product', 'governance-approval', 'P');

  // Engineering lanes
  set('developer', 'workspace-management', 'P');
  set('developer', 'github-repository', 'W');
  set('developer', 'project-progress', 'P');
  set('developer', 'pull-request-management', 'W');

  set('ui', 'workspace-management', 'P');
  set('ui', 'questionnaire-management', 'P');
  set('ui', 'github-repository', 'W');
  set('ui', 'project-progress', 'P');
  set('ui', 'pull-request-management', 'P');

  set('qa', 'workspace-management', 'P');
  set('qa', 'questionnaire-management', 'P');
  set('qa', 'decision-management', 'P');
  set('qa', 'github-repository', 'P');
  set('qa', 'pull-request-management', 'P');
  set('qa', 'project-progress', 'P');

  // Operations and reliability
  set('devops', 'workspace-management', 'W');
  set('devops', 'github-repository', 'P');
  set('devops', 'project-progress', 'W');
  set('devops', 'pull-request-management', 'W');
  set('devops', 'governance-approval', 'A');
  set('devops', 'azure-management', 'W');

  set('infra', 'workspace-management', 'W');
  set('infra', 'project-progress', 'P');
  set('infra', 'pull-request-management', 'P');
  set('infra', 'azure-management', 'A');
  set('infra', 'governance-approval', 'P');

  set('sre', 'workspace-management', 'W');
  set('sre', 'project-progress', 'W');
  set('sre', 'pull-request-management', 'P');
  set('sre', 'azure-management', 'W');
  set('sre', 'governance-approval', 'P');

  // Security and architecture
  set('security', 'decision-management', 'P');
  set('security', 'github-repository', 'P');
  set('security', 'pull-request-management', 'P');
  set('security', 'governance-approval', 'W');
  set('security', 'azure-management', 'P');

  set('architect', 'workspace-management', 'P');
  set('architect', 'decision-management', 'P');
  set('architect', 'github-repository', 'P');
  set('architect', 'project-progress', 'P');
  set('architect', 'pull-request-management', 'P');
  set('architect', 'governance-approval', 'P');
  set('architect', 'azure-management', 'P');

  // Data and documentation
  set('data', 'workspace-management', 'P');
  set('data', 'questionnaire-management', 'P');
  set('data', 'decision-management', 'P');
  set('data', 'azure-management', 'R');
  set('data', 'project-progress', 'P');

  set('documentation', 'workspace-management', 'P');
  set('documentation', 'questionnaire-management', 'W');
  set('documentation', 'decision-management', 'P');
  set('documentation', 'github-repository', 'W');
  set('documentation', 'project-progress', 'P');
  set('documentation', 'pull-request-management', 'P');

  return Array.from(map.values());
}

export const DEFAULT_POLICIES: AgentServerPolicy[] = definePolicies(buildDefaultPolicies());

export const DEFAULT_ENVIRONMENT_POLICIES: EnvironmentPolicy[] = defineEnvironmentPolicies([
  {
    env: 'dev',
    defaultPermission: 'W',
    writeRequiresApproval: false,
  },
  {
    env: 'test',
    defaultPermission: 'W',
    writeRequiresApproval: false,
  },
  {
    env: 'prod',
    defaultPermission: 'R',
    writeRequiresApproval: true,
  },
]);

export const DEFAULT_TOOL_POLICIES: AgentToolPolicy[] = defineToolPolicies([
  {
    agentId: 'orchestrator',
    serverId: 'governance-approval',
    toolId: 'governance-approval.approve_request',
    overrideMode: 'set',
    permission: 'A',
    approvalRequired: true,
    blocked: false,
    envScope: 'prod',
  },
  {
    agentId: 'documentation',
    serverId: 'workspace-management',
    toolId: 'workspace-management.delete_workspace',
    overrideMode: 'deny',
    blocked: true,
  },
]);
