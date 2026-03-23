// Copyright (c) 2026 Robert Agterhuis. MIT License.

import fs from 'node:fs';
import path from 'node:path';
import type { EmbeddingProviderFacade, RagStoreFacade } from '../context';

export type ChatGroundingIntent = 'decision_lookup' | 'workspace_query' | 'artifact_query';
export type StandardGroundingCollection =
  | 'decisions'
  | 'phase-outputs'
  | 'codebase'
  | 'sprint-artifacts'
  | 'retrospectives';

export type WorkspaceScopedCollection = 'codebase' | 'decisions' | 'sprint-artifacts';
export type GlobalScopedCollection = 'decisions' | 'patterns' | 'retrospectives';

export interface GroundingMatch {
  text: string;
  source_path: string;
  start_line: number | null;
  collection: StandardGroundingCollection;
  score: number;
}

export interface GroundingBundle {
  query: string;
  collections: StandardGroundingCollection[];
  matches: GroundingMatch[];
}

interface RagGroundingServiceOptions {
  projectRoot: string;
  ragStore?: RagStoreFacade;
  embeddingProvider?: EmbeddingProviderFacade;
}

interface QueryCollectionOptions {
  topK?: number;
  threshold?: number;
  workspaceId?: string;
}

interface BuildAgentGroundingOptions extends QueryCollectionOptions {
  agentId: string;
  agentName: string;
  phase?: string;
  workspaceId?: string;
  questionnaireInput?: string | null;
  predecessorOutputs?: Record<string, string>;
  topKPerCollection?: number;
}

export interface AgentRagProfile {
  collections: StandardGroundingCollection[];
  topKPerCollection: number;
  threshold: number;
  maxMatches: number;
}

const CHAT_INTENT_COLLECTIONS: Record<ChatGroundingIntent, StandardGroundingCollection> = {
  decision_lookup: 'decisions',
  workspace_query: 'codebase',
  artifact_query: 'phase-outputs',
};

const AGENT_RAG_PROFILES: Record<string, AgentRagProfile> = {
  // Technical architecture and implementation agents prioritize codebase evidence.
  '05': {
    collections: ['codebase', 'decisions', 'phase-outputs', 'sprint-artifacts'],
    topKPerCollection: 3,
    threshold: 0.12,
    maxMatches: 10,
  },
  '06': {
    collections: ['codebase', 'decisions', 'phase-outputs', 'sprint-artifacts'],
    topKPerCollection: 3,
    threshold: 0.12,
    maxMatches: 10,
  },
  '07': {
    collections: ['codebase', 'sprint-artifacts', 'decisions', 'phase-outputs'],
    topKPerCollection: 3,
    threshold: 0.1,
    maxMatches: 10,
  },
  '08': {
    collections: ['codebase', 'decisions', 'phase-outputs', 'sprint-artifacts'],
    topKPerCollection: 3,
    threshold: 0.1,
    maxMatches: 10,
  },
  '09': {
    collections: ['phase-outputs', 'decisions', 'codebase', 'sprint-artifacts'],
    topKPerCollection: 3,
    threshold: 0.1,
    maxMatches: 9,
  },
  // Non-technical strategy agents should avoid codebase-heavy grounding by default.
  '14': {
    collections: ['decisions', 'phase-outputs', 'sprint-artifacts'],
    topKPerCollection: 2,
    threshold: 0.15,
    maxMatches: 6,
  },
  '15': {
    collections: ['decisions', 'phase-outputs', 'sprint-artifacts'],
    topKPerCollection: 2,
    threshold: 0.15,
    maxMatches: 6,
  },
  '16': {
    collections: ['decisions', 'phase-outputs', 'sprint-artifacts'],
    topKPerCollection: 2,
    threshold: 0.15,
    maxMatches: 6,
  },
};

const DEFAULT_AGENT_PROFILE: AgentRagProfile = {
  collections: ['decisions', 'phase-outputs', 'sprint-artifacts', 'codebase'],
  topKPerCollection: 2,
  threshold: 0.1,
  maxMatches: 8,
};

const PROFILE_CONFIG_RELATIVE_PATH = path.join('BusinessDocs', 'metrics', 'rag-profiles.json');

