export interface FlowModeContract {
  phases: string[];
  label: string;
}

export interface WorkflowCommandDefinition {
  id: string;
  label: string;
  description?: string;
}

export interface WorkflowStageDefinition {
  id: string;
  label: string;
  order: number;
}

export interface WorkflowTransitionDefinition {
  from: string;
  to: string;
  event?: string;
}

export interface WorkflowGateDefinition {
  id: string;
  after: string;
  before: string;
  type: string;
  conditions: string[];
}

export interface WorkflowRuntimeGateAssets {
  contracts: string[];
  guardrails: string[];
}

export interface WorkflowRuntimeDefinition {
  skills_base_dir?: string;
  contracts_base_dir?: string;
  guardrails_base_dir?: string;
  parallel_groups?: Record<string, string[][]>;
  default_parallel_dispatch_states?: string[];
  gate_assets?: Record<string, WorkflowRuntimeGateAssets>;
  required_assignment_agent_ids?: string[];
}

export interface WorkflowAssignmentDefinition {
  phase: string;
  agent_id: string;
}

export interface WorkflowHelpMetadata {
  topics: Array<{
    id: string;
    title: string;
    summary?: string;
  }>;
}

export interface LegacyFlowDefinition {
  states: string[];
  full_flow: string[];
  structural_states: string[];
  events: string[];
  modes: Record<string, FlowModeContract>;
}

export interface PackManifestV2 extends LegacyFlowDefinition {
  manifest_version: '2.0';
  pack_id: string;
  pack_name: string;
  version: string;
  commands: WorkflowCommandDefinition[];
  stages: WorkflowStageDefinition[];
  transitions: WorkflowTransitionDefinition[];
  gates: WorkflowGateDefinition[];
  assignments: WorkflowAssignmentDefinition[];
  artifact_namespaces: Record<string, string>;
  help: WorkflowHelpMetadata;
  runtime: WorkflowRuntimeDefinition;
}

interface ModeCandidate {
  phases?: unknown;
  label?: unknown;
}

interface ManifestCandidate {
  states?: unknown;
  full_flow?: unknown;
  structural_states?: unknown;
  events?: unknown;
  modes?: unknown;
  pack_id?: unknown;
  pack_name?: unknown;
  version?: unknown;
  manifest_version?: unknown;
  id?: unknown;
  name?: unknown;
  fullFlow?: unknown;
  structuralStates?: unknown;
  commands?: unknown;
  stages?: unknown;
  transitions?: unknown;
  gates?: unknown;
  assignments?: unknown;
  artifact_namespaces?: unknown;
  artifactNamespaces?: unknown;
  help?: unknown;
  runtime?: unknown;
}

function asStringArray(value: unknown, field: string) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`Invalid ${field}: expected array of strings`);
  }

  return value;
}

function normalizeModes(value: unknown) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid modes: expected mapping of mode names to mode config');
  }

  const normalized: Record<string, FlowModeContract> = {};
  for (const [modeName, modeConfig] of Object.entries(value as Record<string, ModeCandidate>)) {
    if (typeof modeConfig !== 'object' || modeConfig === null || Array.isArray(modeConfig)) {
      throw new Error(`Invalid mode config for "${modeName}": expected mapping`);
    }

    const phases = modeConfig.phases;
    if (!Array.isArray(phases) || phases.some((entry) => typeof entry !== 'string')) {
      throw new Error(`Invalid mode phases for "${modeName}": expected array of strings`);
    }

    normalized[modeName] = {
      phases,
      label: typeof modeConfig.label === 'string' ? modeConfig.label : modeName,
    };
  }

  return normalized;
}

function readText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

