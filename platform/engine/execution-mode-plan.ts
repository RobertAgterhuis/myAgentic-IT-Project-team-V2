import { loadAgentRegistry, type AgentRegistryEntry } from './agent-registry';
import {
  getExecutionModeDescriptor,
  type AgencyInjectionPoint,
  type ExecutionMode,
} from './execution-mode';

export interface PlannedAgencyAgent {
  id: string;
  name: string;
  score: number;
  domains: string[];
}

export interface PlannedHybridInjection {
  atState: string;
  mandatory: boolean;
  agents: PlannedAgencyAgent[];
}

export interface ExecutionModePlan {
  mode: ExecutionMode;
  selectedAgencyAgents: PlannedAgencyAgent[];
  hybridInjections: PlannedHybridInjection[];
}

export interface BuildExecutionModePlanOptions {
  mode: ExecutionMode;
  brief?: string;
  maxAgencyAgents?: number;
  maxAgentsPerInjection?: number;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function scoreAgent(agent: AgentRegistryEntry, tokens: Set<string>): number {
  const baseline = Math.max(0, Math.round(agent.successRate * 10 + agent.avgQualityScore));
  if (tokens.size === 0) {
    return baseline;
  }

  let relevance = 0;
  const haystacks = [
    agent.name,
    agent.description,
    ...(agent.capabilities || []),
    ...(agent.domain || []),
  ].map((segment) => String(segment || '').toLowerCase());

  for (const token of tokens) {
    for (const haystack of haystacks) {
      if (!haystack) continue;
      if (haystack === token) {
        relevance += 12;
      } else if (haystack.includes(token)) {
        relevance += 6;
      }
    }
  }

  return baseline + relevance;
}

function toPlannedAgent(agent: AgentRegistryEntry, score: number): PlannedAgencyAgent {
  return {
    id: agent.id,
    name: agent.name,
    score,
    domains: [...(agent.domain || [])],
  };
}

function buildHybridInjections(
  injectionPoints: AgencyInjectionPoint[],
  agents: PlannedAgencyAgent[],
  maxAgentsPerInjection: number
): PlannedHybridInjection[] {
  if (agents.length === 0 || injectionPoints.length === 0) {
    return [];
  }

  let offset = 0;
  return injectionPoints.map((point) => {
    const selected: PlannedAgencyAgent[] = [];
    for (let i = 0; i < maxAgentsPerInjection; i++) {
      const agent = agents[(offset + i) % agents.length];
      selected.push(agent);
      if (selected.length >= agents.length) {
        break;
      }
    }
    offset = (offset + maxAgentsPerInjection) % agents.length;

    return {
      atState: point.atState,
      mandatory: point.mandatory,
      agents: selected,
    };
  });
}

export function buildExecutionModePlan(options: BuildExecutionModePlanOptions): ExecutionModePlan {
  const { mode, brief, maxAgencyAgents = 8, maxAgentsPerInjection = 2 } = options;
  const descriptor = getExecutionModeDescriptor(mode);
  const tokens = new Set(tokenize(String(brief || '')));

  const registry = loadAgentRegistry();
  const ranked = registry.agents
    .filter((agent) => agent.agentType === 'agency')
    .map((agent) => ({
      agent,
      score: scoreAgent(agent, tokens),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.agent.name.localeCompare(right.agent.name);
    });

  const selectedAgencyAgents = ranked
    .slice(0, Math.max(1, maxAgencyAgents))
    .map(({ agent, score }) => toPlannedAgent(agent, score));

  const hybridInjections = descriptor.mode === 'HYBRID'
    ? buildHybridInjections(
        descriptor.injectionPoints,
        selectedAgencyAgents,
        Math.max(1, maxAgentsPerInjection)
      )
    : [];

  return {
    mode,
    selectedAgencyAgents,
    hybridInjections,
  };
}
