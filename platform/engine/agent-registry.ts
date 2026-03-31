import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

export const REGISTRY_SCHEMA_PATH = path.resolve(
  __dirname,
  '..',
  'schema',
  'agent-registry.schema.json'
);
export const REGISTRY_PATH = path.resolve(__dirname, '..', 'schema', 'agent-registry.json');

export const KNOWN_AGENT_DOMAINS = Object.freeze([
  'academic',
  'design',
  'engineering',
  'game-development',
  'integrations',
  'marketing',
  'paid-media',
  'product',
  'project-management',
  'sales',
  'spatial-computing',
  'specialized',
  'strategy',
  'support',
  'testing',
  'sdlc',
] as const);

export type AgentDomain = (typeof KNOWN_AGENT_DOMAINS)[number];
export type AgentType = 'agency' | 'sdlc';
export type AgentTimelineEstimate = '<4 hours' | '4-8 hours' | '1-3 days' | '3-5 days' | '>1 week';
export type AgentPhase =
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

export interface AgentRegistryEntry {
  id: string;
  legacyId: string | null;
  agentType: AgentType;
  name: string;
  description: string;
  domain: AgentDomain[];
  color: string | null;
  emoji: string | null;
  vibe: string | null;
  capabilities: string[];
  inputs: string[];
  outputs: string[];
  minPrerequisites: string[];
  optionalInputs: string[];
  skillPath: string;
  requiredTools: string[];
  phase: AgentPhase | null;
  gatekeeper: boolean;
  gateMembership: string[];
  sequenceDependencies: string[];
  maxRetries: number;
  timelineEstimate: AgentTimelineEstimate;
  successRate: number;
  avgQualityScore: number;
  commonFailures: string[];
  worksWith: string[];
  conflictsWith: string[];
  successPatterns: string[];
  lastUpdated: string;
  sourceFiles: string[];
}

export interface AgentRegistryDocument {
  schemaVersion: string;
  source: string;
  generatedAt: string;
  stats: {
    totalAgents: number;
    agencyAgents: number;
    sdlcAgents: number;
    domains: AgentDomain[];
  };
  agents: AgentRegistryEntry[];
}

export interface AgentQuery {
  domain?: AgentDomain[];
  capability?: string[];
  timeline?: AgentTimelineEstimate;
  minSuccessRate?: number;
  agentType?: AgentType;
  phase?: AgentPhase;
  sortBy?: 'name' | 'success_rate' | 'recency';
  limit?: number;
}

export interface RegistryMetadataUpdate {
  agentId: string;
  successRateDelta?: number;
  avgQualityScoreDelta?: number;
  addSuccessPatterns?: string[];
  reason: string;
}