function asObject(value: unknown, field: string) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${field}: expected object`);
  }

  return value as Record<string, unknown>;
}

function normalizeCommands(value: unknown): WorkflowCommandDefinition[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error('Invalid commands: expected array');
  }

  return value.map((entry, index) => {
    const row = asObject(entry, `commands[${index}]`);
    const id = readText(row.id, '');
    if (!id) {
      throw new Error(`Invalid commands[${index}].id: expected non-empty string`);
    }
    return {
      id,
      label: readText(row.label, id),
      description: typeof row.description === 'string' ? row.description.trim() : undefined,
    };
  });
}

function normalizeStages(value: unknown): WorkflowStageDefinition[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error('Invalid stages: expected array');
  }

  return value.map((entry, index) => {
    const row = asObject(entry, `stages[${index}]`);
    const id = readText(row.id, '');
    if (!id) {
      throw new Error(`Invalid stages[${index}].id: expected non-empty string`);
    }

    const order = typeof row.order === 'number' && Number.isFinite(row.order) ? row.order : index;

    return {
      id,
      label: readText(row.label, id),
      order,
    };
  });
}

function normalizeTransitions(value: unknown): WorkflowTransitionDefinition[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error('Invalid transitions: expected array');
  }

  return value.map((entry, index) => {
    const row = asObject(entry, `transitions[${index}]`);
    const from = readText(row.from, '');
    const to = readText(row.to, '');
    if (!from || !to) {
      throw new Error(`Invalid transitions[${index}]: expected non-empty from/to`);
    }

    return {
      from,
      to,
      event: typeof row.event === 'string' && row.event.trim() ? row.event.trim() : undefined,
    };
  });
}

function normalizeGates(value: unknown): WorkflowGateDefinition[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error('Invalid gates: expected array');
  }

  return value.map((entry, index) => {
    const row = asObject(entry, `gates[${index}]`);
    const id = readText(row.id, '');
    const after = readText(row.after, '');
    const before = readText(row.before, '');
    const type = readText(row.type, 'CUSTOM');
    const conditions = Array.isArray(row.conditions)
      ? row.conditions.filter((condition): condition is string => typeof condition === 'string')
      : [];

    if (!id || !after || !before) {
      throw new Error(`Invalid gates[${index}]: expected id/after/before`);
    }

    return { id, after, before, type, conditions };
  });
}

function normalizeAssignments(value: unknown): WorkflowAssignmentDefinition[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error('Invalid assignments: expected array');
  }

  return value.map((entry, index) => {
    const row = asObject(entry, `assignments[${index}]`);
    const phase = readText(row.phase, '');
    const agent_id = readText(row.agent_id, '');
    if (!phase || !agent_id) {
      throw new Error(`Invalid assignments[${index}]: expected phase/agent_id`);
    }

    return { phase, agent_id };
  });
}

function normalizeArtifactNamespaces(value: unknown): Record<string, string> {
  if (value === undefined || value === null) return {};
  const input = asObject(value, 'artifact_namespaces');

  const normalized: Record<string, string> = {};
  for (const [key, namespace] of Object.entries(input)) {
    if (typeof namespace !== 'string' || namespace.trim() === '') {
      throw new Error(`Invalid artifact_namespaces.${key}: expected non-empty string`);
    }
    normalized[key] = namespace.trim();
  }
  return normalized;
}

function normalizeHelp(value: unknown): WorkflowHelpMetadata {
  if (value === undefined || value === null) return { topics: [] };
  const input = asObject(value, 'help');
  const topicsRaw = input.topics;
  if (topicsRaw === undefined) return { topics: [] };
  if (!Array.isArray(topicsRaw)) {
    throw new Error('Invalid help.topics: expected array');
  }

  return {
    topics: topicsRaw.map((entry, index) => {
      const row = asObject(entry, `help.topics[${index}]`);
      const id = readText(row.id, '');
      if (!id) {
        throw new Error(`Invalid help.topics[${index}].id: expected non-empty string`);
      }
      return {
        id,
        title: readText(row.title, id),
        summary: typeof row.summary === 'string' ? row.summary.trim() : undefined,
      };
    }),
  };
}

function normalizeParallelGroups(value: unknown): Record<string, string[][]> {
  if (value === undefined || value === null) return {};
  const input = asObject(value, 'runtime.parallel_groups');
  const normalized: Record<string, string[][]> = {};

  for (const [state, groups] of Object.entries(input)) {
    if (!Array.isArray(groups)) {
      throw new Error(`Invalid runtime.parallel_groups.${state}: expected array of groups`);
    }

    normalized[state] = groups.map((group, index) => {
      if (!Array.isArray(group) || group.some((agentId) => typeof agentId !== 'string')) {
        throw new Error(
          `Invalid runtime.parallel_groups.${state}[${index}]: expected array of agent ids`
        );
      }
      return [...group];
    });
  }

  return normalized;
}

function normalizeGateAssets(value: unknown): Record<string, WorkflowRuntimeGateAssets> {
  if (value === undefined || value === null) return {};
  const input = asObject(value, 'runtime.gate_assets');
  const normalized: Record<string, WorkflowRuntimeGateAssets> = {};

  for (const [gateId, assets] of Object.entries(input)) {
    const row = asObject(assets, `runtime.gate_assets.${gateId}`);
    normalized[gateId] = {
      contracts: Array.isArray(row.contracts)
        ? row.contracts.filter((entry): entry is string => typeof entry === 'string')
        : [],
      guardrails: Array.isArray(row.guardrails)
        ? row.guardrails.filter((entry): entry is string => typeof entry === 'string')
        : [],
    };
  }

  return normalized;
}

function normalizeRequiredAssignmentAgentIds(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error('Invalid runtime.required_assignment_agent_ids: expected array of strings');
  }

  const normalized = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return [...new Set(normalized)];
}

function assertRequiredAssignments(
  assignments: WorkflowAssignmentDefinition[],
  requiredAgentIds: string[]
): void {
  if (requiredAgentIds.length === 0) {
    return;
  }

  const assignedIds = new Set(assignments.map((assignment) => assignment.agent_id));
  const missing = requiredAgentIds.filter((agentId) => !assignedIds.has(agentId));
  if (missing.length > 0) {
    throw new Error(
      `Missing required runtime assignments for orchestrator-required agents: ${missing.join(', ')}`
    );
  }
}

function normalizeRuntime(value: unknown): WorkflowRuntimeDefinition {
  if (value === undefined || value === null) return {};
  const input = asObject(value, 'runtime');
  return {
    skills_base_dir:
      typeof input.skills_base_dir === 'string' && input.skills_base_dir.trim() !== ''
        ? input.skills_base_dir.trim()
        : undefined,
    contracts_base_dir:
      typeof input.contracts_base_dir === 'string' && input.contracts_base_dir.trim() !== ''
        ? input.contracts_base_dir.trim()
        : undefined,
    guardrails_base_dir:
      typeof input.guardrails_base_dir === 'string' && input.guardrails_base_dir.trim() !== ''
        ? input.guardrails_base_dir.trim()
        : undefined,
    parallel_groups: normalizeParallelGroups(input.parallel_groups),
    default_parallel_dispatch_states: Array.isArray(input.default_parallel_dispatch_states)
      ? input.default_parallel_dispatch_states.filter(
          (entry): entry is string => typeof entry === 'string'
        )
      : undefined,
    gate_assets: normalizeGateAssets(input.gate_assets),
    required_assignment_agent_ids: normalizeRequiredAssignmentAgentIds(
      input.required_assignment_agent_ids
    ),
  };
}

export function toPackManifestV2(candidate: unknown): PackManifestV2 {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    throw new Error('Invalid flow manifest: root value must be an object');
  }

  const manifest = candidate as ManifestCandidate;

  const states = asStringArray(manifest.states, 'states');
  const fullFlowSource = manifest.full_flow ?? manifest.fullFlow;
  const structuralStatesSource = manifest.structural_states ?? manifest.structuralStates;

  const full_flow = asStringArray(fullFlowSource, 'full_flow');
  const structural_states = asStringArray(structuralStatesSource, 'structural_states');
  const events = asStringArray(manifest.events, 'events');
  const modes = normalizeModes(manifest.modes);

  const pack_id = readText(manifest.pack_id ?? manifest.id, 'core-runtime');
  const pack_name = readText(manifest.pack_name ?? manifest.name, 'Core Runtime Pack');
  const version = readText(manifest.version, '1.0.0');
  const commands = normalizeCommands(manifest.commands);
  const stages = normalizeStages(manifest.stages);
  const transitions = normalizeTransitions(manifest.transitions);
  const gates = normalizeGates(manifest.gates);
  const assignments = normalizeAssignments(manifest.assignments);
  const artifact_namespaces = normalizeArtifactNamespaces(
    manifest.artifact_namespaces ?? manifest.artifactNamespaces
  );
  const help = normalizeHelp(manifest.help);
  const runtime = normalizeRuntime(manifest.runtime);
  const requiredAgentIds =
    runtime.required_assignment_agent_ids && runtime.required_assignment_agent_ids.length > 0
      ? runtime.required_assignment_agent_ids
      : [];
  assertRequiredAssignments(assignments, requiredAgentIds);

  return {
    manifest_version: '2.0',
    pack_id,
    pack_name,
    version,
    commands,
    stages,
    transitions,
    gates,
    assignments,
    artifact_namespaces,
    help,
    runtime,
    states,
    full_flow,
    structural_states,
    modes,
    events,
  };
}

export function toLegacyFlowDefinition(manifest: PackManifestV2): LegacyFlowDefinition {
  return {
    states: manifest.states,
    full_flow: manifest.full_flow,
    structural_states: manifest.structural_states,
    modes: manifest.modes,
    events: manifest.events,
  };
}
