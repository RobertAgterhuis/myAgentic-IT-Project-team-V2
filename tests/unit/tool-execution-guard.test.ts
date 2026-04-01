import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ToolExecutionGuard } from '../../src/webapp/tool-execution-guard';

function createGovernanceStub() {
  return {
    getToolExecutionApprovalStatus: () => ({ approved: true, pending: false, status: null }),
    requestToolExecutionApproval: () => ({ approvalId: 'APR-1' }),
  };
}

function writeManifest(baseDir: string, agentId: string, content: unknown): void {
  const dir = path.join(baseDir, '.generated', 'runtime-manifests');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${agentId}.json`), JSON.stringify(content, null, 2), 'utf8');
}

describe('ToolExecutionGuard', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length) {
      const dir = tempDirs.pop();
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('blocks when runtime manifest is missing (deny by default)', async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-missing-manifest-'));
    tempDirs.push(projectRoot);

    const guard = new ToolExecutionGuard({
      projectRoot,
      governanceService: createGovernanceStub() as never,
      defaultAgentId: 'orchestrator',
      defaultServerId: 'command-center',
    });

    const result = await guard.evaluate({
      toolName: 'get_project_status',
      envScope: 'dev',
      expectedEnvScope: 'dev',
      params: {},
      trustedAgentId: 'orchestrator',
    });

    expect(result?.blocked).toBe(true);
    expect(result?.reasonCode).toBe('RUNTIME_MANIFEST_MISSING');
  });

  it('blocks when manifest does not include managed server record', async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-missing-server-'));
    tempDirs.push(projectRoot);
    writeManifest(projectRoot, 'orchestrator', {
      agentId: 'orchestrator',
      generatedAt: new Date().toISOString(),
      servers: [{ serverId: 'different-server', tools: [] }],
    });

    const guard = new ToolExecutionGuard({
      projectRoot,
      governanceService: createGovernanceStub() as never,
      defaultAgentId: 'orchestrator',
      defaultServerId: 'command-center',
    });

    const result = await guard.evaluate({
      toolName: 'get_project_status',
      envScope: 'dev',
      expectedEnvScope: 'dev',
      params: {},
      trustedAgentId: 'orchestrator',
    });

    expect(result?.blocked).toBe(true);
    expect(result?.reasonCode).toBe('RUNTIME_SERVER_RECORD_MISSING');
  });

  it('uses trusted identity source instead of caller-supplied agent_id', async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-trusted-identity-'));
    tempDirs.push(projectRoot);

    writeManifest(projectRoot, 'orchestrator', {
      agentId: 'orchestrator',
      generatedAt: new Date().toISOString(),
      servers: [
        {
          serverId: 'command-center',
          tools: [
            {
              toolId: 'command-center.get_project_status',
              permissionLevel: 'R',
              approvalRequired: false,
              approvalMode: 'none',
              blocked: false,
            },
          ],
        },
      ],
    });

    const guard = new ToolExecutionGuard({
      projectRoot,
      governanceService: createGovernanceStub() as never,
      defaultAgentId: 'orchestrator',
      defaultServerId: 'command-center',
    });

    const result = await guard.evaluate({
      toolName: 'get_project_status',
      envScope: 'dev',
      expectedEnvScope: 'dev',
      params: { agent_id: 'malicious-escalation' },
      trustedAgentId: 'orchestrator',
    });

    expect(result).toBeNull();
  });
});
