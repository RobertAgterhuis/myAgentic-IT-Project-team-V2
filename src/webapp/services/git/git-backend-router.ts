import fs from 'node:fs';

import type {
  GitBackend,
  GitBranchOptions,
  GitBranchResult,
  GitCommitResult,
  GitDiffResult,
  GitLogOptions,
  GitLogResult,
  GitMutationResult,
  GitRemoteOp,
  GitRemoteResult,
  GitStatusResult,
  ResultTuple,
} from './git-backend';
import type { GitAuthorIdentity } from './isomorphic-git-backend';
import { IsomorphicGitBackend } from './isomorphic-git-backend';
import { NativeGitBackend } from './native-git-backend';

export type GitBackendKind = 'isomorphic' | 'native' | 'provider-api';
export type GitBackendSelection = GitBackendKind | 'auto';

interface AuditLogger {
  log(entry: {
    operation: string;
    entityType: string;
    entityId?: string | null;
    user?: string;
    summary?: string | null;
  }): void;
}

export interface GitBackendRouterOptions {
  repositoryPath: string;
  author?: GitAuthorIdentity;
  workspaceId?: string;
  env?: Record<string, string | undefined>;
  factories?: Partial<Record<GitBackendKind, () => GitBackend>>;
  audit?: AuditLogger;
  workspaceConfig?: {
    git?: {
      backend?: GitBackendSelection;
    };
  };
}

export class GitBackendUnavailableError extends Error {
  readonly backend: GitBackendKind;

  constructor(backend: GitBackendKind, message?: string) {
    super(message || `Git backend unavailable: ${backend}`);
    this.name = 'GitBackendUnavailableError';
    this.backend = backend;
  }
}

function parseBackend(value: string | undefined): GitBackendKind | 'auto' {
  const normalized = (value || 'auto').trim().toLowerCase();
  if (normalized === 'auto' || normalized === '') return 'auto';
  if (normalized === 'isomorphic' || normalized === 'native' || normalized === 'provider-api') {
    return normalized;
  }
  throw new Error(`Unsupported GIT_BACKEND value: ${value}`);
}

function isUnimplementedError(error: Error): boolean {
  const rawCode = (error as Error & { code?: string }).code || '';
  const rawMessage = error.message || '';
  return (
    /unimplemented|notimplemented/i.test(rawCode) ||
    /unimplemented|not implemented/i.test(rawMessage)
  );
}

class FallbackGitBackend implements GitBackend {
  private activeBackend: GitBackend;
  private readonly nativeBackendFactory: () => GitBackend;
  private readonly onFallback: (reason: string) => void;

  constructor(options: {
    primaryBackend: GitBackend;
    nativeBackendFactory: () => GitBackend;
    onFallback: (reason: string) => void;
  }) {
    this.activeBackend = options.primaryBackend;
    this.nativeBackendFactory = options.nativeBackendFactory;
    this.onFallback = options.onFallback;
  }

  private async execute<T>(
    operation: (backend: GitBackend) => Promise<ResultTuple<T>>
  ): Promise<ResultTuple<T>> {
    const [value, error] = await operation(this.activeBackend);
    if (!error) {
      return [value, null];
    }

    if (!isUnimplementedError(error)) {
      return [null, error];
    }

    this.onFallback(error.message || 'isomorphic-git reported unimplemented feature');
    this.activeBackend = this.nativeBackendFactory();
    return operation(this.activeBackend);
  }

  status(): Promise<ResultTuple<GitStatusResult>> {
    return this.execute((backend) => backend.status());
  }

  add(files: readonly string[]): Promise<ResultTuple<GitMutationResult>> {
    return this.execute((backend) => backend.add(files));
  }

  remove(files: readonly string[]): Promise<ResultTuple<GitMutationResult>> {
    return this.execute((backend) => backend.remove(files));
  }

  commit(message: string): Promise<ResultTuple<GitCommitResult>> {
    return this.execute((backend) => backend.commit(message));
  }

  diff(file?: string): Promise<ResultTuple<GitDiffResult>> {
    return this.execute((backend) => backend.diff(file));
  }

  log(opts?: GitLogOptions): Promise<ResultTuple<GitLogResult>> {
    return this.execute((backend) => backend.log(opts));
  }

  branch(opts: GitBranchOptions): Promise<ResultTuple<GitBranchResult>> {
    return this.execute((backend) => backend.branch(opts));
  }

  fetchPullPush(
    op: GitRemoteOp,
    remote: string,
    branch?: string
  ): Promise<ResultTuple<GitRemoteResult>> {
    return this.execute((backend) => backend.fetchPullPush(op, remote, branch));
  }
}

export class GitBackendRouter {
  private readonly repositoryPath: string;
  private readonly audit?: AuditLogger;
  private readonly env: Record<string, string | undefined>;
  private readonly workspaceConfig?: GitBackendRouterOptions['workspaceConfig'];
  private readonly factories: Partial<Record<GitBackendKind, () => GitBackend>>;

  constructor(options: GitBackendRouterOptions) {
    this.repositoryPath = options.repositoryPath;
    this.audit = options.audit;
    this.env = options.env || process.env;
    this.workspaceConfig = options.workspaceConfig;
    this.factories = {
      isomorphic: () =>
        new IsomorphicGitBackend({
          repositoryPath: options.repositoryPath,
          author: options.author,
          workspaceId: options.workspaceId,
        }),
      native: () =>
        new NativeGitBackend({
          repositoryPath: options.repositoryPath,
        }),
      ...options.factories,
    };
  }

  private logFallback(reason: string): void {
    this.audit?.log({
      operation: 'git_backend_fallback',
      entityType: 'git_backend',
      entityId: this.repositoryPath,
      user: 'system',
      summary: JSON.stringify({
        level: 'info',
        from: 'isomorphic',
        to: 'native',
        reason,
        repositoryPath: this.repositoryPath,
        timestamp: new Date().toISOString(),
      }),
    });
  }

  private shouldUseNativeForFeatures(): string | null {
    const attributesPath = `${this.repositoryPath}/.gitattributes`;
    if (fs.existsSync(attributesPath)) {
      const attributes = fs.readFileSync(attributesPath, 'utf8');
      if (/filter=lfs/i.test(attributes)) {
        return 'lfs_detected';
      }
    }

    const submodulesPath = `${this.repositoryPath}/.gitmodules`;
    if (fs.existsSync(submodulesPath)) {
      return 'submodules_detected';
    }

    return null;
  }

  private autoDetect(): GitBackendKind {
    const nativeReason = this.shouldUseNativeForFeatures();
    if (nativeReason && this.factories.native) {
      this.logFallback(nativeReason);
      return 'native';
    }

    if (this.factories.isomorphic) return 'isomorphic';
    if (this.factories.native) return 'native';
    if (this.factories['provider-api']) return 'provider-api';
    throw new GitBackendUnavailableError('isomorphic', 'No git backends are available');
  }

  resolveBackendKind(): GitBackendKind {
    const configured = parseBackend(this.workspaceConfig?.git?.backend ?? this.env.GIT_BACKEND);
    if (configured === 'auto') {
      return this.autoDetect();
    }
    return configured;
  }

  getBackend(): GitBackend {
    const backendKind = this.resolveBackendKind();
    const factory = this.factories[backendKind];
    if (!factory) {
      throw new GitBackendUnavailableError(backendKind);
    }

    if (backendKind !== 'isomorphic' || !this.factories.native) {
      return factory();
    }

    return new FallbackGitBackend({
      primaryBackend: factory(),
      nativeBackendFactory: this.factories.native,
      onFallback: (reason) => this.logFallback(reason),
    });
  }
}
