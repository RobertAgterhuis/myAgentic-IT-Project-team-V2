import { getEditorShellState, initializeEditorShell } from '@/lib/editor/editor-shell';
import type {
  MonacoCodeLensProviderContract,
  MonacoCompletionItemContract,
  MonacoCompletionProviderContract,
  MonacoHoverProviderContract,
  MonacoProviderContract,
  OrchestratorPackMetadataResponse,
} from '@/lib/api-types';

type MonacoApi = typeof import('monaco-editor/esm/vs/editor/editor.api.js');
type MonacoCompletionKind =
  import('monaco-editor/esm/vs/editor/editor.api.js').languages.CompletionItemKind;

type Disposable = {
  dispose: () => void;
};

type MonacoWithLanguages = MonacoApi['languages'];

export interface MonacoProviderGovernanceIssue {
  code: 'duplicate-provider-id' | 'duplicate-kind-language';
  packOwner: string;
  module: 'provider-registry';
  detail: string;
}

export function getMonacoProviderGovernanceIssues(
  packOwner: string,
  contracts: MonacoProviderContract[]
): MonacoProviderGovernanceIssue[] {
  const issues: MonacoProviderGovernanceIssue[] = [];
  const seenIds = new Set<string>();
  const seenKindLanguage = new Set<string>();

  for (const contract of contracts) {
    const idKey = contract.id.trim().toLowerCase();
    if (seenIds.has(idKey)) {
      issues.push({
        code: 'duplicate-provider-id',
        packOwner,
        module: 'provider-registry',
        detail: `Duplicate provider id "${contract.id}".`,
      });
    }
    seenIds.add(idKey);

    const kindLanguageKey = `${contract.kind}:${contract.language}`.toLowerCase();
    if (seenKindLanguage.has(kindLanguageKey)) {
      issues.push({
        code: 'duplicate-kind-language',
        packOwner,
        module: 'provider-registry',
        detail: `Duplicate provider registration key "${contract.kind}:${contract.language}".`,
      });
    }
    seenKindLanguage.add(kindLanguageKey);
  }

  return issues;
}

function assertMonacoProviderGovernance(
  packOwner: string,
  contracts: MonacoProviderContract[]
): void {
  const issues = getMonacoProviderGovernanceIssues(packOwner, contracts);
  if (issues.length === 0) {
    return;
  }

  const report = issues
    .map(
      (issue) =>
        `[owner=${issue.packOwner}][module=${issue.module}][code=${issue.code}] ${issue.detail}`
    )
    .join('\n');

  throw new Error(`Monaco provider governance gate failed:\n${report}`);
}

