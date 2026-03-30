import { getEditorShellState, initializeEditorShell } from './editor-shell';
import type { MonacoModelAttachment, MonacoModelLocator } from '@/lib/api-types';

type MonacoApi = typeof import('monaco-editor/esm/vs/editor/editor.api.js');
type MonacoTextModel = import('monaco-editor/esm/vs/editor/editor.api.js').editor.ITextModel;

let monacoApiPromise: Promise<MonacoApi | null> | null = null;
const modelRefCounts = new Map<string, number>();

function normalizeSegment(input: string): string {
  return input
    .trim()
    .replace(/[\\/]+/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();
}

function encodeSegments(pathLike: string): string {
  const normalized = normalizeSegment(pathLike);
  if (!normalized) return '';
  return normalized
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function resolveWorkspaceId(locator: MonacoModelLocator): string {
  const workspaceId = typeof locator.workspaceId === 'string' ? locator.workspaceId : '';
  const normalized = normalizeSegment(workspaceId);
  return normalized || 'default';
}

function resolveLanguage(locator: MonacoModelLocator): string | undefined {
  const language = typeof locator.language === 'string' ? locator.language.trim() : '';
  return language || undefined;
}

export function buildStableMonacoUri(locator: MonacoModelLocator): string {
  const workspaceId = resolveWorkspaceId(locator);
  const objectId = encodeSegments(locator.objectId || 'object');
  const encodedPath = encodeSegments(locator.path || '');

  if (locator.namespace === 'workspace') {
    const targetPath = encodedPath || objectId;
    return `agentic://workspace/${workspaceId}/${targetPath}`;
  }

  if (locator.namespace === 'repo') {
    const targetPath = encodedPath || objectId;
    return `agentic://repo/${workspaceId}/${targetPath}`;
  }

  const targetPath = encodedPath ? `${objectId}/${encodedPath}` : objectId;
  return `agentic://artifact/${workspaceId}/${targetPath}`;
}

async function getMonacoApi(): Promise<MonacoApi | null> {
  if (!monacoApiPromise) {
    monacoApiPromise = (async () => {
      await initializeEditorShell();
      const shellState = getEditorShellState();
      if (!shellState.protocolAllowed) {
        return null;
      }
      return import('monaco-editor/esm/vs/editor/editor.api.js');
    })();
  }

  return monacoApiPromise;
}

function toAttachment(
  locator: MonacoModelLocator,
  uri: string,
  reused: boolean
): MonacoModelAttachment {
  return {
    uri,
    namespace: locator.namespace,
    objectId: locator.objectId,
    workspaceId: resolveWorkspaceId(locator),
    path: locator.path,
    language: resolveLanguage(locator),
    reused,
  };
}

function getModelByUri(monaco: MonacoApi, uri: string): MonacoTextModel | null {
  return monaco.editor.getModel(monaco.Uri.parse(uri));
}

export class MonacoModelRegistry {
  async ensureModel(
    locator: MonacoModelLocator,
    initialValue = ''
  ): Promise<MonacoModelAttachment> {
    const uri = buildStableMonacoUri(locator);
    const monaco = await getMonacoApi();
    if (!monaco) {
      return toAttachment(locator, uri, false);
    }

    const existingModel = getModelByUri(monaco, uri);
    if (existingModel) {
      return toAttachment(locator, uri, true);
    }

    monaco.editor.createModel(initialValue, resolveLanguage(locator), monaco.Uri.parse(uri));
    return toAttachment(locator, uri, false);
  }

  async upsertModelContent(
    locator: MonacoModelLocator,
    content: string
  ): Promise<MonacoModelAttachment> {
    const attachment = await this.ensureModel(locator, content);
    const monaco = await getMonacoApi();
    if (!monaco) {
      return attachment;
    }

    const model = getModelByUri(monaco, attachment.uri);
    if (model && model.getValue() !== content) {
      model.setValue(content);
    }

    return attachment;
  }

  async retainModel(
    locator: MonacoModelLocator,
    content: string,
    modelUri?: string
  ): Promise<MonacoModelAttachment> {
    const attachment = modelUri
      ? toAttachment(locator, modelUri, true)
      : await this.upsertModelContent(locator, content);
    const currentRefCount = modelRefCounts.get(attachment.uri) || 0;
    modelRefCounts.set(attachment.uri, currentRefCount + 1);
    return attachment;
  }

  async releaseModel(uri: string): Promise<void> {
    const currentRefCount = modelRefCounts.get(uri) || 0;
    if (currentRefCount <= 1) {
      modelRefCounts.delete(uri);
      await this.disposeModel(uri);
      return;
    }

    modelRefCounts.set(uri, currentRefCount - 1);
  }

  async disposeModel(uri: string): Promise<void> {
    const monaco = await getMonacoApi();
    if (!monaco) return;

    const model = getModelByUri(monaco, uri);
    model?.dispose();
  }

  async disposeNamespace(namespace: MonacoModelLocator['namespace']): Promise<void> {
    const monaco = await getMonacoApi();
    if (!monaco) return;

    const prefix = `agentic://${namespace}/`;
    for (const model of monaco.editor.getModels()) {
      if (model.uri.toString().startsWith(prefix)) {
        model.dispose();
      }
    }
  }
}

export const monacoModelRegistry = new MonacoModelRegistry();

interface ArtifactModelLocatorInput {
  artifactId: string;
  artifactPath?: string;
  workspaceId?: string;
  mimeType?: string;
}

function inferLanguageFromArtifact(input: ArtifactModelLocatorInput): string {
  const mimeType = (input.mimeType || '').toLowerCase();
  const artifactPath = (input.artifactPath || '').toLowerCase();

  if (mimeType.includes('json') || artifactPath.endsWith('.json')) return 'json';
  if (
    mimeType.includes('yaml') ||
    artifactPath.endsWith('.yaml') ||
    artifactPath.endsWith('.yml')
  ) {
    return 'yaml';
  }
  if (mimeType.includes('markdown') || artifactPath.endsWith('.md')) return 'markdown';
  if (mimeType.includes('xml') || artifactPath.endsWith('.xml')) return 'xml';
  if (mimeType.includes('html') || artifactPath.endsWith('.html')) return 'html';

  return 'plaintext';
}

export function createArtifactModelLocator(input: ArtifactModelLocatorInput): MonacoModelLocator {
  return {
    namespace: 'artifact',
    objectId: input.artifactId,
    workspaceId: input.workspaceId,
    path: input.artifactPath,
    language: inferLanguageFromArtifact(input),
  };
}
