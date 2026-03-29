import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { buildStableMonacoUri } from '@/lib/editor/model-registry';
import {
  extractMonacoProviderContractsFromPackMetadata,
  getMonacoProviderGovernanceIssues,
} from '@/lib/editor/provider-registry';
import { extractMonacoSchemaBindingsFromPackMetadata } from '@/lib/editor/schema-registry';
import { resolveMonacoWorkerKind } from '@/lib/editor/editor-shell';
import type {
  MonacoSchemaBindingContract,
  OrchestratorPackMetadataResponse,
} from '@/lib/api-types';

function readPackManifest(relativePath: string): OrchestratorPackMetadataResponse {
  const manifestPath = path.resolve(process.cwd(), '..', '..', '..', relativePath);
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  return {
    ok: true,
    pack: {
      manifest_version: String(parsed.schemaVersion || ''),
      id: String(parsed.name || ''),
      name: String(parsed.displayName || parsed.name || ''),
      version: String(parsed.version || ''),
    },
    commands: Array.isArray(parsed.commands)
      ? (parsed.commands as Array<Record<string, unknown>>)
      : [],
    stages: Array.isArray(parsed.stages) ? (parsed.stages as Array<Record<string, unknown>>) : [],
    gates: Array.isArray(parsed.gates) ? (parsed.gates as Array<Record<string, unknown>>) : [],
    labels: {
      commands: {},
      stages: {},
      gates: {},
    },
    help_topics: [],
    capabilities: {
      supportsRuntimeGraph: false,
      supportsCommandCatalog: false,
      supportsHelpTopics: false,
      supportsArtifactNamespaces: false,
      supportsGateAssets: false,
      supportsMonacoProviders: true,
      parallelDispatchStates: [],
    },
    editorProviders:
      parsed.editorProviders && typeof parsed.editorProviders === 'object'
        ? (parsed.editorProviders as OrchestratorPackMetadataResponse['editorProviders'])
        : undefined,
    editorSchemas:
      parsed.editorSchemas && typeof parsed.editorSchemas === 'object'
        ? (parsed.editorSchemas as OrchestratorPackMetadataResponse['editorSchemas'])
        : undefined,
    warnings: [],
  };
}

const packManifests = [
  {
    id: 'sdlc',
    path: 'templates/sdlc/manifest.json',
  },
  {
    id: 'ops-command-center',
    path: 'templates/ops-command-center/manifest.json',
  },
] as const;

function assertGate(condition: boolean, details: string): void {
  if (!condition) {
    throw new Error(`Monaco governance gate failed: ${details}`);
  }
}

function readFileFromUi(relativePath: string): string {
  const filePath = path.resolve(process.cwd(), relativePath);
  return fs.readFileSync(filePath, 'utf8');
}

