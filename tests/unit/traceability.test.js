'use strict';

const { TraceabilityMatrix } = require('../../platform/sdlc/traceability');
const { ENTITY_TYPES, LINK_TYPES } = require('../../platform/sdlc/entities');

// ── helpers ──────────────────────────────────────────────────

/** Create a minimal SdlcEntity (has `links` array so addNode treats it as entity). */
function entity(id, type, overrides = {}) {
  return {
    id,
    type: type || ENTITY_TYPES.REQUIREMENT,
    name: overrides.name || 'Entity ' + id,
    stage: overrides.stage || 'REQUIREMENTS',
    description: '',
    status: 'ACTIVE',
    owner: '',
    created_at: '',
    updated_at: '',
    tags: [],
    links: overrides.links || [],
    metadata: {},
  };
}

/** Create a TraceNode (no `links` field → addNode keeps as-is). */
function traceNode(id, type, overrides = {}) {
  return {
    entity_id: id,
    entity_type: type,
    name: overrides.name || 'Node ' + id,
    stage: overrides.stage || 'REQUIREMENTS',
    repoId: overrides.repoId || undefined,
  };
}

// ── Basic operations ─────────────────────────────────────────

describe('TraceabilityMatrix – addNode / addEdge', () => {
  let matrix;
  beforeEach(() => {
    matrix = new TraceabilityMatrix();
  });

  it('addNode with SdlcEntity (has links array)', () => {
    matrix.addNode(entity('R1', ENTITY_TYPES.REQUIREMENT));
    expect(matrix.getNode('R1')).toBeDefined();
    expect(matrix.nodeCount()).toBe(1);
  });

  it('addNode with TraceNode (plain object without links)', () => {
    matrix.addNode(traceNode('N1', 'CUSTOM'));
    expect(matrix.getNode('N1')).toBeDefined();
  });

  it('addEdge creates directed link', () => {
    matrix.addNode(entity('R1', ENTITY_TYPES.REQUIREMENT));
    matrix.addNode(entity('T1', ENTITY_TYPES.IMPLEMENTATION_TASK));
    matrix.addEdge('R1', 'T1', LINK_TYPES.IMPLEMENTS);
    expect(matrix.edgeCount()).toBe(1);
  });

  it('nodeCount / edgeCount', () => {
    matrix.addNode(entity('R1'));
    matrix.addNode(entity('T1'));
    matrix.addEdge('R1', 'T1', LINK_TYPES.IMPLEMENTS);
    expect(matrix.nodeCount()).toBe(2);
    expect(matrix.edgeCount()).toBe(1);
  });
});

// ── addEntityWithLinks ───────────────────────────────────────

describe('TraceabilityMatrix – addEntityWithLinks', () => {
  let matrix;
  beforeEach(() => {
    matrix = new TraceabilityMatrix();
  });

  it('adds entity and creates edges from links', () => {
    matrix.addNode(entity('R1'));
    matrix.addEntityWithLinks(
      entity('T1', ENTITY_TYPES.IMPLEMENTATION_TASK, {
        links: [
          {
            target_id: 'R1',
            type: LINK_TYPES.IMPLEMENTS,
            target_type: ENTITY_TYPES.REQUIREMENT,
            created_at: '',
          },
        ],
      })
    );
    expect(matrix.nodeCount()).toBe(2);
    expect(matrix.edgeCount()).toBe(1);
  });

  it('entity with empty links array adds no edges', () => {
    matrix.addEntityWithLinks(entity('R1', ENTITY_TYPES.REQUIREMENT, { links: [] }));
    expect(matrix.edgeCount()).toBe(0);
  });
});

// ── Traversal ────────────────────────────────────────────────

