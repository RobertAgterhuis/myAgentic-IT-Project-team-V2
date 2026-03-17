// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Repository Indexer (M25-007)
 *
 * Scans registered repositories for key indicator files and
 * builds a service inventory with technology stack detection.
 *
 * Supported stacks: Node/TypeScript, .NET, Python, Go, Java, Rust.
 * Supports monorepo detection via package.json workspaces, lerna.json, etc.
 *
 * The index result is stored via StorageProvider for later querying.
 *
 * @module engine/workspace/repo-indexer
 */

import type { StorageProvider, Document } from '../persistence/storage-provider';
import type { Service, ServiceType, Repository } from './types';

// ─── Constants ────────────────────────────────────────────────

const INDEX_COLLECTION = 'repo-index';

// ─── Stack detection rules ────────────────────────────────────

interface StackIndicator {
  file: string;
  stack: string[];
  serviceType?: ServiceType;
}

const ROOT_INDICATORS: StackIndicator[] = [
  { file: 'package.json', stack: ['node'], serviceType: 'api' },
  { file: 'tsconfig.json', stack: ['typescript'] },
  { file: 'Dockerfile', stack: ['docker'] },
  { file: 'docker-compose.yml', stack: ['docker'] },
  { file: 'requirements.txt', stack: ['python'], serviceType: 'api' },
  { file: 'pyproject.toml', stack: ['python'], serviceType: 'api' },
  { file: 'setup.py', stack: ['python'], serviceType: 'api' },
  { file: 'go.mod', stack: ['go'], serviceType: 'api' },
  { file: 'Cargo.toml', stack: ['rust'], serviceType: 'api' },
  { file: 'pom.xml', stack: ['java', 'maven'], serviceType: 'api' },
  { file: 'build.gradle', stack: ['java', 'gradle'], serviceType: 'api' },
  { file: '*.csproj', stack: ['dotnet', 'csharp'], serviceType: 'api' },
  { file: '*.fsproj', stack: ['dotnet', 'fsharp'], serviceType: 'api' },
  { file: '*.sln', stack: ['dotnet'] },
  { file: 'next.config.js', stack: ['node', 'nextjs'], serviceType: 'web' },
  { file: 'next.config.mjs', stack: ['node', 'nextjs'], serviceType: 'web' },
  { file: 'nuxt.config.ts', stack: ['node', 'nuxt'], serviceType: 'web' },
  { file: 'vite.config.ts', stack: ['node', 'vite'], serviceType: 'web' },
  { file: 'angular.json', stack: ['node', 'angular'], serviceType: 'web' },
  { file: 'terraform.tf', stack: ['terraform'], serviceType: 'infra' },
  { file: 'main.tf', stack: ['terraform'], serviceType: 'infra' },
  { file: 'main.bicep', stack: ['bicep'], serviceType: 'infra' },
  { file: 'pulumi.yaml', stack: ['pulumi'], serviceType: 'infra' },
];

// ─── Scan Result Types ────────────────────────────────────────

export interface RepoIndexEntry {
  repoId: string;
  indexedAt: string;
  services: Service[];
  rootStack: string[];
  fileIndicators: string[];
}

// ─── File System Abstraction (injected) ───────────────────────

export interface FsScanner {
  /** Check if a file or directory exists. */
  exists(filePath: string): boolean | Promise<boolean>;
  /** List entries in a directory (file-name only, dirs end with /). */
  readdir(dirPath: string): string[] | Promise<string[]>;
  /** Read a text file. */
  readFile(filePath: string): string | Promise<string>;
}

// ─── Indexer ──────────────────────────────────────────────────

export class RepoIndexer {
  private storage: StorageProvider;

  constructor(storage: StorageProvider) {
    this.storage = storage;
  }

  /**
   * Scan a repository root and produce a RepoIndexEntry.
   *
   * @param repo    — The Repository metadata (id, url, etc.)
   * @param fs      — File-system scanner (DI for testability / remote repos)
   * @param rootDir — Absolute path to the repository root
   */
  async indexRepository(repo: Repository, fs: FsScanner, rootDir: string): Promise<RepoIndexEntry> {
    const rootStack = new Set<string>();
    const fileIndicators: string[] = [];
    let rootServiceType: ServiceType = 'other';

    // 1. Check root-level indicators
    for (const ind of ROOT_INDICATORS) {
      const matched = await this.matchIndicator(fs, rootDir, ind.file);
      if (matched) {
        for (const s of ind.stack) rootStack.add(s);
        fileIndicators.push(ind.file);
        if (ind.serviceType) rootServiceType = ind.serviceType;
      }
    }

    // 2. Detect monorepo workspaces
    const services: Service[] = [];
    const workspacePaths = await this.detectWorkspaces(fs, rootDir);

    if (workspacePaths.length > 0) {
      // Monorepo: each workspace dir is a service
      for (const wsPath of workspacePaths) {
        const svc = await this.scanServiceDir(fs, wsPath, rootDir);
        if (svc) services.push(svc);
      }
    } else {
      // Single-service repo
      services.push({
        id: repo.id,
        name: repo.name,
        path: '.',
        stack: Array.from(rootStack),
        type: rootServiceType,
      });
    }

    const entry: RepoIndexEntry = {
      repoId: repo.id,
      indexedAt: new Date().toISOString(),
      services,
      rootStack: Array.from(rootStack),
      fileIndicators,
    };

    // Persist the index
    await this.storage.write(INDEX_COLLECTION, repo.id, entry as unknown as Document);

    return entry;
  }

