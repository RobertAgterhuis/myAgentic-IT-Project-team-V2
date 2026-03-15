// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * SDLC Artifact Management
 *
 * Manages versioned artifacts with lineage tracking, ownership, and lifecycle
 * status. An artifact is any file, document, schema, or deliverable produced
 * during the SDLC process. Each artifact carries immutable version history
 * and bidirectional traceability links.
 *
 * Follows the Store DI pattern — all I/O is performed through an injected
 * store abstraction.
 *
 * Zero external dependencies.
 *
 * @module sdlc/artifacts
 */

import type { EntityType, LifecycleStage, TraceLink } from './entities.js';

// ─── Artifact Types ──────────────────────────────────────────

export const ARTIFACT_TYPES = Object.freeze({
  DOCUMENT: 'DOCUMENT',
  SCHEMA: 'SCHEMA',
  CODE: 'CODE',
  TEST_REPORT: 'TEST_REPORT',
  DEPLOYMENT_MANIFEST: 'DEPLOYMENT_MANIFEST',
  DESIGN_ASSET: 'DESIGN_ASSET',
  CONFIGURATION: 'CONFIGURATION',
  BINARY: 'BINARY',
} as const);

export type ArtifactType = (typeof ARTIFACT_TYPES)[keyof typeof ARTIFACT_TYPES];

// ─── Artifact Status ─────────────────────────────────────────

export const ARTIFACT_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  REVIEW: 'REVIEW',
  APPROVED: 'APPROVED',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
  SUPERSEDED: 'SUPERSEDED',
} as const);

export type ArtifactStatus = (typeof ARTIFACT_STATUS)[keyof typeof ARTIFACT_STATUS];

// ─── Version Entry ───────────────────────────────────────────

export interface ArtifactVersion {
  version: string;
  created_at: string;
  created_by: string;
  summary: string;
  checksum: string;
  size_bytes: number;
}

// ─── Artifact Definition ─────────────────────────────────────

export interface Artifact {
  id: string;
  name: string;
  artifact_type: ArtifactType;
  status: ArtifactStatus;
  stage: LifecycleStage;
  owner: string;
  path: string;
  mime_type: string;
  current_version: string;
  versions: ArtifactVersion[];
  source_entity_id: string;
  source_entity_type: EntityType;
  links: TraceLink[];
  created_at: string;
  updated_at: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

// ─── Lineage Edge ────────────────────────────────────────────

export interface LineageEdge {
  from_artifact_id: string;
  to_artifact_id: string;
  relationship: 'PRODUCES' | 'CONSUMES' | 'TRANSFORMS' | 'VALIDATES' | 'SUPERSEDES';
  created_at: string;
}

// ─── Artifact Registry (in-memory) ──────────────────────────

export interface ArtifactStore {
  read(path: string): Promise<string | null>;
  write(path: string, data: string): Promise<void>;
}

export class ArtifactRegistry {
  private _artifacts = new Map<string, Artifact>();
  private _lineage: LineageEdge[] = [];
  private readonly _store: ArtifactStore;
  private readonly _registryPath: string;

  constructor(store: ArtifactStore, registryPath = 'BusinessDocs/artifacts/registry.json') {
    this._store = store;
    this._registryPath = registryPath;
  }

  // ─── CRUD ────────────────────────────────────────────────

  register(artifact: Artifact): void {
    if (this._artifacts.has(artifact.id)) {
      throw new Error(`Artifact already registered: ${artifact.id}`);
    }
    this._artifacts.set(artifact.id, artifact);
  }

  get(id: string): Artifact | undefined {
    return this._artifacts.get(id);
  }

  update(id: string, patch: Partial<Omit<Artifact, 'id' | 'created_at'>>): Artifact {
    const existing = this._artifacts.get(id);
    if (!existing) throw new Error(`Artifact not found: ${id}`);
    const updated: Artifact = {
      ...existing,
      ...patch,
      id: existing.id,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };
    this._artifacts.set(id, updated);
    return updated;
  }

