'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let RagGroundingService, resolveAgentRagProfile, resolveGroundingCollectionId;

beforeAll(async () => {
  const mod = await import('../../src/webapp/services/rag-grounding-service.ts');
  RagGroundingService = mod.RagGroundingService;
  resolveAgentRagProfile = mod.resolveAgentRagProfile;
  resolveGroundingCollectionId = mod.resolveGroundingCollectionId;
});

describe('resolveGroundingCollectionId', () => {
  test('keeps non sprint-artifacts collections unchanged', () => {
    expect(resolveGroundingCollectionId('decisions', 'alpha')).toBe('decisions');
  });

  test('scopes sprint-artifacts by workspace id', () => {
    expect(resolveGroundingCollectionId('sprint-artifacts', 'Project_One')).toBe(
      'sprint-artifacts--project_one'
    );
  });
});

describe('resolveAgentRagProfile', () => {
  test('loads per-agent profile overrides from JSON config', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-profile-'));
    const cfgDir = path.join(root, 'BusinessDocs', 'metrics');
    fs.mkdirSync(cfgDir, { recursive: true });
    fs.writeFileSync(
      path.join(cfgDir, 'rag-profiles.json'),
      JSON.stringify(
        {
          agentProfiles: {
            '05': {
              collections: ['decisions', 'phase-outputs'],
              topKPerCollection: 1,
              threshold: 0.2,
              maxMatches: 2,
            },
          },
        },
        null,
        2
      )
    );

    const profile = resolveAgentRagProfile({ agentId: '05', phase: 'PHASE_2', projectRoot: root });
    expect(profile.collections).toEqual(['decisions', 'phase-outputs']);
    expect(profile.topKPerCollection).toBe(1);
    expect(profile.threshold).toBe(0.2);
    expect(profile.maxMatches).toBe(2);

    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe('RagGroundingService', () => {
  test('queries workspace-scoped sprint-artifacts collection for agent grounding', async () => {
    const ragStore = {
      query: vi.fn().mockResolvedValue([
        {
          chunk: {
            source_path: '/tmp/project/BusinessDocs/session/run.md',
            chunk_text: 'Previous session decision rationale.',
            start_line: 5,
          },
          score: 0.88,
        },
      ]),
    };

    const embedder = {
      embedText: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    };

    const svc = new RagGroundingService({
      projectRoot: '/tmp/project',
      ragStore,
      embeddingProvider: embedder,
    });

    const bundle = await svc.buildAgentGrounding({
      agentId: '14',
      agentName: 'Brand Strategist',
      phase: 'PHASE_4',
      workspaceId: 'acme-client',
      predecessorOutputs: {
        '/tmp/project/BusinessDocs/Phase4/14-brand.md': 'Prior launch tone and style notes.',
      },
    });

    expect(bundle).toBeTruthy();
    const collectionsQueried = ragStore.query.mock.calls.map((call) => call[0]);
    expect(collectionsQueried).toContain('sprint-artifacts--acme-client');
  });
});
