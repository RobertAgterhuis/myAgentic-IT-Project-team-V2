import { describe, expect, it } from 'vitest';
import type { OrchestratorPackMetadataResponse, PageHelpResponse } from '@/lib/api-types';
import { mergePackHelpTopicsIntoPageHelp, resolvePackAwareHelpRouteSlug } from './help-registry';

function createPackMetadata(
  helpTopics: Array<Record<string, unknown>>,
  supportsHelpTopics = true
): OrchestratorPackMetadataResponse {
  return {
    ok: true,
    pack: {
      manifest_version: '2.0',
      id: 'test-pack',
      name: 'Test Pack',
      version: '1.0.0',
    },
    commands: [],
    stages: [],
    gates: [],
    labels: {
      commands: {},
      stages: {},
      gates: {},
    },
    help_topics: helpTopics,
    capabilities: {
      supportsRuntimeGraph: true,
      supportsCommandCatalog: true,
      supportsHelpTopics,
      supportsArtifactNamespaces: false,
      supportsGateAssets: false,
      parallelDispatchStates: [],
    },
    warnings: [],
  };
}

function createPageHelp(routeSlug: string): PageHelpResponse {
  return {
    routeSlug,
    routePath: `/${routeSlug}`,
    pageTitle: 'Pipeline',
    purpose: 'Purpose',
    coreActions: [],
    inputsOutputs: 'in out',
    permissions: 'Operator',
    relatedPages: [],
    keywords: [],
    topicLinks: [{ topicId: 'pipeline-gates', title: 'Quality Gates' }],
  };
}

describe('help-registry', () => {
  it('maps path aliases to a pack route slug when help topics declare aliases', () => {
    const metadata = createPackMetadata([
      {
        id: 'pipeline-phases',
        title: 'Pipeline Phases',
        routeSlug: 'pipeline',
        aliases: ['/progress', 'flow-overview'],
      },
    ]);

    expect(resolvePackAwareHelpRouteSlug('/progress', metadata)).toBe('pipeline');
    expect(resolvePackAwareHelpRouteSlug('/flow-overview', metadata)).toBe('pipeline');
  });

  it('falls back to first route segment when no pack mapping exists', () => {
    const metadata = createPackMetadata([{ id: 'commands', title: 'Commands' }]);

    expect(resolvePackAwareHelpRouteSlug('/commands/new', metadata)).toBe('commands');
    expect(resolvePackAwareHelpRouteSlug('/unknown/path', metadata)).toBe('unknown');
  });

  it('merges explicit and inferred pack topics into page help topic links', () => {
    const metadata = createPackMetadata([
      { id: 'pipeline-phases', title: 'Pipeline Phases', routeSlug: 'pipeline' },
      { id: 'pipeline-gates', title: 'Pipeline Gates', routeSlug: 'pipeline' },
      { id: 'commands-modes', title: 'Command Modes', routeSlug: 'commands' },
    ]);

    const merged = mergePackHelpTopicsIntoPageHelp(
      createPageHelp('pipeline'),
      'pipeline',
      metadata
    );

    expect(merged?.topicLinks).toEqual([
      { topicId: 'pipeline-gates', title: 'Quality Gates' },
      { topicId: 'pipeline-phases', title: 'Pipeline Phases' },
    ]);
  });

  it('does not merge pack topics when capability flag is disabled', () => {
    const metadata = createPackMetadata(
      [{ id: 'pipeline-phases', title: 'Pipeline Phases', routeSlug: 'pipeline' }],
      false
    );

    const pageHelp = createPageHelp('pipeline');
    const merged = mergePackHelpTopicsIntoPageHelp(pageHelp, 'pipeline', metadata);

    expect(merged).toEqual(pageHelp);
  });
});
