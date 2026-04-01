import path from 'node:path';
import { getStore } from '../store';
import { getDurableDataStore } from './durable-data-store';

interface RepositoryWriteInput<T> {
  filePath: string;
  value: T;
  snapshotType: string;
  scope?: string;
  runId?: string | null;
  onAudit?: () => void;
}

export class ControlPlaneStateRepository {
  private readonly projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  private toScope(filePath: string): string {
    return path.relative(this.projectRoot, filePath).replace(/\\/g, '/');
  }

  readJson<T>(filePath: string, fallback: T): T {
    const store = getStore();
    const durableStore = getDurableDataStore(this.projectRoot);
    if (!store.exists(filePath)) {
      const rehydrated = durableStore.getLatestSnapshot('file_state', this.toScope(filePath));
      if (rehydrated !== null && rehydrated !== undefined) {
        try {
          store.writeFile(filePath, JSON.stringify(rehydrated, null, 2), 'utf8');
          return rehydrated as T;
        } catch {
          return rehydrated as T;
        }
      }
      return fallback;
    }
    try {
      return JSON.parse(store.readFile(filePath, 'utf8')) as T;
    } catch {
      const rehydrated = durableStore.getLatestSnapshot('file_state', this.toScope(filePath));
      if (rehydrated !== null && rehydrated !== undefined) {
        try {
          store.writeFile(filePath, JSON.stringify(rehydrated, null, 2), 'utf8');
          return rehydrated as T;
        } catch {
          return rehydrated as T;
        }
      }
      return fallback;
    }
  }

  writeJson<T>(input: RepositoryWriteInput<T>): void {
    const store = getStore();
    const durableStore = getDurableDataStore(this.projectRoot);
    const scope = input.scope || this.toScope(input.filePath);
    const previousExists = store.exists(input.filePath);
    const previousRaw = previousExists ? store.readFile(input.filePath, 'utf8') : null;
    const previousSnapshot = durableStore.getLatestSnapshot('file_state', scope);
    try {
      store.writeFile(input.filePath, JSON.stringify(input.value, null, 2), 'utf8');
      input.onAudit?.();
      durableStore.saveControlPlaneSnapshot({
        snapshotType: input.snapshotType,
        scope,
        payload: input.value,
        runId: input.runId || null,
      });
      durableStore.saveControlPlaneSnapshot({
        snapshotType: 'file_state',
        scope,
        payload: input.value,
        runId: input.runId || null,
      });
    } catch (error) {
      if (previousExists && previousRaw !== null) {
        try {
          store.writeFile(input.filePath, previousRaw, 'utf8');
        } catch {
          // Keep original failure as primary signal; rollback best-effort only.
        }
      }
      if (previousSnapshot !== null && previousSnapshot !== undefined) {
        try {
          durableStore.saveControlPlaneSnapshot({
            snapshotType: 'file_state',
            scope,
            payload: previousSnapshot,
            runId: input.runId || null,
          });
        } catch {
          // Keep original failure as primary signal; rollback best-effort only.
        }
      }
      throw error;
    }
  }

  saveSessionState(filePath: string, value: Record<string, unknown>): string {
    const durableStore = getDurableDataStore(this.projectRoot);
    const runId = durableStore.syncWorkflowRunFromState(value);
    this.writeJson({
      filePath,
      value,
      snapshotType: 'session_state',
      runId,
    });
    return runId;
  }

  saveRunHistory(filePath: string, runs: unknown[]): void {
    this.writeJson({
      filePath,
      value: runs,
      snapshotType: 'run_history',
    });
  }

  saveCommandQueue(filePath: string, queue: unknown[]): void {
    this.writeJson({
      filePath,
      value: queue,
      snapshotType: 'command_queue',
    });
  }

  saveRemediationTasks(filePath: string, tasks: unknown[]): void {
    this.writeJson({
      filePath,
      value: tasks,
      snapshotType: 'remediation_tasks',
    });
  }

  saveChatSession(filePath: string, sessionId: string, session: Record<string, unknown>): void {
    this.writeJson({
      filePath,
      value: session,
      snapshotType: 'chat_session',
      scope: sessionId,
    });
  }
}