  list(filter?: {
    stage?: LifecycleStage;
    artifact_type?: ArtifactType;
    status?: ArtifactStatus;
  }): Artifact[] {
    let results = Array.from(this._artifacts.values());
    if (filter?.stage) results = results.filter((a) => a.stage === filter.stage);
    if (filter?.artifact_type)
      results = results.filter((a) => a.artifact_type === filter.artifact_type);
    if (filter?.status) results = results.filter((a) => a.status === filter.status);
    return results;
  }

  // ─── Versioning ──────────────────────────────────────────

  addVersion(id: string, version: ArtifactVersion): Artifact {
    const artifact = this._artifacts.get(id);
    if (!artifact) throw new Error(`Artifact not found: ${id}`);
    if (artifact.versions.some((v) => v.version === version.version)) {
      throw new Error(`Version ${version.version} already exists for artifact ${id}`);
    }
    const updated: Artifact = {
      ...artifact,
      current_version: version.version,
      versions: [...artifact.versions, version],
      updated_at: new Date().toISOString(),
    };
    this._artifacts.set(id, updated);
    return updated;
  }

  getVersionHistory(id: string): ArtifactVersion[] {
    const artifact = this._artifacts.get(id);
    if (!artifact) return [];
    return [...artifact.versions];
  }

  // ─── Lineage ─────────────────────────────────────────────

  addLineageEdge(edge: LineageEdge): void {
    this._lineage.push(edge);
  }

  getLineage(artifactId: string): { upstream: LineageEdge[]; downstream: LineageEdge[] } {
    return {
      upstream: this._lineage.filter((e) => e.to_artifact_id === artifactId),
      downstream: this._lineage.filter((e) => e.from_artifact_id === artifactId),
    };
  }

  // ─── Persistence ─────────────────────────────────────────

  async save(): Promise<void> {
    const data = {
      artifacts: Array.from(this._artifacts.values()),
      lineage: this._lineage,
    };
    await this._store.write(this._registryPath, JSON.stringify(data, null, 2));
  }

  async load(): Promise<void> {
    const raw = await this._store.read(this._registryPath);
    if (!raw) return;
    const data = JSON.parse(raw) as { artifacts: Artifact[]; lineage: LineageEdge[] };
    this._artifacts.clear();
    for (const a of data.artifacts) {
      this._artifacts.set(a.id, a);
    }
    this._lineage = data.lineage || [];
  }

  // ─── Stats ───────────────────────────────────────────────

  stats(): { total: number; by_type: Record<string, number>; by_status: Record<string, number> } {
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const a of this._artifacts.values()) {
      byType[a.artifact_type] = (byType[a.artifact_type] || 0) + 1;
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    }
    return { total: this._artifacts.size, by_type: byType, by_status: byStatus };
  }
}

// ─── Factory ─────────────────────────────────────────────────

let _artifactCounter = 0;

export function generateArtifactId(prefix = 'ART'): string {
  _artifactCounter += 1;
  const ts = Date.now().toString(36);
  const seq = _artifactCounter.toString(36).padStart(4, '0');
  return `${prefix}-${ts}-${seq}`;
}

/** Reset the internal counter (for deterministic testing). */
export function resetArtifactIdCounter(): void {
  _artifactCounter = 0;
}

export function createArtifact(
  name: string,
  artifactType: ArtifactType,
  stage: LifecycleStage,
  sourceEntityId: string,
  sourceEntityType: EntityType,
  overrides: Partial<Artifact> = {}
): Artifact {
  const now = new Date().toISOString();
  return {
    id: overrides.id || generateArtifactId(),
    name,
    artifact_type: artifactType,
    status: overrides.status || ARTIFACT_STATUS.DRAFT,
    stage,
    owner: overrides.owner || '',
    path: overrides.path || '',
    mime_type: overrides.mime_type || 'application/octet-stream',
    current_version: overrides.current_version || '0.1.0',
    versions: overrides.versions || [
      {
        version: '0.1.0',
        created_at: now,
        created_by: overrides.owner || '',
        summary: 'Initial version',
        checksum: '',
        size_bytes: 0,
      },
    ],
    source_entity_id: sourceEntityId,
    source_entity_type: sourceEntityType,
    links: overrides.links || [],
    created_at: overrides.created_at || now,
    updated_at: overrides.updated_at || now,
    tags: overrides.tags || [],
    metadata: overrides.metadata || {},
  };
}
