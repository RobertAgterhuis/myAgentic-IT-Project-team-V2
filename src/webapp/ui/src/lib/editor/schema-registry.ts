import { buildStableMonacoUri } from '@/lib/editor/model-registry';
import { getEditorShellState, initializeEditorShell } from '@/lib/editor/editor-shell';
import type { MonacoModelLocator, OrchestratorPackMetadataResponse } from '@/lib/api-types';

type MonacoSchemaBindingNormalized = {
  id: string;
  language: 'json' | 'yaml';
  schemaUri: string;
  modelUri: string;
  required: boolean;
};

type YamlConfigureDisposable = {
  dispose: () => void;
};

function normalizeSchemaBindings(
  bindings: unknown[],
  workspaceId?: string
): MonacoSchemaBindingNormalized[] {
  const normalized: MonacoSchemaBindingNormalized[] = [];

  for (const item of bindings) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const candidate = item as Record<string, unknown>;
    const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    const languageRaw =
      typeof candidate.language === 'string' ? candidate.language.trim().toLowerCase() : '';
    const schemaUri = typeof candidate.schemaUri === 'string' ? candidate.schemaUri.trim() : '';
    const required = candidate.required === true;
    const modelLocator = candidate.modelLocator as MonacoModelLocator | undefined;

    if (!id || !schemaUri || !modelLocator || typeof modelLocator !== 'object') {
      continue;
    }

    if (languageRaw !== 'json' && languageRaw !== 'yaml') {
      continue;
    }

    const modelUri = buildStableMonacoUri({
      ...modelLocator,
      workspaceId: modelLocator.workspaceId || workspaceId,
    });

    normalized.push({
      id,
      language: languageRaw,
      schemaUri,
      modelUri,
      required,
    });
  }

  return normalized;
}

function toGlobUri(modelUri: string): string {
  // Monaco schema matching accepts URI globs; stable URI anchor guarantees pack-agnostic matching.
  return `${modelUri}*`;
}

export function extractMonacoSchemaBindingsFromPackMetadata(
  metadata?: OrchestratorPackMetadataResponse | null
): MonacoSchemaBindingNormalized[] {
  if (!metadata) {
    return [];
  }

  const workspaceId = metadata.pack.id;
  const directBindings = metadata.editorSchemas?.monaco?.bindings;
  if (Array.isArray(directBindings)) {
    return normalizeSchemaBindings(directBindings, workspaceId);
  }

  const topLevelBindings = metadata.editorSchemas?.bindings;
  if (Array.isArray(topLevelBindings)) {
    return normalizeSchemaBindings(topLevelBindings, workspaceId);
  }

  const raw = metadata as unknown as Record<string, unknown>;
  if (Array.isArray(raw.monacoSchemaBindings)) {
    return normalizeSchemaBindings(raw.monacoSchemaBindings, workspaceId);
  }

  return [];
}

export class MonacoSchemaRegistry {
  private activePackId: string | null = null;

  private activeBindingKey: string = '';

  private yamlDisposable: YamlConfigureDisposable | null = null;

  clear(): void {
    this.activePackId = null;
    this.activeBindingKey = '';
    if (this.yamlDisposable) {
      this.yamlDisposable.dispose();
      this.yamlDisposable = null;
    }
  }

  private buildBindingKey(bindings: MonacoSchemaBindingNormalized[]): string {
    return bindings
      .map(
        (binding) =>
          `${binding.language}|${binding.schemaUri}|${binding.modelUri}|${binding.required}`
      )
      .sort()
      .join(';;');
  }

  async registerPackBindings(
    packId: string,
    bindings: MonacoSchemaBindingNormalized[]
  ): Promise<void> {
    await initializeEditorShell();
    const shellState = getEditorShellState();
    if (!shellState.protocolAllowed) {
      return;
    }

    const monaco = await import('monaco-editor/esm/vs/editor/editor.api.js');

    const bindingKey = this.buildBindingKey(bindings);
    if (this.activePackId === packId && this.activeBindingKey === bindingKey) {
      return;
    }

    this.activePackId = packId;
    this.activeBindingKey = bindingKey;

    const jsonSchemas = bindings
      .filter((binding) => binding.language === 'json')
      .map((binding) => ({
        uri: binding.schemaUri,
        fileMatch: [toGlobUri(binding.modelUri)],
      }));

    const jsonDefaults = (
      monaco.languages as unknown as {
        json?: {
          jsonDefaults?: {
            setDiagnosticsOptions: (options: {
              validate: boolean;
              enableSchemaRequest: boolean;
              schemas: Array<{ uri: string; fileMatch: string[] }>;
            }) => void;
          };
        };
      }
    ).json?.jsonDefaults;

    if (jsonDefaults) {
      jsonDefaults.setDiagnosticsOptions({
        validate: true,
        enableSchemaRequest: true,
        schemas: jsonSchemas,
      });
    }

    const yamlSchemas = bindings
      .filter((binding) => binding.language === 'yaml')
      .map((binding) => ({
        uri: binding.schemaUri,
        fileMatch: [toGlobUri(binding.modelUri)],
      }));

    if (this.yamlDisposable) {
      this.yamlDisposable.dispose();
      this.yamlDisposable = null;
    }

    if (yamlSchemas.length > 0) {
      const yamlModule = await import('monaco-yaml');
      this.yamlDisposable = yamlModule.configureMonacoYaml(monaco, {
        validate: true,
        enableSchemaRequest: true,
        schemas: yamlSchemas,
      });
    }
  }

  async registerFromPackMetadata(
    metadata?: OrchestratorPackMetadataResponse | null
  ): Promise<void> {
    const packId = metadata?.pack.id;
    if (!packId) {
      this.clear();
      return;
    }

    const bindings = extractMonacoSchemaBindingsFromPackMetadata(metadata);
    await this.registerPackBindings(packId, bindings);
  }
}

export const monacoSchemaRegistry = new MonacoSchemaRegistry();
