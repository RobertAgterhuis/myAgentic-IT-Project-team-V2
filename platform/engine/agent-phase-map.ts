import { STATES } from './state-machine';
import agentsSchema from '../schema/agents.json';

export interface AgentRef {
  id: string;
  name: string;
}

interface CanonicalSchemaAgent {
  id?: unknown;
  name?: unknown;
  phase?: unknown;
}

const RUNTIME_TO_SCHEMA_PHASE = Object.freeze({
  [STATES.ONBOARDING]: 'ONBOARDING',
  [STATES.PHASE_1]: 'PHASE_1',
  [STATES.PHASE_2]: 'PHASE_2',
  [STATES.PHASE_3]: 'PHASE_3',
  [STATES.PHASE_4]: 'PHASE_4',
  [STATES.SYNTHESIS]: 'SYNTHESIS',
  [STATES.SPRINT_GATE]: 'SPRINT_GATE',
  [STATES.PHASE_5_EXECUTING]: 'PHASE_5_EXECUTING',
} as Record<string, string>);

export const RUNTIME_STATES_WITH_AGENTS = Object.freeze([
  STATES.ONBOARDING,
  STATES.PHASE_1,
  STATES.CRITIC_1,
  STATES.PHASE_2,
  STATES.CRITIC_2,
  STATES.PHASE_3,
  STATES.CRITIC_3,
  STATES.PHASE_4,
  STATES.CRITIC_4,
  STATES.SYNTHESIS,
  STATES.SPRINT_GATE,
  STATES.PHASE_5_EXECUTING,
]);

function toAgentRef(row: CanonicalSchemaAgent): AgentRef {
  if (typeof row.id !== 'string' || typeof row.name !== 'string') {
    throw new Error('Invalid agents schema row: expected string id and name');
  }
  return { id: row.id, name: row.name };
}

function freezePhaseMap(phaseMap: Record<string, AgentRef[]>): Record<string, AgentRef[]> {
  for (const [state, agents] of Object.entries(phaseMap)) {
    const frozenAgents = Object.freeze(
      agents.map((agent) => Object.freeze({ ...agent }))
    ) as unknown as AgentRef[];
    phaseMap[state] = frozenAgents;
  }
  return Object.freeze(phaseMap);
}

function serializePhaseMap(phaseMap: Record<string, AgentRef[]>) {
  return RUNTIME_STATES_WITH_AGENTS.map((state) => ({
    state,
    agents: (phaseMap[state] || []).map((agent) => ({ id: agent.id, name: agent.name })),
  }));
}

function compileAgentPhaseMap(schemaDoc: unknown = agentsSchema): Record<string, AgentRef[]> {
  const doc = schemaDoc as { agents?: unknown };
  if (!doc || !Array.isArray(doc.agents)) {
    throw new Error('Invalid agents schema: expected top-level agents array');
  }

  const schemaByPhase = new Map<string, AgentRef[]>();
  for (const rawAgent of doc.agents as CanonicalSchemaAgent[]) {
    if (!rawAgent || typeof rawAgent.phase !== 'string') {
      throw new Error('Invalid agents schema row: expected string phase');
    }

    const list = schemaByPhase.get(rawAgent.phase) || [];
    list.push(toAgentRef(rawAgent));
    schemaByPhase.set(rawAgent.phase, list);
  }

  const criticRiskAgents = schemaByPhase.get('CRITIC_RISK') || [];
  const runtimePhaseMap: Record<string, AgentRef[]> = {
    [STATES.CRITIC_1]: criticRiskAgents.map((agent) => ({ ...agent })),
    [STATES.CRITIC_2]: criticRiskAgents.map((agent) => ({ ...agent })),
    [STATES.CRITIC_3]: criticRiskAgents.map((agent) => ({ ...agent })),
    [STATES.CRITIC_4]: criticRiskAgents.map((agent) => ({ ...agent })),
  };

  for (const [runtimeState, schemaPhase] of Object.entries(RUNTIME_TO_SCHEMA_PHASE)) {
    runtimePhaseMap[runtimeState] = (schemaByPhase.get(schemaPhase) || []).map((agent) => ({
      ...agent,
    }));
  }

  return freezePhaseMap(runtimePhaseMap);
}

function assertRuntimeSchemaParity(
  runtimePhaseMap: Record<string, AgentRef[]>,
  schemaDoc: unknown = agentsSchema
): void {
  const compiled = compileAgentPhaseMap(schemaDoc);
  const runtimeSnapshot = JSON.stringify(serializePhaseMap(runtimePhaseMap));
  const compiledSnapshot = JSON.stringify(serializePhaseMap(compiled));

  if (runtimeSnapshot !== compiledSnapshot) {
    throw new Error('Runtime/schema parity violation for dispatcher phase-agent map');
  }
}

const PHASE_AGENTS = compileAgentPhaseMap();
assertRuntimeSchemaParity(PHASE_AGENTS);

export { compileAgentPhaseMap, assertRuntimeSchemaParity, PHASE_AGENTS };
