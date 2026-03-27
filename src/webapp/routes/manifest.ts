// Copyright (c) 2026 Robert Agterhuis. MIT License.

import type { FastifyInstance } from 'fastify';
import type { ServerContext } from '../context';

import { registerRoutes as registerQuestionnaireRoutes } from './questionnaires';
import { registerRoutes as registerDecisionRoutes } from './decisions';
import { registerRoutes as registerCommandRoutes } from './commands';
import { registerRoutes as registerProgressRoutes } from './progress';
import { registerRoutes as registerDriftRoutes } from './drift';
import { registerRoutes as registerMetricsDashboardRoutes } from './metrics-dashboard';
import { registerRoutes as registerDashboardRoutes } from './dashboard';
import { registerRoutes as registerMilestonesRoutes } from './milestones';
import { registerRoutes as registerSubscribeRoutes } from './subscribe';
import { registerRoutes as registerOrchestratorRoutes } from './orchestrator';
import { registerRoutes as registerApprovalRoutes } from './approvals';
import { registerRoutes as registerPolicyRoutes } from './policies';
import { registerRoutes as registerArtifactRoutes } from './artifacts';
import { registerRoutes as registerAnalyticsRoutes } from './analytics';
import { registerRoutes as registerSessionRoutes } from './sessions';
import { registerRoutes as registerAgentRoutes } from './agents';
import { registerRoutes as registerWorkspaceRoutes } from './workspaces';
import { registerRoutes as registerCockpitRoutes } from './cockpit';
import { registerRoutes as registerAuthRoutes } from './auth';
import { registerRoutes as registerMcpRoutes } from './mcp';
import { registerRoutes as registerMcpExperienceRoutes } from './mcp-experience';
import { registerRoutes as registerIdentityRoutes } from './identity';
import { registerRoutes as registerHelpRoutes } from './help';
import { registerRoutes as registerRagRoutes } from './rag';
import { registerRoutes as registerChatRoutes } from './chat';
import { registerRoutes as registerGitRoutes } from './git';
import { registerRoutes as registerReasoningCollaborationRoutes } from './reasoning-collaboration';
import { registerRoutes as registerMiscRoutes } from './misc';

export type RouteRegistrar = (app: FastifyInstance, ctx: ServerContext) => Promise<void> | void;

export interface RouteManifestEntry {
  id: string;
  register: RouteRegistrar;
}

export const ROUTE_REGISTRATION_MANIFEST: RouteManifestEntry[] = [
  { id: 'commands', register: registerCommandRoutes },
  { id: 'orchestrator', register: registerOrchestratorRoutes },
  { id: 'questionnaires', register: registerQuestionnaireRoutes },
  { id: 'decisions', register: registerDecisionRoutes },
  { id: 'progress', register: registerProgressRoutes },
  { id: 'drift', register: registerDriftRoutes },
  { id: 'metrics-dashboard', register: registerMetricsDashboardRoutes },
  { id: 'dashboard', register: registerDashboardRoutes },
  { id: 'milestones', register: registerMilestonesRoutes },
  { id: 'subscribe', register: registerSubscribeRoutes },
  { id: 'approvals', register: registerApprovalRoutes },
  { id: 'policies', register: registerPolicyRoutes },
  { id: 'artifacts', register: registerArtifactRoutes },
  { id: 'analytics', register: registerAnalyticsRoutes },
  { id: 'sessions', register: registerSessionRoutes },
  { id: 'agents', register: registerAgentRoutes },
  { id: 'workspaces', register: registerWorkspaceRoutes },
  { id: 'cockpit', register: registerCockpitRoutes },
  { id: 'auth', register: registerAuthRoutes },
  { id: 'mcp', register: registerMcpRoutes },
  { id: 'mcp-experience', register: registerMcpExperienceRoutes },
  { id: 'identity', register: registerIdentityRoutes },
  { id: 'help', register: registerHelpRoutes },
  { id: 'rag', register: registerRagRoutes },
  { id: 'chat', register: registerChatRoutes },
  { id: 'git', register: registerGitRoutes },
  { id: 'reasoning-collaboration', register: registerReasoningCollaborationRoutes },
  { id: 'misc', register: registerMiscRoutes },
];

export async function registerRoutesFromManifest(
  app: FastifyInstance,
  ctx: ServerContext,
  manifest: RouteManifestEntry[] = ROUTE_REGISTRATION_MANIFEST
): Promise<void> {
  for (const entry of manifest) {
    await entry.register(app, ctx);
  }
}
