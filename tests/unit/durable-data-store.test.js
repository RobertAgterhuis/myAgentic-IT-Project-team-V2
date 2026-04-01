import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  getDurableDataStore,
  resetDurableDataStoreForTests,
} from '../../src/webapp/services/durable-data-store';
import { ControlPlaneStateRepository } from '../../src/webapp/services/control-plane-state-repository';

function createTempProjectRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'durable-data-store-'));
}

describe('DurableDataStore', () => {
  let projectRoot;

  beforeEach(() => {
    projectRoot = createTempProjectRoot();
    fs.mkdirSync(path.join(projectRoot, 'BusinessDocs', 'session'), { recursive: true });
  });

  afterEach(() => {
    resetDurableDataStoreForTests(projectRoot);
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('persists workflow runs and tool call lineage', () => {
    const store = getDurableDataStore(projectRoot);

    const runId = store.syncWorkflowRunFromState({
      session_id: 'sess-1',
      projectName: 'Test Project',
      mode: 'CREATE',
      status: 'PHASE_2',
      state_history: [{ from: 'PHASE_1', to: 'PHASE_2' }],
      gate_results: { critic: 'passed' },
      initiated_at: '2026-01-01T00:00:00.000Z',
      last_updated: '2026-01-01T00:05:00.000Z',
    });

    store.recordToolCall({
      call_id: 'call-1',
      run_id: runId,
      tool_name: 'get_project_status',
      status: 'completed',
      started_at: '2026-01-01T00:01:00.000Z',
      duration_ms: 125,
      input: { scope: 'session' },
      output: { ok: true },
    });

    const [run] = store.listWorkflowRuns();
    const [toolCall] = store.listToolCalls(runId);

    expect(run.run_id).toBe(runId);
    expect(run.session_id).toBe('sess-1');
    expect(run.project).toBe('Test Project');
    expect(run.mode).toBe('CREATE');
    expect(run.state_history).toEqual([{ from: 'PHASE_1', to: 'PHASE_2' }]);
    expect(run.gate_results).toEqual({ critic: 'passed' });
    expect(toolCall).toMatchObject({
      call_id: 'call-1',
      run_id: runId,
      tool_name: 'get_project_status',
      status: 'completed',
      duration_ms: 125,
      input: { scope: 'session' },
      output: { ok: true },
    });
  });

  it('captures control-plane snapshots through the repository abstraction', () => {
    const repository = new ControlPlaneStateRepository(projectRoot);
    const filePath = path.join(projectRoot, 'BusinessDocs', 'session', 'session-state.json');

    const runId = repository.saveSessionState(filePath, {
      session_id: 'sess-2',
      projectName: 'Snapshot Project',
      mode: 'AUDIT',
      status: 'PHASE_1',
      state_history: [],
      gate_results: {},
      last_updated: '2026-01-01T00:00:00.000Z',
    });

    const durableStore = getDurableDataStore(projectRoot);
    const snapshot = durableStore.getLatestSnapshot(
      'session_state',
      'BusinessDocs/session/session-state.json'
    );
    const [run] = durableStore.listWorkflowRuns();

    expect(runId).toBe(run.run_id);
    expect(JSON.parse(fs.readFileSync(filePath, 'utf8'))).toMatchObject({
      session_id: 'sess-2',
      projectName: 'Snapshot Project',
      mode: 'AUDIT',
    });
    expect(snapshot).toMatchObject({
      session_id: 'sess-2',
      projectName: 'Snapshot Project',
      mode: 'AUDIT',
    });
  });

  it('creates verifiable backups for critical files and restores them', () => {
    const targetPath = path.join(projectRoot, 'BusinessDocs', 'session', 'session-state.json');
    fs.writeFileSync(targetPath, JSON.stringify({ status: 'PHASE_1' }, null, 2), 'utf8');

    const store = getDurableDataStore(projectRoot);
    const backup = store
      .ensureBackupsForCriticalFiles()
      .find((entry) => entry.target_path === targetPath);

    expect(backup).toBeDefined();
    fs.writeFileSync(targetPath, JSON.stringify({ status: 'CORRUPTED' }, null, 2), 'utf8');

    const restored = store.restoreBackup(backup.backup_id);

    expect(restored.restore_tested_at).toBeTruthy();
    expect(JSON.parse(fs.readFileSync(targetPath, 'utf8'))).toEqual({ status: 'PHASE_1' });
  });
});