describe('TraceabilityMatrix – traceForward / traceBackward', () => {
  let matrix;

  beforeEach(() => {
    matrix = new TraceabilityMatrix();
    // R1 → T1 → TEST1 → REL1
    matrix.addNode(entity('R1', ENTITY_TYPES.REQUIREMENT));
    matrix.addNode(entity('T1', ENTITY_TYPES.IMPLEMENTATION_TASK));
    matrix.addNode(entity('TEST1', ENTITY_TYPES.TEST_ARTIFACT));
    matrix.addNode(entity('REL1', ENTITY_TYPES.RELEASE));
    matrix.addEdge('R1', 'T1', LINK_TYPES.IMPLEMENTS);
    matrix.addEdge('T1', 'TEST1', LINK_TYPES.TESTED_BY);
    matrix.addEdge('TEST1', 'REL1', LINK_TYPES.RELEASED_IN);
  });

  it('traceForward finds downstream nodes', () => {
    const result = matrix.traceForward('R1');
    const ids = result.map((n) => n.entity_id);
    expect(ids).toContain('T1');
    expect(ids).toContain('TEST1');
    expect(ids).toContain('REL1');
  });

  it('traceForward with maxDepth=1', () => {
    const result = matrix.traceForward('R1', 1);
    const ids = result.map((n) => n.entity_id);
    expect(ids).toContain('T1');
    expect(ids).not.toContain('REL1');
  });

  it('traceBackward finds upstream nodes', () => {
    const result = matrix.traceBackward('REL1');
    const ids = result.map((n) => n.entity_id);
    expect(ids).toContain('TEST1');
    expect(ids).toContain('T1');
    expect(ids).toContain('R1');
  });

  it('traceBackward with maxDepth=1', () => {
    const result = matrix.traceBackward('REL1', 1);
    const ids = result.map((n) => n.entity_id);
    expect(ids).toContain('TEST1');
    expect(ids).not.toContain('R1');
  });

  it('traceForward from leaf returns empty', () => {
    expect(matrix.traceForward('REL1')).toEqual([]);
  });

  it('traceBackward from root returns empty', () => {
    expect(matrix.traceBackward('R1')).toEqual([]);
  });

  it('handles cycles gracefully (visited set)', () => {
    matrix.addEdge('REL1', 'R1', LINK_TYPES.DERIVES_FROM);
    const result = matrix.traceForward('R1');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ── Impact Analysis ──────────────────────────────────────────

describe('TraceabilityMatrix – analyzeImpact', () => {
  let matrix;

  beforeEach(() => {
    matrix = new TraceabilityMatrix();
    matrix.addNode(entity('R1', ENTITY_TYPES.REQUIREMENT));
    matrix.addNode(entity('T1', ENTITY_TYPES.IMPLEMENTATION_TASK));
    matrix.addNode(entity('T2', ENTITY_TYPES.IMPLEMENTATION_TASK));
    matrix.addNode(entity('TEST1', ENTITY_TYPES.TEST_ARTIFACT));
    matrix.addEdge('R1', 'T1', LINK_TYPES.IMPLEMENTS);
    matrix.addEdge('R1', 'T2', LINK_TYPES.IMPLEMENTS);
    matrix.addEdge('T1', 'TEST1', LINK_TYPES.TESTED_BY);
  });

  it('returns impacted nodes with paths', () => {
    const impact = matrix.analyzeImpact('R1');
    expect(impact.affected.length).toBeGreaterThanOrEqual(2);
    const ids = impact.affected.map((i) => i.entity_id);
    expect(ids).toContain('T1');
    expect(ids).toContain('T2');
  });

  it('impact from leaf is minimal', () => {
    const impact = matrix.analyzeImpact('TEST1');
    expect(impact.total_affected).toBe(0);
  });

  it('total_affected matches affected array', () => {
    const impact = matrix.analyzeImpact('R1');
    expect(impact.total_affected).toBe(impact.affected.length);
  });

  it('affected entries have distance and path', () => {
    const impact = matrix.analyzeImpact('R1');
    for (const a of impact.affected) {
      expect(typeof a.distance).toBe('number');
      expect(Array.isArray(a.path)).toBe(true);
    }
  });
});

// ── Coverage Analysis ────────────────────────────────────────

describe('TraceabilityMatrix – analyzeCoverage', () => {
  let matrix;

  beforeEach(() => {
    matrix = new TraceabilityMatrix();
    // Fully traced: R1 → T1 → TEST1 → REL1
    matrix.addNode(entity('R1', ENTITY_TYPES.REQUIREMENT));
    matrix.addNode(entity('T1', ENTITY_TYPES.IMPLEMENTATION_TASK));
    matrix.addNode(entity('TEST1', ENTITY_TYPES.TEST_ARTIFACT));
    matrix.addNode(entity('REL1', ENTITY_TYPES.RELEASE));
    matrix.addEdge('R1', 'T1', LINK_TYPES.IMPLEMENTS);
    matrix.addEdge('T1', 'TEST1', LINK_TYPES.TESTED_BY);
    matrix.addEdge('TEST1', 'REL1', LINK_TYPES.RELEASED_IN);
    // Untested: R2 → T2 (no test)
    matrix.addNode(entity('R2', ENTITY_TYPES.REQUIREMENT));
    matrix.addNode(entity('T2', ENTITY_TYPES.IMPLEMENTATION_TASK));
    matrix.addEdge('R2', 'T2', LINK_TYPES.IMPLEMENTS);
    // Orphan requirement: R3 (no implementation)
    matrix.addNode(entity('R3', ENTITY_TYPES.REQUIREMENT));
  });

  it('reports total_requirements', () => {
    const cov = matrix.analyzeCoverage();
    expect(cov.total_requirements).toBe(3);
  });

  it('reports implemented count', () => {
    const cov = matrix.analyzeCoverage();
    expect(cov.implemented).toBe(2); // R1 and R2 have impl
  });

  it('reports tested count', () => {
    const cov = matrix.analyzeCoverage();
    expect(cov.tested).toBe(1); // only R1 chain has test
  });

  it('reports released count', () => {
    const cov = matrix.analyzeCoverage();
    expect(cov.released).toBe(1);
  });

  it('gaps includes R3 (no impl)', () => {
    const cov = matrix.analyzeCoverage();
    const gapIds = cov.gaps.map((g) => g.entity_id);
    expect(gapIds).toContain('R3');
  });

  it('coverage_pct is computed', () => {
    const cov = matrix.analyzeCoverage();
    expect(typeof cov.coverage_pct).toBe('number');
    expect(cov.coverage_pct).toBeLessThan(100);
  });

  it('gap missing includes IMPLEMENTATION for R3', () => {
    const cov = matrix.analyzeCoverage();
    const r3Gap = cov.gaps.find((g) => g.entity_id === 'R3');
    expect(r3Gap.missing).toContain('IMPLEMENTATION');
  });

  it('gap missing includes TEST for R2', () => {
    const cov = matrix.analyzeCoverage();
    const r2Gap = cov.gaps.find((g) => g.entity_id === 'R2');
    expect(r2Gap.missing).toContain('TEST');
  });
});

// ── Orphan Detection ─────────────────────────────────────────

describe('TraceabilityMatrix – findOrphans', () => {
  let matrix;

  beforeEach(() => {
    matrix = new TraceabilityMatrix();
    matrix.addNode(entity('R1'));
    matrix.addNode(entity('T1'));
    matrix.addNode(entity('ORPHAN1'));
    matrix.addEdge('R1', 'T1', LINK_TYPES.IMPLEMENTS);
  });

  it('finds nodes with no incoming or outgoing edges', () => {
    const orphans = matrix.findOrphans();
    const ids = orphans.map((o) => o.entity_id);
    expect(ids).toContain('ORPHAN1');
    expect(ids).not.toContain('R1');
    expect(ids).not.toContain('T1');
  });
});

// ── Edge Queries ─────────────────────────────────────────────

describe('TraceabilityMatrix – getEdges', () => {
  let matrix;

  beforeEach(() => {
    matrix = new TraceabilityMatrix();
    matrix.addNode(entity('R1'));
    matrix.addNode(entity('T1'));
    matrix.addNode(entity('T2'));
    matrix.addEdge('R1', 'T1', LINK_TYPES.IMPLEMENTS);
    matrix.addEdge('R1', 'T2', LINK_TYPES.IMPLEMENTS);
    matrix.addEdge('T1', 'T2', LINK_TYPES.DEPENDS_ON);
  });

  it('getEdges with no filter returns all', () => {
    expect(matrix.getEdges().length).toBe(3);
  });

  it('getEdges filtered by fromId', () => {
    const edges = matrix.getEdges('R1');
    expect(edges).toHaveLength(2);
  });

  it('getEdges filtered by toId', () => {
    const edges = matrix.getEdges(undefined, 'T2');
    expect(edges).toHaveLength(2);
  });

  it('getEdges filtered by fromId AND toId', () => {
    const edges = matrix.getEdges('R1', 'T1');
    expect(edges).toHaveLength(1);
  });
});

// ── Cross-Repo ───────────────────────────────────────────────

describe('TraceabilityMatrix – cross-repo', () => {
  let matrix;

  beforeEach(() => {
    matrix = new TraceabilityMatrix();
    matrix.addNode(traceNode('R1', ENTITY_TYPES.REQUIREMENT, { repoId: 'repo-a' }));
    matrix.addNode(traceNode('T1', ENTITY_TYPES.IMPLEMENTATION_TASK, { repoId: 'repo-b' }));
    matrix.addNode(traceNode('T2', ENTITY_TYPES.IMPLEMENTATION_TASK, { repoId: 'repo-a' }));
    matrix.addEdge('R1', 'T1', LINK_TYPES.IMPLEMENTS);
    matrix.addEdge('R1', 'T2', LINK_TYPES.IMPLEMENTS);
  });

  it('nodesByRepo filters by repoId', () => {
    const repoA = matrix.nodesByRepo('repo-a');
    expect(repoA).toHaveLength(2);
    const repoB = matrix.nodesByRepo('repo-b');
    expect(repoB).toHaveLength(1);
  });

  it('allRepoIds returns distinct repos', () => {
    const repos = matrix.allRepoIds();
    expect(repos).toContain('repo-a');
    expect(repos).toContain('repo-b');
    expect(repos).toHaveLength(2);
  });

  it('crossRepoEdges finds edges spanning repos', () => {
    const cross = matrix.crossRepoEdges();
    expect(cross).toHaveLength(1);
    expect(cross[0].from_id).toBe('R1');
    expect(cross[0].to_id).toBe('T1');
  });
});

// ── Serialization ────────────────────────────────────────────

describe('TraceabilityMatrix – toJSON / fromJSON', () => {
  it('round-trips nodes and edges', () => {
    const matrix = new TraceabilityMatrix();
    matrix.addNode(entity('R1'));
    matrix.addNode(entity('T1'));
    matrix.addEdge('R1', 'T1', LINK_TYPES.IMPLEMENTS);

    const json = matrix.toJSON();
    const restored = TraceabilityMatrix.fromJSON(json);
    expect(restored.nodeCount()).toBe(2);
    expect(restored.edgeCount()).toBe(1);
    expect(restored.getNode('R1')).toBeDefined();
    expect(restored.traceForward('R1').map((n) => n.entity_id)).toContain('T1');
  });

  it('getAllNodes returns all added nodes', () => {
    const matrix = new TraceabilityMatrix();
    matrix.addNode(entity('R1'));
    matrix.addNode(entity('T1'));
    expect(matrix.getAllNodes()).toHaveLength(2);
  });
});
