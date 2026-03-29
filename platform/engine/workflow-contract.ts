import type {
  PackManifestV2,
  WorkflowAssignmentDefinition,
  WorkflowCommandDefinition,
  WorkflowGateDefinition,
  WorkflowHelpMetadata,
  WorkflowStageDefinition,
  WorkflowTransitionDefinition,
} from './pack-contract';

export interface WorkflowDefinition {
  pack: {
    id: string;
    name: string;
    version: string;
    manifestVersion: string;
  };
  commands: WorkflowCommandDefinition[];
  stages: StageDefinition[];
  transitions: WorkflowTransitionDefinition[];
  gates: WorkflowGateDefinition[];
  assignments: WorkflowAssignmentDefinition[];
  artifactNamespaces: Record<string, string>;
  help: WorkflowHelpMetadata;
}

export interface StageDefinition extends WorkflowStageDefinition {
  structural: boolean;
}

function toStageDefinitions(manifest: PackManifestV2): StageDefinition[] {
  if (manifest.stages.length > 0) {
    const structural = new Set(manifest.structural_states);
    return manifest.stages.map((stage) => ({
      ...stage,
      structural: structural.has(stage.id),
    }));
  }

  // Backward-compatible fallback for manifests that only define states/full_flow.
  const structural = new Set(manifest.structural_states);
  return manifest.full_flow.map((stageId, index) => ({
    id: stageId,
    label: stageId,
    order: index,
    structural: structural.has(stageId),
  }));
}

function toTransitions(manifest: PackManifestV2): WorkflowTransitionDefinition[] {
  if (manifest.transitions.length > 0) {
    return manifest.transitions;
  }

  const transitions: WorkflowTransitionDefinition[] = [];
  for (let index = 0; index < manifest.full_flow.length - 1; index += 1) {
    transitions.push({
      from: manifest.full_flow[index],
      to: manifest.full_flow[index + 1],
      event: 'transition',
    });
  }

  return transitions;
}

export function toWorkflowDefinition(manifest: PackManifestV2): WorkflowDefinition {
  return {
    pack: {
      id: manifest.pack_id,
      name: manifest.pack_name,
      version: manifest.version,
      manifestVersion: manifest.manifest_version,
    },
    commands: manifest.commands,
    stages: toStageDefinitions(manifest),
    transitions: toTransitions(manifest),
    gates: manifest.gates,
    assignments: manifest.assignments,
    artifactNamespaces: manifest.artifact_namespaces,
    help: manifest.help,
  };
}