function normalizeContracts(contracts: unknown[]): MonacoProviderContract[] {
  const normalized: MonacoProviderContract[] = [];

  for (const contract of contracts) {
    if (!contract || typeof contract !== 'object') {
      continue;
    }

    const candidate = contract as Record<string, unknown>;
    const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    const kind = typeof candidate.kind === 'string' ? candidate.kind.trim().toLowerCase() : '';
    const language =
      typeof candidate.language === 'string' ? candidate.language.trim().toLowerCase() : '';
    const enabled = candidate.enabled;

    if (!id || !language || enabled === false) {
      continue;
    }

    if (kind === 'hover' && typeof candidate.markdown === 'string') {
      normalized.push({
        id,
        kind: 'hover',
        language,
        label: typeof candidate.label === 'string' ? candidate.label : undefined,
        markdown: candidate.markdown,
        match:
          candidate.match && typeof candidate.match === 'object'
            ? {
                words: Array.isArray((candidate.match as { words?: unknown }).words)
                  ? ((candidate.match as { words: unknown[] }).words.filter(
                      (entry): entry is string => typeof entry === 'string'
                    ) as string[])
                  : undefined,
                contains: Array.isArray((candidate.match as { contains?: unknown }).contains)
                  ? ((candidate.match as { contains: unknown[] }).contains.filter(
                      (entry): entry is string => typeof entry === 'string'
                    ) as string[])
                  : undefined,
                regex:
                  typeof (candidate.match as { regex?: unknown }).regex === 'string'
                    ? (candidate.match as { regex: string }).regex
                    : undefined,
              }
            : undefined,
        enabled: typeof enabled === 'boolean' ? enabled : undefined,
      });
      continue;
    }

    if (kind === 'completion' && Array.isArray(candidate.items)) {
      const items = candidate.items
        .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        .map((item): MonacoCompletionItemContract | null => {
          const label = typeof item.label === 'string' ? item.label : '';
          if (!label) {
            return null;
          }
          return {
            label,
            insertText: typeof item.insertText === 'string' ? item.insertText : undefined,
            detail: typeof item.detail === 'string' ? item.detail : undefined,
            documentation: typeof item.documentation === 'string' ? item.documentation : undefined,
            kind: typeof item.kind === 'string' ? item.kind : undefined,
          };
        })
        .filter((item): item is MonacoCompletionItemContract => item !== null);

      if (items.length === 0) {
        continue;
      }

      normalized.push({
        id,
        kind: 'completion',
        language,
        label: typeof candidate.label === 'string' ? candidate.label : undefined,
        triggerCharacters: Array.isArray(candidate.triggerCharacters)
          ? candidate.triggerCharacters.filter(
              (entry): entry is string => typeof entry === 'string' && entry.length > 0
            )
          : undefined,
        items,
        enabled: typeof enabled === 'boolean' ? enabled : undefined,
      });
      continue;
    }

    if (kind === 'codelens' && Array.isArray(candidate.lenses)) {
      const lenses = candidate.lenses
        .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
        .map((entry) => {
          const lineNumber = Number(entry.lineNumber);
          const title = typeof entry.title === 'string' ? entry.title : '';
          if (!Number.isFinite(lineNumber) || lineNumber < 1 || !title) {
            return null;
          }

          return {
            lineNumber,
            title,
            command: typeof entry.command === 'string' ? entry.command : undefined,
            arguments: Array.isArray(entry.arguments) ? entry.arguments : undefined,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

      if (lenses.length === 0) {
        continue;
      }

      normalized.push({
        id,
        kind: 'codelens',
        language,
        label: typeof candidate.label === 'string' ? candidate.label : undefined,
        lenses,
        enabled: typeof enabled === 'boolean' ? enabled : undefined,
      });
      continue;
    }
  }

  return normalized;
}

export function extractMonacoProviderContractsFromPackMetadata(
  metadata?: OrchestratorPackMetadataResponse | null
): MonacoProviderContract[] {
  if (!metadata) {
    return [];
  }

  const fromTypedContract = metadata.editorProviders?.monaco?.providers;
  if (Array.isArray(fromTypedContract)) {
    return normalizeContracts(fromTypedContract);
  }

  const fromTypedProviders = metadata.editorProviders?.providers;
  if (Array.isArray(fromTypedProviders)) {
    return normalizeContracts(fromTypedProviders);
  }

  const raw = metadata as unknown as Record<string, unknown>;
  const fallbackCandidates: unknown[] = [];

  const monacoProviders = raw.monacoProviders;
  if (Array.isArray(monacoProviders)) {
    fallbackCandidates.push(...monacoProviders);
  }

  const editorProviders = raw.editorProviders;
  if (editorProviders && typeof editorProviders === 'object') {
    const editorProvidersRecord = editorProviders as Record<string, unknown>;
    if (Array.isArray(editorProvidersRecord.providers)) {
      fallbackCandidates.push(...editorProvidersRecord.providers);
    }
    if (
      editorProvidersRecord.monaco &&
      typeof editorProvidersRecord.monaco === 'object' &&
      Array.isArray((editorProvidersRecord.monaco as { providers?: unknown[] }).providers)
    ) {
      fallbackCandidates.push(
        ...((editorProvidersRecord.monaco as { providers: unknown[] }).providers ?? [])
      );
    }
  }

  return normalizeContracts(fallbackCandidates);
}

function matchesHoverContract(
  contract: MonacoHoverProviderContract,
  lineContent: string,
  selectedWord: string
): boolean {
  const match = contract.match;
  if (!match) {
    return true;
  }

  if (Array.isArray(match.words) && match.words.length > 0) {
    if (
      match.words.some(
        (word) => word.localeCompare(selectedWord, undefined, { sensitivity: 'base' }) === 0
      )
    ) {
      return true;
    }
  }

  if (Array.isArray(match.contains) && match.contains.length > 0) {
    if (match.contains.some((value) => lineContent.toLowerCase().includes(value.toLowerCase()))) {
      return true;
    }
  }

  if (typeof match.regex === 'string' && match.regex.trim()) {
    try {
      return new RegExp(match.regex, 'i').test(lineContent);
    } catch {
      return false;
    }
  }

  return false;
}

function resolveCompletionKind(
  languages: MonacoWithLanguages,
  kind?: string
): MonacoCompletionKind {
  if (!kind) {
    return languages.CompletionItemKind.Text;
  }

  const normalized = kind.trim().toLowerCase();
  switch (normalized) {
    case 'keyword':
      return languages.CompletionItemKind.Keyword;
    case 'function':
      return languages.CompletionItemKind.Function;
    case 'snippet':
      return languages.CompletionItemKind.Snippet;
    case 'variable':
      return languages.CompletionItemKind.Variable;
    case 'module':
      return languages.CompletionItemKind.Module;
    case 'class':
      return languages.CompletionItemKind.Class;
    default:
      return languages.CompletionItemKind.Text;
  }
}

function registerHoverProvider(
  monaco: MonacoApi,
  contract: MonacoHoverProviderContract
): Disposable {
  return monaco.languages.registerHoverProvider(contract.language, {
    provideHover(model, position) {
      const lineContent = model.getLineContent(position.lineNumber);
      const word = model.getWordAtPosition(position)?.word ?? '';

      if (!matchesHoverContract(contract, lineContent, word)) {
        return null;
      }

      const hoverRange = word
        ? new monaco.Range(
            position.lineNumber,
            position.column - word.length,
            position.lineNumber,
            position.column
          )
        : new monaco.Range(position.lineNumber, 1, position.lineNumber, lineContent.length + 1);

      return {
        range: hoverRange,
        contents: [{ value: contract.markdown }],
      };
    },
  });
}

function registerCompletionProvider(
  monaco: MonacoApi,
  contract: MonacoCompletionProviderContract
): Disposable {
  return monaco.languages.registerCompletionItemProvider(contract.language, {
    triggerCharacters: contract.triggerCharacters,
    provideCompletionItems(model, position) {
      const range = model.getWordUntilPosition(position);
      const replacementRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: range.startColumn,
        endColumn: range.endColumn,
      };

      return {
        suggestions: contract.items.map((item) => ({
          label: item.label,
          insertText: item.insertText ?? item.label,
          detail: item.detail,
          documentation: item.documentation,
          kind: resolveCompletionKind(monaco.languages, item.kind),
          range: replacementRange,
        })),
      };
    },
  });
}

function registerCodeLensProvider(
  monaco: MonacoApi,
  contract: MonacoCodeLensProviderContract
): Disposable {
  return monaco.languages.registerCodeLensProvider(contract.language, {
    provideCodeLenses(model) {
      const totalLines = Math.max(1, model.getLineCount());
      return {
        lenses: contract.lenses.map((lens) => ({
          range: {
            startLineNumber: Math.min(Math.max(1, lens.lineNumber), totalLines),
            startColumn: 1,
            endLineNumber: Math.min(Math.max(1, lens.lineNumber), totalLines),
            endColumn: 1,
          },
          id: `${contract.id}-${lens.lineNumber}-${lens.title}`,
          command: {
            id: lens.command || 'editor.action.showHover',
            title: lens.title,
            arguments: lens.arguments,
          },
        })),
        dispose() {
          // Monaco provider payload contract includes dispose for API shape compatibility.
        },
      };
    },
  });
}

export class MonacoProviderRegistry {
  private activePackId: string | null = null;

  private providerDisposablesByPack = new Map<string, Disposable[]>();

  private disposePack(packId: string): void {
    const disposables = this.providerDisposablesByPack.get(packId) ?? [];
    for (const disposable of disposables) {
      disposable.dispose();
    }
    this.providerDisposablesByPack.delete(packId);
  }

  clear(): void {
    if (this.activePackId) {
      this.disposePack(this.activePackId);
      this.activePackId = null;
    }
  }

  async registerPackContracts(packId: string, contracts: MonacoProviderContract[]): Promise<void> {
    assertMonacoProviderGovernance(packId, contracts);

    await initializeEditorShell();
    const shellState = getEditorShellState();
    if (!shellState.protocolAllowed) {
      return;
    }

    const monaco = await import('monaco-editor/esm/vs/editor/editor.api.js');

    if (this.activePackId && this.activePackId !== packId) {
      this.disposePack(this.activePackId);
    }

    this.disposePack(packId);

    const activeContracts = contracts.filter((contract) => contract.enabled !== false);
    const disposables: Disposable[] = [];

    for (const contract of activeContracts) {
      if (contract.kind === 'hover') {
        disposables.push(registerHoverProvider(monaco, contract));
        continue;
      }

      if (contract.kind === 'completion') {
        disposables.push(registerCompletionProvider(monaco, contract));
        continue;
      }

      if (contract.kind === 'codelens') {
        disposables.push(registerCodeLensProvider(monaco, contract));
      }
    }

    if (disposables.length !== activeContracts.length) {
      throw new Error(
        `[owner=${packId}][module=provider-registry][code=disposable-balance] Registered ${activeContracts.length} providers but tracked ${disposables.length} disposables.`
      );
    }

    this.providerDisposablesByPack.set(packId, disposables);
    this.activePackId = packId;
  }

  async registerFromPackMetadata(
    metadata?: OrchestratorPackMetadataResponse | null
  ): Promise<void> {
    const packId = metadata?.pack.id;
    if (!packId) {
      this.clear();
      return;
    }

    const contracts = extractMonacoProviderContractsFromPackMetadata(metadata);
    await this.registerPackContracts(packId, contracts);
  }
}

export const monacoProviderRegistry = new MonacoProviderRegistry();