  /** Retrieve a previously stored index for a repository. */
  async getIndex(repoId: string): Promise<RepoIndexEntry | null> {
    const doc = await this.storage.read(INDEX_COLLECTION, repoId);
    return doc as unknown as RepoIndexEntry | null;
  }

  /** List all indexed repositories. */
  async listIndexes(): Promise<RepoIndexEntry[]> {
    const docs = await this.storage.list(INDEX_COLLECTION);
    return docs as unknown as RepoIndexEntry[];
  }

  // ── Private helpers ──────────────────────────────────────

  private async matchIndicator(fs: FsScanner, dir: string, pattern: string): Promise<boolean> {
    if (pattern.startsWith('*')) {
      // Glob matching: check if any file ends with the extension
      const ext = pattern.slice(1); // e.g. ".csproj"
      try {
        const entries = await fs.readdir(dir);
        return entries.some((e) => e.endsWith(ext));
      } catch {
        return false;
      }
    }
    try {
      return await fs.exists(`${dir}/${pattern}`);
    } catch {
      return false;
    }
  }

  private async detectWorkspaces(fs: FsScanner, rootDir: string): Promise<string[]> {
    const paths: string[] = [];

    // npm/yarn workspaces via package.json
    try {
      const raw = await fs.readFile(`${rootDir}/package.json`);
      const pkg = JSON.parse(raw);
      if (pkg.workspaces) {
        const globs: string[] = Array.isArray(pkg.workspaces)
          ? pkg.workspaces
          : (pkg.workspaces.packages ?? []);
        for (const g of globs) {
          // Simple expansion: strip trailing /* or /** and list dirs
          const base = g.replace(/\/\*\*?$/, '').replace(/\*$/, '');
          if (!base) continue;
          try {
            const entries = await fs.readdir(`${rootDir}/${base}`);
            for (const entry of entries) {
              if (entry.endsWith('/')) {
                paths.push(`${rootDir}/${base}/${entry.slice(0, -1)}`);
              }
            }
          } catch {
            // directory doesn't exist — skip
          }
        }
      }
    } catch {
      // no package.json or parse error
    }

    // lerna.json
    try {
      if (await fs.exists(`${rootDir}/lerna.json`)) {
        const raw = await fs.readFile(`${rootDir}/lerna.json`);
        const lerna = JSON.parse(raw);
        if (lerna.packages) {
          for (const g of lerna.packages as string[]) {
            const base = g.replace(/\/\*\*?$/, '').replace(/\*$/, '');
            if (!base) continue;
            try {
              const entries = await fs.readdir(`${rootDir}/${base}`);
              for (const entry of entries) {
                if (entry.endsWith('/')) {
                  paths.push(`${rootDir}/${base}/${entry.slice(0, -1)}`);
                }
              }
            } catch {
              /* skip */
            }
          }
        }
      }
    } catch {
      /* skip */
    }

    return [...new Set(paths)];
  }

  private async scanServiceDir(
    fs: FsScanner,
    dirPath: string,
    rootDir: string
  ): Promise<Service | null> {
    const stack = new Set<string>();
    let serviceType: ServiceType = 'other';

    for (const ind of ROOT_INDICATORS) {
      const matched = await this.matchIndicator(fs, dirPath, ind.file);
      if (matched) {
        for (const s of ind.stack) stack.add(s);
        if (ind.serviceType) serviceType = ind.serviceType;
      }
    }

    if (stack.size === 0) return null;

    const relativePath = dirPath.startsWith(rootDir)
      ? dirPath.slice(rootDir.length).replace(/^[/\\]+/, '') || '.'
      : dirPath;

    const dirName = dirPath.split('/').pop() || dirPath.split('\\').pop() || 'unknown';

    return {
      id: dirName.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
      name: dirName,
      path: relativePath,
      stack: Array.from(stack),
      type: serviceType,
    };
  }
}