export interface QuarterlyOptimizationCycle {
  cycleId: string;
  cadence: 'quarterly';
  generatedAt: string;
  targetQuarter: string;
  reviewDate: string;
  reviewedAgents: number;
  updates: RegistryMetadataUpdate[];
  summary: {
    updatedAgents: number;
    avgSuccessRateDelta: number;
    avgQualityDelta: number;
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function loadAgentRegistry(filePath = REGISTRY_PATH): AgentRegistryDocument {
  return readJson<AgentRegistryDocument>(filePath);
}

export function validateAgentRegistry(
  options: { schemaPath?: string; registryPath?: string } = {}
) {
  const schemaPath = options.schemaPath || REGISTRY_SCHEMA_PATH;
  const registryPath = options.registryPath || REGISTRY_PATH;

  const schema = readJson<Record<string, unknown>>(schemaPath);
  const data = readJson<Record<string, unknown>>(registryPath);
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(data);

  return {
    valid,
    errors: validate.errors || [],
    schemaPath,
    registryPath,
    agentCount: Array.isArray(data.agents) ? data.agents.length : 0,
  };
}

export function getAgent(
  id: string,
  registry = loadAgentRegistry()
): AgentRegistryEntry | undefined {
  return registry.agents.find((agent) => agent.id === id || agent.legacyId === id);
}

export function queryAgents(
  query: AgentQuery = {},
  registry = loadAgentRegistry()
): AgentRegistryEntry[] {
  const normalizedCapabilities = (query.capability || []).map((value) => value.toLowerCase());
  const normalizedDomains = new Set(query.domain || []);

  let agents = registry.agents.filter((agent) => {
    if (normalizedDomains.size > 0 && !agent.domain.some((value) => normalizedDomains.has(value))) {
      return false;
    }

    if (
      normalizedCapabilities.length > 0 &&
      !normalizedCapabilities.every((capability) =>
        agent.capabilities.some((value) => value.toLowerCase().includes(capability))
      )
    ) {
      return false;
    }

    if (query.timeline && agent.timelineEstimate !== query.timeline) {
      return false;
    }

    if (typeof query.minSuccessRate === 'number' && agent.successRate < query.minSuccessRate) {
      return false;
    }

    if (query.agentType && agent.agentType !== query.agentType) {
      return false;
    }

    if (query.phase && agent.phase !== query.phase) {
      return false;
    }

    return true;
  });

  const sortBy = query.sortBy || 'name';
  agents = [...agents].sort((left, right) => {
    if (sortBy === 'success_rate') {
      return right.successRate - left.successRate || left.name.localeCompare(right.name);
    }

    if (sortBy === 'recency') {
      return (
        right.lastUpdated.localeCompare(left.lastUpdated) || left.name.localeCompare(right.name)
      );
    }

    return left.name.localeCompare(right.name);
  });

  const limit = query.limit && query.limit > 0 ? query.limit : 20;
  return agents.slice(0, limit);
}

export function findComplementaryAgents(
  agentId: string,
  registry = loadAgentRegistry()
): AgentRegistryEntry[] {
  const agent = getAgent(agentId, registry);
  if (!agent) {
    return [];
  }

  const relatedIds = new Set(agent.worksWith);
  return registry.agents.filter((candidate) => relatedIds.has(candidate.id));
}

export function getNextQuarterlyReviewDate(fromDate = new Date()): string {
  const year = fromDate.getUTCFullYear();
  const month = fromDate.getUTCMonth();

  const quarterStarts = [0, 3, 6, 9];
  const nextQuarterMonth = quarterStarts.find((value) => value > month);

  const reviewYear = nextQuarterMonth === undefined ? year + 1 : year;
  const reviewMonth = nextQuarterMonth === undefined ? 0 : nextQuarterMonth;
  return new Date(Date.UTC(reviewYear, reviewMonth, 1, 0, 0, 0)).toISOString();
}

function formatQuarterKey(date: Date): string {
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `Q${quarter}-${date.getUTCFullYear()}`;
}

function clampPercentage(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Number(value.toFixed(2));
}

export function buildQuarterlyOptimizationCycle(
  updates: RegistryMetadataUpdate[],
  options: { generatedAt?: string; reviewDate?: string; reviewedAgents?: number } = {}
): QuarterlyOptimizationCycle {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const generatedAtDate = new Date(generatedAt);
  const reviewDate = options.reviewDate || getNextQuarterlyReviewDate(generatedAtDate);
  const reviewedAgents = options.reviewedAgents ?? updates.length;

  const successRateDeltas = updates
    .map((update) => update.successRateDelta)
    .filter((delta): delta is number => typeof delta === 'number');
  const qualityDeltas = updates
    .map((update) => update.avgQualityScoreDelta)
    .filter((delta): delta is number => typeof delta === 'number');

  const avgSuccessRateDelta =
    successRateDeltas.length > 0
      ? successRateDeltas.reduce((sum, value) => sum + value, 0) / successRateDeltas.length
      : 0;
  const avgQualityDelta =
    qualityDeltas.length > 0
      ? qualityDeltas.reduce((sum, value) => sum + value, 0) / qualityDeltas.length
      : 0;

  return {
    cycleId: `registry-quarterly-${generatedAtDate.toISOString().slice(0, 10)}`,
    cadence: 'quarterly',
    generatedAt,
    targetQuarter: formatQuarterKey(generatedAtDate),
    reviewDate,
    reviewedAgents,
    updates,
    summary: {
      updatedAgents: updates.length,
      avgSuccessRateDelta: Number(avgSuccessRateDelta.toFixed(3)),
      avgQualityDelta: Number(avgQualityDelta.toFixed(3)),
    },
  };
}

export function applyQuarterlyRegistryUpdates(
  registry: AgentRegistryDocument,
  updates: RegistryMetadataUpdate[],
  reviewedAt = new Date().toISOString()
): AgentRegistryDocument {
  const updateMap = new Map(updates.map((update) => [update.agentId, update]));

  const agents = registry.agents.map((agent) => {
    const update = updateMap.get(agent.id);
    if (!update) {
      return agent;
    }

    const successRate = clampPercentage(agent.successRate + (update.successRateDelta || 0));
    const avgQualityScore = clampPercentage(
      agent.avgQualityScore + (update.avgQualityScoreDelta || 0)
    );

    const successPatterns = Array.from(
      new Set([...(agent.successPatterns || []), ...(update.addSuccessPatterns || [])])
    );

    const sourceFiles = Array.from(
      new Set([...(agent.sourceFiles || []), 'quarterly-optimization-cycle'])
    );

    return {
      ...agent,
      successRate,
      avgQualityScore,
      successPatterns,
      sourceFiles,
      lastUpdated: reviewedAt,
    };
  });

  return {
    ...registry,
    generatedAt: reviewedAt,
    agents,
  };
}
