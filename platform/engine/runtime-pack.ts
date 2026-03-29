import path from 'node:path';
import { PHASE_AGENTS, type AgentRef } from './agent-phase-map';
import type {
  PackManifestV2,
  WorkflowGateDefinition,
  WorkflowRuntimeGateAssets,
} from './pack-contract';
import type { WorkflowDefinition } from './workflow-contract';

export interface RuntimePackGate {
  id: string;
  type: string;
  after: string;
  before: string;
  criticState: string | null;
  evaluatedPhase: string;
  conditions: string[];
  contracts: string[];
  guardrails: string[];
}

export interface RuntimePackGraph {
  pack: WorkflowDefinition['pack'];
  states: string[];
  fullFlow: string[];
  workflow: WorkflowDefinition;
  phaseAgents: Record<string, AgentRef[]>;
  parallelGroups: Record<string, string[][]>;
  defaultParallelDispatchStates: string[];
  skillsBaseDir: string | null;
  contractsBaseDir: string | null;
  guardrailsBaseDir: string | null;
  skillFileGlobs: Record<string, string>;
  gates: RuntimePackGate[];
  gatesByCriticState: Record<string, RuntimePackGate>;
  warnings: string[];
}

function clonePhaseAgents(phaseAgents: Record<string, AgentRef[]>): Record<string, AgentRef[]> {
  return Object.fromEntries(
    Object.entries(phaseAgents).map(([state, agents]) => [
      state,
      agents.map((agent) => ({ ...agent })),
    ])
  );
}

function toAgentNameIndex(phaseAgents: Record<string, AgentRef[]>): Map<string, string> {
  const index = new Map<string, string>();
  for (const agents of Object.values(phaseAgents)) {
    for (const agent of agents) {
      if (!index.has(agent.id)) {
        index.set(agent.id, agent.name);
      }
    }
  }
  return index;
}

function resolvePhaseAgents(manifest: PackManifestV2): Record<string, AgentRef[]> {
  const fallback = clonePhaseAgents(PHASE_AGENTS);
  if (manifest.assignments.length === 0) {
    return fallback;
  }

  const agentNames = toAgentNameIndex(fallback);
  const grouped = new Map<string, AgentRef[]>();
  for (const assignment of manifest.assignments) {
    const list = grouped.get(assignment.phase) || [];
    list.push({
      id: assignment.agent_id,
      name: agentNames.get(assignment.agent_id) || assignment.agent_id,
    });
    grouped.set(assignment.phase, list);
  }

  for (const [phase, agents] of grouped.entries()) {
    fallback[phase] = agents;
  }

  return fallback;
}

function resolveParallelGroups(manifest: PackManifestV2, phaseAgents: Record<string, AgentRef[]>) {
  if (manifest.runtime.parallel_groups) {
    return Object.fromEntries(
      Object.entries(manifest.runtime.parallel_groups).map(([state, groups]) => [
        state,
        groups.map((group) => [...group]),
      ])
    );
  }

  return Object.fromEntries(
    Object.entries(phaseAgents)
      .filter(([, agents]) => agents.length > 0)
      .map(([state, agents]) => [state, [agents.map((agent) => agent.id)]])
  );
}

function resolveSkillFileGlobs(manifest: PackManifestV2, phaseAgents: Record<string, AgentRef[]>) {
  const skillsBaseDir = manifest.runtime.skills_base_dir?.trim() || null;
  const agentIds = new Set<string>();
  for (const agents of Object.values(phaseAgents)) {
    for (const agent of agents) {
      agentIds.add(agent.id);
    }
  }

  return {
    skillsBaseDir,
    skillFileGlobs: Object.fromEntries(
      [...agentIds].map((agentId) => [
        agentId,
        skillsBaseDir ? path.join(skillsBaseDir, `${agentId}-*.md`) : `${agentId}-*.md`,
      ])
    ),
  };
}

function resolveGateAssets(
  assets: Record<string, WorkflowRuntimeGateAssets> | undefined,
  gateId: string
): WorkflowRuntimeGateAssets {
  const gateAssets = assets?.[gateId];
  return {
    contracts: gateAssets?.contracts ? [...gateAssets.contracts] : [],
    guardrails: gateAssets?.guardrails ? [...gateAssets.guardrails] : [],
  };
}

function findCriticStateForGate(gate: WorkflowGateDefinition, fullFlow: string[]): string | null {
  for (let index = 1; index < fullFlow.length - 1; index += 1) {
    const state = fullFlow[index];
    if (!state.startsWith('CRITIC_')) {
      continue;
    }

    if (fullFlow[index - 1] === gate.after && fullFlow[index + 1] === gate.before) {
      return state;
    }
  }

  return null;
}

function resolveRuntimeGates(manifest: PackManifestV2, workflow: WorkflowDefinition) {
  const warnings: string[] = [];
  const gates: RuntimePackGate[] = workflow.gates.map((gate) => {
    const criticState = findCriticStateForGate(gate, manifest.full_flow);
    if (!criticState && gate.type === 'CRITIC_RISK') {
      warnings.push(`Gate ${gate.id} does not align with a critic state in full_flow`);
    }

    const assets = resolveGateAssets(manifest.runtime.gate_assets, gate.id);
    return {
      id: gate.id,
      type: gate.type,
      after: gate.after,
      before: gate.before,
      criticState,
      evaluatedPhase: gate.after,
      conditions: [...gate.conditions],
      contracts: assets.contracts,
      guardrails: assets.guardrails,
    };
  });

  return {
    gates,
    gatesByCriticState: Object.fromEntries(
      gates.filter((gate) => gate.criticState).map((gate) => [gate.criticState as string, gate])
    ),
    warnings,
  };
}

export function compileRuntimePackGraph(
  manifest: PackManifestV2,
  workflow: WorkflowDefinition
): RuntimePackGraph {
  const phaseAgents = resolvePhaseAgents(manifest);
  const parallelGroups = resolveParallelGroups(manifest, phaseAgents);
  const { skillsBaseDir, skillFileGlobs } = resolveSkillFileGlobs(manifest, phaseAgents);
  const resolvedGates = resolveRuntimeGates(manifest, workflow);

  return {
    pack: workflow.pack,
    states: [...manifest.states],
    fullFlow: [...manifest.full_flow],
    workflow,
    phaseAgents,
    parallelGroups,
    defaultParallelDispatchStates: manifest.runtime.default_parallel_dispatch_states
      ? [...manifest.runtime.default_parallel_dispatch_states]
      : [],
    skillsBaseDir,
    contractsBaseDir: manifest.runtime.contracts_base_dir?.trim() || null,
    guardrailsBaseDir: manifest.runtime.guardrails_base_dir?.trim() || null,
    skillFileGlobs,
    gates: resolvedGates.gates,
    gatesByCriticState: resolvedGates.gatesByCriticState,
    warnings: resolvedGates.warnings,
  };
}

export function resolveRuntimeGateForCriticState(
  runtimePackGraph: RuntimePackGraph | null | undefined,
  criticState: string
): RuntimePackGate | null {
  if (!runtimePackGraph) {
    return null;
  }

  return runtimePackGraph.gatesByCriticState[criticState] || null;
}

export function resolveValidatedPhaseForCriticState(
  runtimePackGraph: RuntimePackGraph | null | undefined,
  criticState: string
): string | null {
  return resolveRuntimeGateForCriticState(runtimePackGraph, criticState)?.evaluatedPhase || null;
}