function normalizeAgentProfile(value: unknown): AgentRagProfile | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as {
    collections?: unknown;
    topKPerCollection?: unknown;
    threshold?: unknown;
    maxMatches?: unknown;
  };

  if (!Array.isArray(raw.collections) || raw.collections.length === 0) return null;
  const collections = raw.collections.filter(
    (entry): entry is StandardGroundingCollection =>
      entry === 'decisions' ||
      entry === 'phase-outputs' ||
      entry === 'codebase' ||
      entry === 'sprint-artifacts'
  );
  if (collections.length === 0) return null;

  const topKPerCollection =
    typeof raw.topKPerCollection === 'number' && Number.isFinite(raw.topKPerCollection)
      ? Math.max(1, Math.min(10, Math.floor(raw.topKPerCollection)))
      : DEFAULT_AGENT_PROFILE.topKPerCollection;

  const threshold =
    typeof raw.threshold === 'number' && Number.isFinite(raw.threshold)
      ? Math.max(0, Math.min(1, raw.threshold))
      : DEFAULT_AGENT_PROFILE.threshold;

  const maxMatches =
    typeof raw.maxMatches === 'number' && Number.isFinite(raw.maxMatches)
      ? Math.max(1, Math.min(30, Math.floor(raw.maxMatches)))
      : DEFAULT_AGENT_PROFILE.maxMatches;

  return {
    collections,
    topKPerCollection,
    threshold,
    maxMatches,
  };
}

