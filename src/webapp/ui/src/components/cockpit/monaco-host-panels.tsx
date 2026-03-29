/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Code2, FileSearch, GitCompare } from 'lucide-react';
import { getEditorShellState, initializeEditorShell } from '@/lib/editor/editor-shell';
import { buildStableMonacoUri, monacoModelRegistry } from '@/lib/editor/model-registry';
import type { MonacoModelLocator } from '@/lib/api-types';

type MonacoApi = typeof import('monaco-editor/esm/vs/editor/editor.api.js');
type EditorViewState = unknown;

const editorViewStateByUri = new Map<string, EditorViewState | null>();
const diffViewStateByPair = new Map<string, EditorViewState | null>();

interface BaseMonacoPaneProps {
  title: string;
  className?: string;
}

interface ArtifactViewerPaneProps extends BaseMonacoPaneProps {
  sourceLabel: string;
  content: string;
  modelLocator?: MonacoModelLocator;
  modelUri?: string;
}

interface CodeEditorPaneProps extends BaseMonacoPaneProps {
  value: string;
  onChange: (value: string) => void;
  modelLocator: MonacoModelLocator;
  modelUri?: string;
  readOnly?: boolean;
  governanceOverlay?: MonacoGovernanceOverlay;
}

interface DiffReviewPaneProps extends BaseMonacoPaneProps {
  originalLabel: string;
  modifiedLabel: string;
  originalContent: string;
  modifiedContent: string;
  originalModelLocator?: MonacoModelLocator;
  modifiedModelLocator?: MonacoModelLocator;
  originalModelUri?: string;
  modifiedModelUri?: string;
  onModifiedChange?: (value: string) => void;
  readOnlyModified?: boolean;
  lineMarkers?: DiffLineMarker[];
  governanceOverlay?: MonacoGovernanceOverlay;
}

export type DiffLineMarkerKind = 'gate_failure' | 'approval' | 'evidence_reference';

export interface DiffLineMarker {
  id?: string;
  side?: 'original' | 'modified';
  lineNumber: number;
  endLineNumber?: number;
  kind: DiffLineMarkerKind;
  label: string;
  detail?: string;
}

export type MonacoGovernanceAnnotationCategory = 'risk' | 'decision' | 'gate' | 'provenance';

export interface MonacoGovernanceAnnotation {
  id?: string;
  side?: 'original' | 'modified';
  lineNumber: number;
  endLineNumber?: number;
  category: MonacoGovernanceAnnotationCategory;
  label: string;
  detail?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface MonacoGovernanceOverlay {
  mode: 'advisory' | 'enforced';
  policyId: string;
  readOnlyByPolicy?: boolean;
  policySummary?: string;
  annotations?: MonacoGovernanceAnnotation[];
}

function useMonacoApi() {
  const [monaco, setMonaco] = useState<MonacoApi | null>(null);
  useEffect(() => {
    let cancelled = false;

    async function loadMonaco(): Promise<void> {
      await initializeEditorShell();
      const state = getEditorShellState();
      if (!state.protocolAllowed) return;

      const api = await import('monaco-editor/esm/vs/editor/editor.api.js');
      if (!cancelled) {
        setMonaco(api);
      }
    }

    void loadMonaco();

    return () => {
      cancelled = true;
    };
  }, []);

  return monaco;
}

function MonacoFallback({ content }: { content: string }) {
  return (
    <pre className="monaco-host-fallback overflow-auto whitespace-pre-wrap rounded-2xl border border-border/70 bg-background/80 p-3 text-xs leading-5">
      {content}
    </pre>
  );
}

export function ArtifactViewerPane({
  title,
  sourceLabel,
  content,
  modelLocator,
  modelUri,
  className,
}: ArtifactViewerPaneProps) {
  const monaco = useMonacoApi();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!monaco || !containerRef.current) {
      return;
    }

    const editor = monaco.editor.create(containerRef.current, {
      readOnly: true,
      automaticLayout: true,
      minimap: { enabled: false },
      lineNumbers: 'on',
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      fontSize: 12,
    });

    let disposed = false;
    let resolvedUri = '';
    const fallbackLocator: MonacoModelLocator = modelLocator || {
      namespace: 'artifact',
      objectId: sourceLabel || 'artifact-viewer',
      path: sourceLabel || undefined,
      language: 'plaintext',
    };

    void monacoModelRegistry.retainModel(fallbackLocator, content, modelUri).then((attachment) => {
      if (disposed) {
        return;
      }
      resolvedUri = attachment.uri;
      const model = monaco.editor.getModel(monaco.Uri.parse(resolvedUri));
      if (model) {
        editor.setModel(model);
        const viewState = editorViewStateByUri.get(resolvedUri) as
          | ReturnType<typeof editor.saveViewState>
          | undefined;
        if (viewState) {
          editor.restoreViewState(viewState);
        }
      }
    });

