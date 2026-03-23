#!/usr/bin/env tsx
// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'node:path';
import { createStorageProvider } from '../../../../platform/engine/persistence';
import { McpGovernanceService } from './service';

interface CliArgs {
  command: string[];
  apply: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  return {
    command: args.filter((a) => !a.startsWith('--')),
    apply: args.includes('--apply'),
    dryRun: args.includes('--dry-run'),
  };
}

function printUsage(): void {
  process.stdout.write(
    [
      'MCP Governance CLI',
      '',
      'Usage:',
      '  npm run plugin -- init',
      '  npm run plugin -- bootstrap --apply',
      '  npm run plugin -- agents sync [--apply|--dry-run]',
      '  npm run plugin -- mcp sync [--apply|--dry-run]',
      '  npm run plugin -- policy sync [--apply|--dry-run]',
      '  npm run plugin -- policies sync [--apply|--dry-run]',
      '  npm run plugin -- tool-policies sync [--apply|--dry-run]',
      '  npm run plugin -- runtime build',
      '  npm run plugin -- doctor',
      '',
    ].join('\n')
  );
}

async function buildService(projectRoot: string): Promise<McpGovernanceService> {
  const providerType = (process.env.STORAGE_PROVIDER || 'file').toLowerCase();
  const storageProvider = await createStorageProvider({
    provider: providerType === 'sqlite' ? 'sqlite' : 'file',
    basePath:
      providerType === 'file'
        ? process.env.STORAGE_PATH || path.join(projectRoot, '.agentic', 'storage')
        : undefined,
    dbPath:
      providerType === 'sqlite'
        ? process.env.STORAGE_PATH || path.join(projectRoot, '.agentic', 'data.db')
        : undefined,
  });

  return new McpGovernanceService({
    projectRoot,
    storageProvider,
  });
}

async function run(overrideProjectRoot?: string): Promise<void> {
  const parsed = parseArgs(process.argv);
  const [cmd, sub] = parsed.command;

  if (!cmd) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const projectRoot = overrideProjectRoot ?? path.resolve(__dirname, '../../../..');
  const service = await buildService(projectRoot);

  if (cmd === 'init') {
    const result = await service.ensureConfigScaffold();
    process.stdout.write(`${JSON.stringify({ ok: true, command: 'init', ...result }, null, 2)}\n`);
    return;
  }

  if (cmd === 'bootstrap') {
    const migration = await service.runSqliteMigrations();
    const apply = parsed.apply || !parsed.dryRun;
    const [agentSync, serverSync, serverPolicySync, toolPolicySync] = await Promise.all([
      service.syncAgents(await service.getDefinedAgents(), { dryRun: !apply }),
      service.syncServers(await service.getDefinedServers(), { dryRun: !apply }),
      service.syncServerPolicies(await service.getDefinedPolicies(), { dryRun: !apply }),
      service.syncToolPolicies(await service.getDefinedToolPolicies(), { dryRun: !apply }),
    ]);
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          command: 'bootstrap',
          apply,
          migration,
          agents: agentSync,
          servers: serverSync,
          serverPolicies: serverPolicySync,
          toolPolicies: toolPolicySync,
        },
        null,
        2
      )}\n`
    );
    return;
  }

  if (cmd === 'agents' && sub === 'sync') {
    const apply = parsed.apply || !parsed.dryRun;
    const result = await service.syncAgents(await service.getDefinedAgents(), { dryRun: !apply });
    process.stdout.write(
      `${JSON.stringify({ ok: true, command: 'agents sync', apply, ...result }, null, 2)}\n`
    );
    return;
  }

  if (cmd === 'mcp' && sub === 'sync') {
    const apply = parsed.apply || !parsed.dryRun;
    const result = await service.syncServers(await service.getDefinedServers(), { dryRun: !apply });
    process.stdout.write(
      `${JSON.stringify({ ok: true, command: 'mcp sync', apply, ...result }, null, 2)}\n`
    );
    return;
  }

  if ((cmd === 'policy' || cmd === 'policies') && sub === 'sync') {
    const apply = parsed.apply || !parsed.dryRun;
    const result = await service.syncServerPolicies(await service.getDefinedPolicies(), {
      dryRun: !apply,
    });
    process.stdout.write(
      `${JSON.stringify(
        { ok: true, command: cmd === 'policy' ? 'policy sync' : 'policies sync', apply, ...result },
        null,
        2
      )}\n`
    );
    return;
  }

  if (cmd === 'tool-policies' && sub === 'sync') {
    const apply = parsed.apply || !parsed.dryRun;
    const result = await service.syncToolPolicies(await service.getDefinedToolPolicies(), {
      dryRun: !apply,
    });
    process.stdout.write(
      `${JSON.stringify({ ok: true, command: 'tool-policies sync', apply, ...result }, null, 2)}\n`
    );
    return;
  }

  if (cmd === 'runtime' && sub === 'build') {
    const result = await service.buildRuntimeArtifacts();
    process.stdout.write(
      `${JSON.stringify({ ok: true, command: 'runtime build', ...result }, null, 2)}\n`
    );
    return;
  }

  if (cmd === 'doctor') {
    const result = await service.doctor();
    process.stdout.write(
      `${JSON.stringify({ ok: true, command: 'doctor', ...result }, null, 2)}\n`
    );
    return;
  }

  printUsage();
  process.exitCode = 1;
}

export { parseArgs, printUsage, buildService, run };

if (require.main === module) {
  run().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${JSON.stringify({ ok: false, error: message }, null, 2)}\n`);
    process.exitCode = 1;
  });
}
