// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Version Resolver
 *
 * Resolves the next release version based on semantic versioning rules and
 * the types of changes since the last release. Follows Conventional Commits
 * conventions:
 *
 * - BREAKING CHANGE → major bump
 * - feat → minor bump
 * - fix, chore, docs, etc. → patch bump
 *
 * Zero external dependencies. Pure functions.
 *
 * @module engine/version-resolver
 */

// ─── Types ──────────────────────────────────────────────────

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

export type ChangeType =
  | 'breaking'
  | 'feature'
  | 'fix'
  | 'chore'
  | 'docs'
  | 'refactor'
  | 'test'
  | 'perf';

export interface ChangeEntry {
  type: ChangeType;
  scope?: string;
  description: string;
  /** Commit hash or task ID */
  ref?: string;
}

export interface VersionBump {
  previous: string;
  next: string;
  bump: 'major' | 'minor' | 'patch' | 'none';
  changes: ChangeEntry[];
}

// ─── Conventional Commit prefix → ChangeType ────────────────

const PREFIX_MAP: Record<string, ChangeType> = {
  feat: 'feature',
  fix: 'fix',
  chore: 'chore',
  docs: 'docs',
  refactor: 'refactor',
  test: 'test',
  perf: 'perf',
  style: 'chore',
  ci: 'chore',
  build: 'chore',
};

// ─── Parse / Format ─────────────────────────────────────────

/**
 * Parse a semver string (e.g. "1.2.3", "v2.0.0-beta.1") into components.
 */
export function parseSemVer(version: string): SemVer {
  const cleaned = version.replace(/^v/, '');
  const [corePart, ...preParts] = cleaned.split('-');
  const parts = corePart.split('.').map(Number);

  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
    prerelease: preParts.length > 0 ? preParts.join('-') : undefined,
  };
}

/**
 * Format a SemVer object to a version string.
 */
export function formatSemVer(ver: SemVer): string {
  const core = `${ver.major}.${ver.minor}.${ver.patch}`;
  return ver.prerelease ? `${core}-${ver.prerelease}` : core;
}

// ─── Change Classification ──────────────────────────────────

/**
 * Parse a conventional commit subject line into a ChangeEntry.
 * Returns null if the subject doesn't match the expected format.
 */
export function parseCommitSubject(subject: string, ref?: string): ChangeEntry | null {
  // Match: type(scope)?: description  or  type!: description (breaking)
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?\s*:\s*(.+)$/);
  if (!match) return null;

  const [, prefix, scope, bang, description] = match;
  const isBreaking = !!bang || /^BREAKING CHANGE\b/i.test(description);
  const type: ChangeType = isBreaking ? 'breaking' : PREFIX_MAP[prefix.toLowerCase()] || 'chore';

  return { type, scope: scope || undefined, description: description.trim(), ref };
}

/**
 * Classify an array of change entries by their highest impact type.
 */
export function classifyChanges(changes: ChangeEntry[]): 'major' | 'minor' | 'patch' | 'none' {
  if (changes.length === 0) return 'none';

  const hasBreaking = changes.some((c) => c.type === 'breaking');
  if (hasBreaking) return 'major';

  const hasFeature = changes.some((c) => c.type === 'feature');
  if (hasFeature) return 'minor';

  return 'patch';
}

// ─── Version Resolution ─────────────────────────────────────

/**
 * Resolve the next version based on the previous version and change entries.
 */
export function resolveNextVersion(previousVersion: string, changes: ChangeEntry[]): VersionBump {
  const prev = parseSemVer(previousVersion);
  const bump = classifyChanges(changes);

  const next: SemVer = { ...prev, prerelease: undefined };
  switch (bump) {
    case 'major':
      next.major += 1;
      next.minor = 0;
      next.patch = 0;
      break;
    case 'minor':
      next.minor += 1;
      next.patch = 0;
      break;
    case 'patch':
      next.patch += 1;
      break;
    case 'none':
      break;
  }

  return {
    previous: formatSemVer(prev),
    next: formatSemVer(next),
    bump,
    changes,
  };
}

// ─── Release History ─────────────────────────────────────────

export interface ReleaseRecord {
  version: string;
  created_at: string;
  task_ids: string[];
  changes: ChangeEntry[];
}

/**
 * In-memory release history with query capabilities.
 */
export class ReleaseHistory {
  private _releases: ReleaseRecord[] = [];

  add(record: ReleaseRecord): void {
    this._releases.push(record);
    this._releases.sort((a, b) => {
      const aSem = parseSemVer(a.version);
      const bSem = parseSemVer(b.version);
      return aSem.major - bSem.major || aSem.minor - bSem.minor || aSem.patch - bSem.patch;
    });
  }

  latest(): ReleaseRecord | undefined {
    return this._releases[this._releases.length - 1];
  }

  get(version: string): ReleaseRecord | undefined {
    const normalized = formatSemVer(parseSemVer(version));
    return this._releases.find((r) => formatSemVer(parseSemVer(r.version)) === normalized);
  }

  all(): readonly ReleaseRecord[] {
    return this._releases;
  }

  count(): number {
    return this._releases.length;
  }

  /** Serialize to JSON-safe object */
  toJSON(): ReleaseRecord[] {
    return [...this._releases];
  }

  /** Hydrate from serialized data */
  static fromJSON(data: ReleaseRecord[]): ReleaseHistory {
    const history = new ReleaseHistory();
    for (const record of data) {
      history.add(record);
    }
    return history;
  }
}