    return () => {
      disposed = true;
      if (resolvedUri) {
        editorViewStateByUri.set(resolvedUri, editor.saveViewState());
        void monacoModelRegistry.releaseModel(resolvedUri);
      }
      editor.dispose();
    };
  }, [content, modelLocator, modelUri, monaco, sourceLabel]);

  return (
    <Card
      elevation="flat"
      className={`monaco-host-shell border border-border/70 p-4 ${className ?? ''}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileSearch className="size-4 text-info" />
          {title}
        </div>
        <Badge variant="outline">Artifact viewer</Badge>
      </div>
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Code2 className="size-3.5" />
        {sourceLabel}
      </div>
      {monaco ? (
        <div
          ref={containerRef}
          className="monaco-host-canvas overflow-hidden rounded-2xl border border-border/70"
        />
      ) : (
        <MonacoFallback content={content} />
      )}
    </Card>
  );
}

export function CodeEditorPane({
  title,
  value,
  onChange,
  modelLocator,
  modelUri,
  readOnly = false,
  governanceOverlay,
  className,
}: CodeEditorPaneProps) {
  const monaco = useMonacoApi();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modelUriRef = useRef('');
  const initialValueRef = useRef(value);
  const readOnlyResolved = readOnly || governanceOverlay?.readOnlyByPolicy === true;

  useEffect(() => {
    if (!monaco || !containerRef.current) {
      return;
    }

    const editor = monaco.editor.create(containerRef.current, {
      readOnly: readOnlyResolved,
      automaticLayout: true,
      minimap: { enabled: false },
      lineNumbers: 'on',
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      fontSize: 12,
    });

    let disposed = false;
    let resolvedUri = '';
    let changeDisposable: { dispose: () => void } | null = null;

    void monacoModelRegistry
      .retainModel(modelLocator, initialValueRef.current, modelUri)
      .then((attachment) => {
        if (disposed) {
          return;
        }
        resolvedUri = attachment.uri;
        modelUriRef.current = resolvedUri;

        const model = monaco.editor.getModel(monaco.Uri.parse(resolvedUri));
        if (!model) {
          return;
        }

        editor.setModel(model);
        const viewState = editorViewStateByUri.get(resolvedUri) as
          | ReturnType<typeof editor.saveViewState>
          | undefined;
        if (viewState) {
          editor.restoreViewState(viewState);
        }
        changeDisposable = model.onDidChangeContent(() => {
          onChange(model.getValue());
        });
      });

    return () => {
      disposed = true;
      if (resolvedUri) {
        editorViewStateByUri.set(resolvedUri, editor.saveViewState());
        void monacoModelRegistry.releaseModel(resolvedUri);
      }
      changeDisposable?.dispose();
      editor.dispose();
    };
  }, [modelLocator, modelUri, monaco, onChange, readOnlyResolved]);

  useEffect(() => {
    if (!monaco || !modelUriRef.current) {
      return;
    }

    const model = monaco.editor.getModel(monaco.Uri.parse(modelUriRef.current));
    if (model && model.getValue() !== value) {
      model.setValue(value);
    }
  }, [monaco, value]);

  return (
    <Card
      elevation="flat"
      className={`monaco-host-shell border border-border/70 p-4 ${className ?? ''}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">{title}</div>
        <div className="flex items-center gap-2">
          {governanceOverlay ? (
            <Badge variant={governanceOverlay.mode === 'enforced' ? 'warning' : 'outline'}>
              Governance {governanceOverlay.mode}
            </Badge>
          ) : null}
          <Badge variant={readOnlyResolved ? 'outline' : 'info'}>
            {readOnlyResolved ? 'Read-only' : 'Editable'}
          </Badge>
        </div>
      </div>
      {governanceOverlay?.readOnlyByPolicy ? (
        <div className="mb-2 text-[11px] text-muted-foreground">
          Policy {governanceOverlay.policyId} enforces read-only mode.
        </div>
      ) : null}
      {monaco ? (
        <div
          ref={containerRef}
          className="monaco-host-canvas-compact overflow-hidden rounded-2xl border border-border/70"
        />
      ) : (
        <textarea
          aria-label={title}
          className="monaco-host-canvas-compact rounded-2xl border border-border/70 bg-background/80 p-3 text-xs"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          readOnly={readOnlyResolved}
        />
      )}
    </Card>
  );
}

