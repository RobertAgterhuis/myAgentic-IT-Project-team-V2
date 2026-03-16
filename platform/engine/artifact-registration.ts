// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Artifact Registration Hook — M2
 *
 * Automatically registers artifacts and creates lineage edges when
 * the engine transitions out of a phase. Reads artifact declarations
 * from the template manifest's `phaseArtifacts` section and checks
 * if the declared output files exist on disk.
 *
 * Integration pattern:
 *   afterTransition hook →
 *     1. Determine completed phase from transition `from` state
 *     2. Look up declared artifacts for that phase in manifest
 *     3. For each declared artifact whose file exists:
 *        a. Compute content hash (SHA-256)
 *        b. Register artifact in registry (status: REVIEW)
 *        c. Create PRODUCES lineage edge
 *     4. Create CONSUMES lineage edges per phaseLineage declarations
 *
 * @module engine/artifact-registration
 */

import {
  ArtifactRegistry,
  createArtifact,
  computeContentHash,
  type ArtifactType,
} from '../sdlc/artifacts';
import type { LifecycleStage } from '../sdlc/entities';

// ─── Types ──────────────────────────────────────────────────

/** Artifact declaration as found in manifest.json phaseArtifacts */
export interface ArtifactDeclaration {
  id: string;
  type: string;
  stage: string;
  path: string;
}

/** Lineage declaration from manifest.json phaseLineage */
export interface PhaseLineageConfig {
  consumes: string[];
}

/** Store abstraction matching what the engine already provides */
export interface RegistrationStore {
  exists(path: string): boolean;
  readFile(path: string): string;
}

// ─── Phase-to-critic mapping (from state machine naming convention) ─

const CRITIC_TO_PHASE: Record<string, string> = {
  CRITIC_1: 'PHASE_1',
  CRITIC_2: 'PHASE_2',
  CRITIC_3: 'PHASE_3',
  CRITIC_4: 'PHASE_4',
};

const SYNTHESIS_STATE = 'SYNTHESIS';

/**
 * Resolve completed phase name from a transition's `from` state.
 * Returns the phase that just completed, or null if the transition
 * isn't from a phase/synthesis state.
 */
export function resolveCompletedPhase(fromState: string): string | null {
  // Direct phase states: PHASE_1 → CRITIC_1 means PHASE_1 completed
  if (fromState.startsWith('PHASE_')) return fromState;
  // Synthesis state
  if (fromState === SYNTHESIS_STATE) return SYNTHESIS_STATE;
  return null;
}

/**
 * Resolve the phase that just completed from a critic transition.
 * When engine transitions FROM a critic state, its validated phase is done.
 */
export function resolvePhaseFromCritic(fromState: string): string | null {
  return CRITIC_TO_PHASE[fromState] || null;
}

// ─── Registration Logic ─────────────────────────────────────

export interface RegistrationResult {
  registered: string[];
  skipped: string[];
  lineageEdges: number;
}

/**
 * Register artifacts for a completed phase.
 *
 * @param phase - The phase that just completed (e.g. 'PHASE_1')
 * @param registry - The artifact registry to register into
 * @param store - File store for reading artifact content
 * @param phaseArtifacts - Artifact declarations from manifest
 * @param phaseLineage - Lineage declarations from manifest
 */
export function registerPhaseArtifacts(
  phase: string,
  registry: ArtifactRegistry,
  store: RegistrationStore,
  phaseArtifacts: Record<string, ArtifactDeclaration[]>,
  phaseLineage: Record<string, PhaseLineageConfig>
): RegistrationResult {
  const result: RegistrationResult = { registered: [], skipped: [], lineageEdges: 0 };

  const declarations = phaseArtifacts[phase];
  if (!declarations || declarations.length === 0) return result;

  const now = new Date().toISOString();

  // Register each declared artifact whose file exists on disk
  for (const decl of declarations) {
    if (!store.exists(decl.path)) {
      result.skipped.push(decl.id);
      continue;
    }

    // Skip if already registered (idempotent)
    if (registry.get(decl.id)) {
      result.skipped.push(decl.id);
      continue;
    }

    const content = store.readFile(decl.path);
    const hash = computeContentHash(content);
    const sizeBytes = Buffer.byteLength(content, 'utf8');

    const artifact = createArtifact(
      decl.id,
      decl.type as ArtifactType,
      decl.stage as LifecycleStage,
      phase,
      'PROJECT',
      {
        id: decl.id,
        path: decl.path,
        status: 'REVIEW',
        current_version: '1.0.0',
        versions: [
          {
            version: '1.0.0',
            created_at: now,
            created_by: phase,
            summary: `Registered after ${phase} completion`,
            checksum: hash,
            size_bytes: sizeBytes,
          },
        ],
        metadata: { content_hash: hash },
      }
    );

    registry.register(artifact);
    result.registered.push(decl.id);

    // Create PRODUCES edge: phase → artifact
    registry.addLineageEdge({
      from_artifact_id: phase,
      to_artifact_id: decl.id,
      relationship: 'PRODUCES',
      created_at: now,
    });
    result.lineageEdges++;
  }

  // Create CONSUMES edges per phaseLineage declarations
  const lineageConfig = phaseLineage[phase];
  if (lineageConfig && lineageConfig.consumes) {
    for (const consumedPhase of lineageConfig.consumes) {
      const consumedArtifacts = phaseArtifacts[consumedPhase];
      if (!consumedArtifacts) continue;

      for (const consumedDecl of consumedArtifacts) {
        // Only link if consumed artifact is actually registered
        if (!registry.get(consumedDecl.id)) continue;

        for (const registeredId of result.registered) {
          registry.addLineageEdge({
            from_artifact_id: consumedDecl.id,
            to_artifact_id: registeredId,
            relationship: 'CONSUMES',
            created_at: now,
          });
          result.lineageEdges++;
        }
      }
    }
  }

  return result;
}

// ─── Hook Factory ───────────────────────────────────────────

/**
 * Create an afterTransition hook that registers artifacts automatically.
 *
 * Usage in engine:
 * ```ts
 * const hook = createArtifactRegistrationHook(registry, store, template);
 * createEngine({ hooks: { afterTransition: [hook] } });
 * ```
 */
export function createArtifactRegistrationHook(
  registry: ArtifactRegistry,
  store: RegistrationStore,
  phaseArtifacts: Record<string, ArtifactDeclaration[]>,
  phaseLineage: Record<string, PhaseLineageConfig>
): (event: { from: string; to: string; timestamp: string }) => void {
  return (event: { from: string; to: string; timestamp: string }) => {
    // Check if transition is from a critic state (phase just validated)
    const phaseFromCritic = resolvePhaseFromCritic(event.from);
    if (phaseFromCritic) {
      registerPhaseArtifacts(phaseFromCritic, registry, store, phaseArtifacts, phaseLineage);
      return;
    }

    // Check if it's a synthesis completion
    const completedPhase = resolveCompletedPhase(event.from);
    if (completedPhase) {
      registerPhaseArtifacts(completedPhase, registry, store, phaseArtifacts, phaseLineage);
    }
  };
}