describe('Monaco pack conformance', () => {
  it('enforces provider registration capability per pack [owner=pack][module=provider-registry]', () => {
    for (const pack of packManifests) {
      const metadata = readPackManifest(pack.path);
      const providers = extractMonacoProviderContractsFromPackMetadata(metadata);
      const governanceIssues = getMonacoProviderGovernanceIssues(pack.id, providers);

      assertGate(
        providers.length > 0,
        `[owner=pack:${pack.id}][module=provider-registry] Missing Monaco provider contracts.`
      );
      assertGate(
        providers.some((provider) => provider.kind === 'hover'),
        `[owner=pack:${pack.id}][module=provider-registry] Missing hover provider.`
      );
      assertGate(
        providers.some((provider) => provider.kind === 'completion'),
        `[owner=pack:${pack.id}][module=provider-registry] Missing completion provider.`
      );
      assertGate(
        providers.some((provider) => provider.kind === 'codelens'),
        `[owner=pack:${pack.id}][module=provider-registry] Missing codelens provider.`
      );
      assertGate(
        governanceIssues.length === 0,
        `[owner=pack:${pack.id}][module=provider-registry] ${governanceIssues
          .map((issue) => `[code=${issue.code}] ${issue.detail}`)
          .join(' | ')}`
      );
    }
  });

  it('enforces URI-aware schema bindings for json and yaml per pack [owner=pack][module=schema-registry]', () => {
    for (const pack of packManifests) {
      const metadata = readPackManifest(pack.path);
      const bindings = extractMonacoSchemaBindingsFromPackMetadata(metadata);

      assertGate(
        bindings.length > 0,
        `[owner=pack:${pack.id}][module=schema-registry] Missing schema bindings.`
      );
      assertGate(
        bindings.some((binding) => binding.language === 'json'),
        `[owner=pack:${pack.id}][module=schema-registry] Missing json schema binding.`
      );
      assertGate(
        bindings.some((binding) => binding.language === 'yaml'),
        `[owner=pack:${pack.id}][module=schema-registry] Missing yaml schema binding.`
      );
      assertGate(
        bindings.every((binding) => binding.modelUri.startsWith('agentic://')),
        `[owner=pack:${pack.id}][module=schema-registry] Non-agentic model URI detected.`
      );
    }
  });

  it('keeps model lifecycle URI mapping deterministic for schema locators [owner=core][module=model-registry]', () => {
    for (const pack of packManifests) {
      const metadata = readPackManifest(pack.path);
      const schemaBindings =
        metadata.editorSchemas?.monaco?.bindings ?? metadata.editorSchemas?.bindings ?? [];

      const uris = new Set<string>();
      for (const binding of schemaBindings as MonacoSchemaBindingContract[]) {
        const uri1 = buildStableMonacoUri({
          ...binding.modelLocator,
          workspaceId: binding.modelLocator.workspaceId || metadata.pack.id,
        });
        const uri2 = buildStableMonacoUri({
          ...binding.modelLocator,
          workspaceId: binding.modelLocator.workspaceId || metadata.pack.id,
        });

        assertGate(
          uri1 === uri2,
          `[owner=pack:${pack.id}][module=model-registry] Non-deterministic URI mapping for binding ${binding.id}.`
        );
        uris.add(uri1);
      }

      assertGate(
        uris.size === schemaBindings.length,
        `[owner=pack:${pack.id}][module=model-registry] URI collision detected across schema bindings.`
      );
    }
  });

  it('keeps worker routing behavior stable for Monaco labels [owner=core][module=editor-shell]', () => {
    assertGate(
      resolveMonacoWorkerKind('json') === 'json',
      '[owner=core][module=editor-shell] Label json must route to json worker.'
    );
    assertGate(
      resolveMonacoWorkerKind('scss') === 'css',
      '[owner=core][module=editor-shell] Label scss must route to css worker.'
    );
    assertGate(
      resolveMonacoWorkerKind('less') === 'css',
      '[owner=core][module=editor-shell] Label less must route to css worker.'
    );
    assertGate(
      resolveMonacoWorkerKind('handlebars') === 'html',
      '[owner=core][module=editor-shell] Label handlebars must route to html worker.'
    );
    assertGate(
      resolveMonacoWorkerKind('typescript') === 'typescript',
      '[owner=core][module=editor-shell] Label typescript must route to typescript worker.'
    );
    assertGate(
      resolveMonacoWorkerKind('javascript') === 'typescript',
      '[owner=core][module=editor-shell] Label javascript must route to typescript worker.'
    );
    assertGate(
      resolveMonacoWorkerKind('plaintext') === 'editor',
      '[owner=core][module=editor-shell] Unknown labels must route to editor worker.'
    );
  });

  it('keeps worker-safe ESM contract intact [owner=core][module=editor-shell]', () => {
    const editorShellSource = readFileFromUi('src/lib/editor/editor-shell.tsx');

    assertGate(
      editorShellSource.includes('editor.worker?worker') &&
        editorShellSource.includes('json.worker?worker') &&
        editorShellSource.includes('css.worker?worker') &&
        editorShellSource.includes('html.worker?worker') &&
        editorShellSource.includes('ts.worker?worker'),
      '[owner=core][module=editor-shell] Worker-safe ESM imports are incomplete.'
    );
    assertGate(
      editorShellSource.includes('window.MonacoEnvironment') &&
        editorShellSource.includes('getWorker:'),
      '[owner=core][module=editor-shell] MonacoEnvironment.getWorker contract missing.'
    );
  });

  it('covers model lifecycle attach/dispose contract on pane unmount [owner=core][module=monaco-host-panels]', () => {
    const hostPanelsSource = readFileFromUi('src/components/cockpit/monaco-host-panels.tsx');

    assertGate(
      hostPanelsSource.includes('retainModel('),
      '[owner=core][module=monaco-host-panels] retainModel attach contract missing.'
    );
    assertGate(
      hostPanelsSource.includes('releaseModel('),
      '[owner=core][module=monaco-host-panels] releaseModel detach contract missing.'
    );
    assertGate(
      hostPanelsSource.includes('editorViewStateByUri.set') &&
        hostPanelsSource.includes('diffViewStateByPair.set'),
      '[owner=core][module=monaco-host-panels] ViewState persistence contract missing.'
    );
  });
});
