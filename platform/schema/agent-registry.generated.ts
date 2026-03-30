// Auto-generated from platform/schema/agent-registry.schema.json.
// Do not edit manually.

/**
 * This interface was referenced by `AgentRegistrySchema`'s JSON-Schema
 * via the `definition` "domain".
 */
export type Domain =
  | 'academic'
  | 'design'
  | 'engineering'
  | 'game-development'
  | 'integrations'
  | 'marketing'
  | 'paid-media'
  | 'product'
  | 'project-management'
  | 'sales'
  | 'spatial-computing'
  | 'specialized'
  | 'strategy'
  | 'support'
  | 'testing'
  | 'sdlc';
/**
 * This interface was referenced by `AgentRegistrySchema`'s JSON-Schema
 * via the `definition` "phase".
 */
export type Phase =
  | 'SPRINT_GATE'
  | 'ONBOARDING'
  | 'PHASE_1'
  | 'PHASE_2'
  | 'PHASE_3'
  | 'PHASE_4'
  | 'CRITIC_RISK'
  | 'SYNTHESIS'
  | 'PHASE_5_EXECUTING'
  | 'REEVALUATE'
  | 'FEATURE'
  | 'QUESTIONNAIRE'
  | 'SCOPE_CHANGE'
  | 'ON_DEMAND';
/**
 * This interface was referenced by `AgentRegistrySchema`'s JSON-Schema
 * via the `definition` "timelineEstimate".
 */
export type TimelineEstimate = '<4 hours' | '4-8 hours' | '1-3 days' | '3-5 days' | '>1 week';

export interface AgentRegistrySchema {
  schemaVersion: string;
  source: string;
  generatedAt: string;
  stats: {
    totalAgents: number;
    agencyAgents: number;
    sdlcAgents: number;
    /**
     * @minItems 1
     */
    domains: [Domain, ...Domain[]];
  };
  /**
   * @minItems 1
   */
  agents: [Agent, ...Agent[]];
}
/**
 * This interface was referenced by `AgentRegistrySchema`'s JSON-Schema
 * via the `definition` "agent".
 */
export interface Agent {
  id: string;
  legacyId: string | null;
  agentType: 'agency' | 'sdlc';
  name: string;
  description: string;
  /**
   * @minItems 1
   */
  domain: [Domain, ...Domain[]];
  color: string | null;
  emoji: string | null;
  vibe: string | null;
  /**
   * @minItems 1
   */
  capabilities: [string, ...string[]];
  /**
   * @minItems 1
   */
  inputs: [string, ...string[]];
  /**
   * @minItems 1
   */
  outputs: [string, ...string[]];
  minPrerequisites: string[];
  optionalInputs: string[];
  skillPath: string;
  requiredTools: string[];
  phase: Phase | null;
  gatekeeper: boolean;
  gateMembership: string[];
  sequenceDependencies: string[];
  maxRetries: number;
  timelineEstimate: TimelineEstimate;
  successRate: number;
  avgQualityScore: number;
  commonFailures: string[];
  worksWith: string[];
  conflictsWith: string[];
  successPatterns: string[];
  lastUpdated: string;
  /**
   * @minItems 1
   */
  sourceFiles: [string, ...string[]];
}
