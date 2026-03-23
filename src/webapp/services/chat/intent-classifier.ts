// Copyright (c) 2026 Robert Agterhuis. MIT License.

export type ChatIntent =
  | 'decision_lookup'
  | 'workspace_query'
  | 'artifact_query'
  | 'session_status'
  | 'approval_guidance'
  | 'workspace_navigation'
  | 'general_assist';

export class IntentClassifier {
  classify(message: string, contextHints: string[] = []): ChatIntent {
    const input = `${message} ${contextHints.join(' ')}`.toLowerCase();

    if (
      this.hasAny(input, ['decision', 'decisions', 'precedent', 'governance', 'what did we decide'])
    ) {
      return 'decision_lookup';
    }

    if (this.hasAny(input, ['workspace', 'repo', 'repository', 'codebase', 'module', 'pattern'])) {
      return 'workspace_query';
    }

    if (this.hasAny(input, ['artifact', 'phase output', 'phase-outputs', 'architecture review'])) {
      return 'artifact_query';
    }

    if (this.hasAny(input, ['approval', 'override', 'exception', 'policy'])) {
      return 'approval_guidance';
    }

    if (this.hasAny(input, ['workspace', 'repo', 'repository', 'codebase'])) {
      return 'workspace_navigation';
    }

    if (this.hasAny(input, ['status', 'session', 'phase', 'gate', 'pipeline'])) {
      return 'session_status';
    }

    return 'general_assist';
  }

  private hasAny(input: string, terms: string[]): boolean {
    return terms.some((term) => input.includes(term));
  }
}