function loadProfileOverrides(projectRoot: string): Record<string, AgentRagProfile> {
  const cfgPath =
    process.env.RAG_PROFILE_CONFIG && process.env.RAG_PROFILE_CONFIG.trim().length > 0
      ? path.resolve(projectRoot, process.env.RAG_PROFILE_CONFIG)
      : path.join(projectRoot, PROFILE_CONFIG_RELATIVE_PATH);

  if (!fs.existsSync(cfgPath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as {
      agentProfiles?: Record<string, unknown>;
    };
    const profiles = parsed.agentProfiles || {};
    const overrides: Record<string, AgentRagProfile> = {};

    for (const [agentId, profile] of Object.entries(profiles)) {
      const normalized = normalizeAgentProfile(profile);
      if (normalized) {
        overrides[agentId] = normalized;
      }
    }

    return overrides;
  } catch {
    return {};
  }
}

function sanitizeWorkspaceId(workspaceId?: string): string {
  const raw = (workspaceId || 'default').trim().toLowerCase();
  const normalized = raw.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'default';
}

export function resolveWorkspaceScopedCollectionId(
  workspaceId: string | undefined,
  collection: WorkspaceScopedCollection
): string {
  if (collection === 'sprint-artifacts') {
    return `sprint-artifacts--${sanitizeWorkspaceId(workspaceId)}`;
  }
  return `${sanitizeWorkspaceId(workspaceId)}::${collection}`;
}

export function resolveGlobalScopedCollectionId(collection: GlobalScopedCollection): string {
  return `global::${collection}`;
}

export function parseCollectionScope(collectionId: string): {
  scope: 'workspace' | 'global' | 'default';
  workspaceId: string | null;
  collection: string;
} {
  if (collectionId.startsWith('global::')) {
    return {
      scope: 'global',
      workspaceId: null,
      collection: collectionId.slice('global::'.length),
    };
  }

  const sep = collectionId.indexOf('::');
  if (sep > 0) {
    return {
      scope: 'workspace',
      workspaceId: collectionId.slice(0, sep),
      collection: collectionId.slice(sep + 2),
    };
  }

  return {
    scope: 'default',
    workspaceId: null,
    collection: collectionId,
  };
}

export function resolveGroundingCollectionId(
  collection: StandardGroundingCollection,
  workspaceId?: string
): string {
  if (collection !== 'sprint-artifacts') {
    return collection;
  }
  return `sprint-artifacts--${sanitizeWorkspaceId(workspaceId)}`;
}

export function resolveAgentRagProfile(options: {
  agentId: string;
  phase?: string;
  projectRoot?: string;
}): AgentRagProfile {
  const profileOverrides = options.projectRoot ? loadProfileOverrides(options.projectRoot) : {};
  const override = profileOverrides[options.agentId];
  if (override) {
    return override;
  }

  const byId = AGENT_RAG_PROFILES[options.agentId];
  if (byId) {
    return byId;
  }

  // Phase-level fallback keeps behavior deterministic when a new agent ID is introduced.
  const phase = (options.phase || '').toUpperCase();
  if (phase === 'PHASE_1' || phase === 'PHASE_4') {
    return {
      collections: ['decisions', 'phase-outputs', 'sprint-artifacts'],
      topKPerCollection: 2,
      threshold: 0.15,
      maxMatches: 6,
    };
  }
  if (phase === 'PHASE_2') {
    return {
      collections: ['codebase', 'decisions', 'phase-outputs', 'sprint-artifacts'],
      topKPerCollection: 3,
      threshold: 0.12,
      maxMatches: 10,
    };
  }

  return DEFAULT_AGENT_PROFILE;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function dedupeMatches(matches: GroundingMatch[]): GroundingMatch[] {
  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = [match.collection, match.source_path, match.start_line ?? '', match.text].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export class RagGroundingService {
  private readonly _projectRoot: string;
  private readonly _ragStore?: RagStoreFacade;
  private readonly _embeddingProvider?: EmbeddingProviderFacade;

  constructor(options: RagGroundingServiceOptions) {
    this._projectRoot = options.projectRoot;
    this._ragStore = options.ragStore;
    this._embeddingProvider = options.embeddingProvider;
  }

  hasServices(): boolean {
    return Boolean(this._ragStore && this._embeddingProvider);
  }

  async queryIntent(
    intent: ChatGroundingIntent,
    query: string,
    options: QueryCollectionOptions = {}
  ): Promise<GroundingBundle> {
    const collection = CHAT_INTENT_COLLECTIONS[intent];
    const matches = await this.queryCollection(collection, query, options);
    return {
      query: compactWhitespace(query),
      collections: [collection],
      matches,
    };
  }

  async buildAgentGrounding(options: BuildAgentGroundingOptions): Promise<GroundingBundle | null> {
    const questionnaireInput = options.questionnaireInput?.trim() || '';
    const predecessorOutputs = Object.entries(options.predecessorOutputs || {}).filter(
      ([, content]) => Boolean(content?.trim())
    );

    if (!questionnaireInput && predecessorOutputs.length === 0) {
      return null;
    }

    const predecessorSummary = predecessorOutputs
      .slice(0, 3)
      .map(([source, content]) => `${source}: ${truncate(compactWhitespace(content), 900)}`)
      .join('\n');

    const query = compactWhitespace(
      [
        `Agent ${options.agentId} ${options.agentName}`,
        questionnaireInput ? `Questionnaire ${truncate(questionnaireInput, 1800)}` : '',
        predecessorSummary ? `Predecessors ${predecessorSummary}` : '',
      ]
        .filter(Boolean)
        .join('\n\n')
    );

    const profile = resolveAgentRagProfile({
      agentId: options.agentId,
      phase: options.phase,
      projectRoot: this._projectRoot,
    });
    const collections = profile.collections;

    const matchLists = await Promise.all(
      collections.map(async (collection) => {
        try {
          return await this.queryCollection(collection, query, {
            topK: options.topKPerCollection ?? profile.topKPerCollection,
            threshold: options.threshold ?? profile.threshold,
            workspaceId: options.workspaceId,
          });
        } catch {
          return [];
        }
      })
    );

    const matches = dedupeMatches(matchLists.flat())
      .sort((left, right) => right.score - left.score)
      .slice(0, profile.maxMatches);

    if (matches.length === 0) {
      return null;
    }

    return {
      query,
      collections: Array.from(new Set(matches.map((match) => match.collection))),
      matches,
    };
  }

  async queryCollection(
    collection: StandardGroundingCollection,
    query: string,
    options: QueryCollectionOptions & { workspaceId?: string } = {}
  ): Promise<GroundingMatch[]> {
    if (!this._ragStore || !this._embeddingProvider) {
      return [];
    }

    const normalizedQuery = compactWhitespace(query);
    if (!normalizedQuery) {
      return [];
    }

    const queryVector = await this._embeddingProvider.embedText(normalizedQuery);
    const results = await this._ragStore.query(
      resolveGroundingCollectionId(collection, options.workspaceId),
      queryVector,
      options.topK ?? 5,
      options.threshold ?? 0
    );

    return results.map((result) => ({
      text: result.chunk.chunk_text,
      source_path: this.normalizeSourcePath(result.chunk.source_path),
      start_line: Number.isFinite(result.chunk.start_line) ? result.chunk.start_line : null,
      collection,
      score: result.score,
    }));
  }

  private normalizeSourcePath(sourcePath: string): string {
    return path.isAbsolute(sourcePath)
      ? path.relative(this._projectRoot, sourcePath).replace(/\\/g, '/')
      : sourcePath.replace(/\\/g, '/');
  }
}
