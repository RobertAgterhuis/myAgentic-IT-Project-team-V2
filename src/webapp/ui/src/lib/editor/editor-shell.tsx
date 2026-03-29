/* eslint-disable react-refresh/only-export-components */
import { useEffect } from 'react';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

type EditorShellState = {
  initialized: boolean;
  protocolAllowed: boolean;
  esmLoaded: boolean;
};

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker?: (_workerId: string, label: string) => Worker;
    };
  }
}

const state: EditorShellState = {
  initialized: false,
  protocolAllowed: false,
  esmLoaded: false,
};

let initPromise: Promise<EditorShellState> | null = null;

function isProtocolAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'http:' || window.location.protocol === 'https:';
}

export type MonacoWorkerKind = 'json' | 'css' | 'html' | 'typescript' | 'editor';

export function resolveMonacoWorkerKind(label: string): MonacoWorkerKind {
  if (label === 'json') return 'json';
  if (label === 'css' || label === 'scss' || label === 'less') return 'css';
  if (label === 'html' || label === 'handlebars' || label === 'razor') return 'html';
  if (label === 'typescript' || label === 'javascript') return 'typescript';
  return 'editor';
}

function createWorkerByLabel(label: string): Worker {
  const workerKind = resolveMonacoWorkerKind(label);

  if (workerKind === 'json') {
    return new JsonWorker({ name: 'monaco-json-worker' });
  }

  if (workerKind === 'css') {
    return new CssWorker({ name: 'monaco-css-worker' });
  }

  if (workerKind === 'html') {
    return new HtmlWorker({ name: 'monaco-html-worker' });
  }

  if (workerKind === 'typescript') {
    return new TsWorker({ name: 'monaco-ts-worker' });
  }

  return new EditorWorker({ name: 'monaco-editor-worker' });
}

async function loadMonacoEsm(): Promise<void> {
  await import('monaco-editor/esm/vs/editor/editor.api.js');
  state.esmLoaded = true;
}

export async function initializeEditorShell(): Promise<EditorShellState> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const protocolAllowed = isProtocolAllowed();
    state.protocolAllowed = protocolAllowed;

    if (!protocolAllowed) {
      state.initialized = true;
      return { ...state };
    }

    if (typeof window !== 'undefined') {
      window.MonacoEnvironment = {
        getWorker: (_workerId: string, label: string) => createWorkerByLabel(label),
      };
    }

    await loadMonacoEsm();
    state.initialized = true;
    return { ...state };
  })();

  return initPromise;
}

export function getEditorShellState(): EditorShellState {
  return { ...state };
}

export function EditorShellProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void initializeEditorShell();
  }, []);

  return <>{children}</>;
}