export function DiffReviewPane({
  title,
  originalLabel,
  modifiedLabel,
  originalContent,
  modifiedContent,
  originalModelLocator,
  modifiedModelLocator,
  originalModelUri,
  modifiedModelUri,
  onModifiedChange,
  readOnlyModified = true,
  lineMarkers = [],
  governanceOverlay,
  className,
}: DiffReviewPaneProps) {
  const monaco = useMonacoApi();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fallbackOriginalLocator = useMemo<MonacoModelLocator>(
    () =>
      originalModelLocator || {
        namespace: 'repo',
        objectId: 'diff-original',
        path: 'diff/original.txt',
        language: 'plaintext',
      },
    [originalModelLocator]
  );

  const fallbackModifiedLocator = useMemo<MonacoModelLocator>(
    () =>
      modifiedModelLocator || {
        namespace: 'repo',
        objectId: 'diff-modified',
        path: 'diff/modified.txt',
        language: 'plaintext',
      },
    [modifiedModelLocator]
  );

  const resolvedReadOnlyModified = readOnlyModified || governanceOverlay?.readOnlyByPolicy === true;

  const governanceDerivedLineMarkers = useMemo<DiffLineMarker[]>(() => {
    const annotations = governanceOverlay?.annotations ?? [];
    return annotations.map((annotation) => ({
      id: annotation.id,
      side: annotation.side,
      lineNumber: annotation.lineNumber,
      endLineNumber: annotation.endLineNumber,
      kind:
        annotation.category === 'gate'
          ? 'gate_failure'
          : annotation.category === 'decision'
            ? 'approval'
            : 'evidence_reference',
      label: annotation.label,
      detail: annotation.detail,
    }));
  }, [governanceOverlay?.annotations]);

  const resolvedLineMarkers = useMemo<DiffLineMarker[]>(
    () => [...lineMarkers, ...governanceDerivedLineMarkers],
    [governanceDerivedLineMarkers, lineMarkers]
  );

  const markerCountByKind = useMemo(
    () =>
      resolvedLineMarkers.reduce<Record<DiffLineMarkerKind, number>>(
        (accumulator, marker) => {
          accumulator[marker.kind] += 1;
          return accumulator;
        },
        {
          gate_failure: 0,
          approval: 0,
          evidence_reference: 0,
        }
      ),
    [resolvedLineMarkers]
  );

  useEffect(() => {
    if (!monaco || !containerRef.current) {
      return;
    }

    const monacoApi = monaco;

    const diffEditor = monacoApi.editor.createDiffEditor(containerRef.current, {
      automaticLayout: true,
      minimap: { enabled: false },
      readOnly: resolvedReadOnlyModified,
      scrollBeyondLastLine: false,
      renderSideBySide: true,
      originalEditable: false,
      glyphMargin: true,
    });
    diffEditor.getOriginalEditor().updateOptions({ glyphMargin: true });
    diffEditor.getModifiedEditor().updateOptions({ glyphMargin: true });

    let disposed = false;
    let resolvedOriginalUri = '';
    let resolvedModifiedUri = '';
    let modifiedDisposable: { dispose: () => void } | null = null;
    let diffViewStateKey = '';
    let originalDecorationIds: string[] = [];
    let modifiedDecorationIds: string[] = [];

    const markerOverviewColors: Record<DiffLineMarkerKind, string> = {
      gate_failure: 'var(--color-destructive)',
      approval: 'var(--color-info)',
      evidence_reference: 'var(--color-warning)',
    };

    function toDecoration(
      model: import('monaco-editor/esm/vs/editor/editor.api.js').editor.ITextModel,
      marker: DiffLineMarker
    ): import('monaco-editor/esm/vs/editor/editor.api.js').editor.IModelDeltaDecoration {
      const maxLine = Math.max(1, model.getLineCount());
      const startLine = Math.min(Math.max(marker.lineNumber, 1), maxLine);
      const endLine = Math.min(
        Math.max(marker.endLineNumber ?? marker.lineNumber, startLine),
        maxLine
      );
      const endColumn = model.getLineMaxColumn(endLine);
      const hoverValue = marker.detail
        ? `**${marker.label}**\n\n${marker.detail}`
        : `**${marker.label}**`;

      return {
        range: new monacoApi.Range(startLine, 1, endLine, endColumn),
        options: {
          isWholeLine: true,
          className: `monaco-line-marker monaco-line-marker-${marker.kind}`,
          linesDecorationsClassName: `monaco-line-marker-gutter monaco-line-marker-gutter-${marker.kind}`,
          overviewRuler: {
            color: markerOverviewColors[marker.kind],
            position: monacoApi.editor.OverviewRulerLane.Right,
          },
          hoverMessage: { value: hoverValue },
        },
      };
    }

    function applyLineMarkers(
      originalModel: import('monaco-editor/esm/vs/editor/editor.api.js').editor.ITextModel,
      modifiedModel: import('monaco-editor/esm/vs/editor/editor.api.js').editor.ITextModel
    ): void {
      const originalMarkers = resolvedLineMarkers.filter((marker) => marker.side === 'original');
      const modifiedMarkers = resolvedLineMarkers.filter((marker) => marker.side !== 'original');

      originalDecorationIds = diffEditor.getOriginalEditor().deltaDecorations(
        originalDecorationIds,
        originalMarkers.map((marker) => toDecoration(originalModel, marker))
      );

      modifiedDecorationIds = diffEditor.getModifiedEditor().deltaDecorations(
        modifiedDecorationIds,
        modifiedMarkers.map((marker) => toDecoration(modifiedModel, marker))
      );
    }

    Promise.all([
      monacoModelRegistry.retainModel(fallbackOriginalLocator, originalContent, originalModelUri),
      monacoModelRegistry.retainModel(fallbackModifiedLocator, modifiedContent, modifiedModelUri),
    ]).then(([originalAttachment, modifiedAttachment]) => {
      if (disposed) {
        return;
      }

      resolvedOriginalUri = originalAttachment.uri;
      resolvedModifiedUri = modifiedAttachment.uri;
      diffViewStateKey = `${resolvedOriginalUri}::${resolvedModifiedUri}`;

      const originalModel = monaco.editor.getModel(monaco.Uri.parse(resolvedOriginalUri));
      const modifiedModel = monaco.editor.getModel(monaco.Uri.parse(resolvedModifiedUri));
      if (!originalModel || !modifiedModel) {
        return;
      }

      diffEditor.setModel({ original: originalModel, modified: modifiedModel });
      applyLineMarkers(originalModel, modifiedModel);
      const viewState = diffViewStateByPair.get(diffViewStateKey) as
        | ReturnType<typeof diffEditor.saveViewState>
        | undefined;
      if (viewState) {
        diffEditor.restoreViewState(viewState);
      }

      if (onModifiedChange && !resolvedReadOnlyModified) {
        modifiedDisposable = modifiedModel.onDidChangeContent(() => {
          onModifiedChange(modifiedModel.getValue());
        });
      }
    });

    return () => {
      disposed = true;
      originalDecorationIds = diffEditor
        .getOriginalEditor()
        .deltaDecorations(originalDecorationIds, []);
      modifiedDecorationIds = diffEditor
        .getModifiedEditor()
        .deltaDecorations(modifiedDecorationIds, []);
      if (diffViewStateKey) {
        diffViewStateByPair.set(diffViewStateKey, diffEditor.saveViewState());
      }
      if (resolvedOriginalUri) {
        void monacoModelRegistry.releaseModel(resolvedOriginalUri);
      }
      if (resolvedModifiedUri) {
        void monacoModelRegistry.releaseModel(resolvedModifiedUri);
      }
      modifiedDisposable?.dispose();
      diffEditor.dispose();
    };
  }, [
    fallbackModifiedLocator,
    fallbackOriginalLocator,
    modifiedContent,
    modifiedModelUri,
    monaco,
    onModifiedChange,
    originalContent,
    originalModelUri,
    resolvedReadOnlyModified,
    resolvedLineMarkers,
  ]);

  return (
    <Card
      elevation="flat"
      className={`monaco-host-shell border border-border/70 p-4 ${className ?? ''}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <GitCompare className="size-4 text-warning" />
          {title}
        </div>
        <Badge variant="outline">Diff review</Badge>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.12em] text-muted-foreground">
        <span>{originalLabel}</span>
        <span>{modifiedLabel}</span>
      </div>

      {governanceOverlay ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant={governanceOverlay.mode === 'enforced' ? 'warning' : 'outline'}>
            Governance {governanceOverlay.mode}
          </Badge>
          <Badge variant="outline">Policy {governanceOverlay.policyId}</Badge>
          {governanceOverlay.readOnlyByPolicy ? (
            <Badge variant="outline">Read-only by policy</Badge>
          ) : null}
        </div>
      ) : null}

      {resolvedLineMarkers.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline">Gate failures {markerCountByKind.gate_failure}</Badge>
          <Badge variant="outline">Approvals {markerCountByKind.approval}</Badge>
          <Badge variant="outline">Evidence refs {markerCountByKind.evidence_reference}</Badge>
        </div>
      ) : null}

      {monaco ? (
        <div
          ref={containerRef}
          className="monaco-host-canvas overflow-hidden rounded-2xl border border-border/70"
        />
      ) : (
        <div className="page-split-grid">
          <MonacoFallback content={originalContent} />
          <MonacoFallback content={modifiedContent} />
        </div>
      )}
    </Card>
  );
}

export function ArtifactViewerHostPane(props: ArtifactViewerPaneProps) {
  return <ArtifactViewerPane {...props} />;
}

export function DiffReviewHostPane(props: DiffReviewPaneProps) {
  return <DiffReviewPane {...props} />;
}

export function resolveModelUri(locator: MonacoModelLocator): string {
  return buildStableMonacoUri(locator);
}
