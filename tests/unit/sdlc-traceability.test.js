/**
 * SDLC Traceability Matrix — Unit Tests
 *
 * Validates TraceabilityMatrix: node/edge registration, forward/backward trace,
 * impact analysis, coverage analysis, orphan detection, and serialisation.
 */

import * as __req_0 from '../../platform/sdlc/traceability';
const { TraceabilityMatrix } = __req_0;
import * as __req_1 from '../../platform/sdlc/entities';
const { ENTITY_TYPES, LINK_TYPES } = __req_1;

// ─── Helpers ─────────────────────────────────────────────────

function makeNode(id, type, name, stage = 'REQUIREMENTS') {
  return { entity_id: id, entity_type: type, name, stage };
}

// ─── Node & Edge Registration ────────────────────────────────

describe('TraceabilityMatrix registration', () => {
  let matrix;

  beforeEach(() => {
    matrix = new TraceabilityMatrix();
  });

  it('addNode() registers a trace node', () => {
    matrix.addNode(makeNode('REQ-1', ENTITY_TYPES.REQUIREMENT, 'Login'));
    expect(matrix.nodeCount()).toBe(1);
    expect(matrix.getNode('REQ-1').name).toBe('Login');
  });

  it('addEdge() creates a directed edge', () => {
    matrix.addNode(makeNode('REQ-1', ENTITY_TYPES.REQUIREMENT, 'Login'));
    matrix.addNode(makeNode('TASK-1', ENTITY_TYPES.IMPLEMENTATION_TASK, 'Implement Login'));
    const edge = matrix.addEdge('REQ-1', 'TASK-1', LINK_TYPES.IMPLEMENTS);
    expect(edge.from_id).toBe('REQ-1');
    expect(edge.to_id).toBe('TASK-1');
    expect(edge.link_type).toBe('IMPLEMENTS');
    expect(matrix.edgeCount()).toBe(1);
  });

  it('getAllNodes() returns all registered nodes', () => {
    matrix.addNode(makeNode('REQ-1', ENTITY_TYPES.REQUIREMENT, 'A'));
    matrix.addNode(makeNode('REQ-2', ENTITY_TYPES.REQUIREMENT, 'B'));
    expect(matrix.getAllNodes()).toHaveLength(2);
  });

  it('getEdges() filters by fromId', () => {
    matrix.addNode(makeNode('A', ENTITY_TYPES.REQUIREMENT, 'A'));
    matrix.addNode(makeNode('B', ENTITY_TYPES.IMPLEMENTATION_TASK, 'B'));
    matrix.addNode(makeNode('C', ENTITY_TYPES.TEST_ARTIFACT, 'C'));
    matrix.addEdge('A', 'B', LINK_TYPES.IMPLEMENTS);
    matrix.addEdge('A', 'C', LINK_TYPES.VALIDATES);
    matrix.addEdge('B', 'C', LINK_TYPES.VALIDATES);
    expect(matrix.getEdges('A')).toHaveLength(2);
    expect(matrix.getEdges(undefined, 'C')).toHaveLength(2);
  });

  it('getEdges() with no args returns all edges', () => {
    matrix.addNode(makeNode('A', ENTITY_TYPES.REQUIREMENT, 'A'));
    matrix.addNode(makeNode('B', ENTITY_TYPES.IMPLEMENTATION_TASK, 'B'));
    matrix.addEdge('A', 'B', LINK_TYPES.IMPLEMENTS);
    expect(matrix.getEdges()).toHaveLength(1);
  });
});

// ─── Forward Trace ───────────────────────────────────────────

describe('TraceabilityMatrix traceForward', () => {
  let matrix;

  beforeEach(() => {
    matrix = new TraceabilityMatrix();
    matrix.addNode(makeNode('REQ-1', ENTITY_TYPES.REQUIREMENT, 'Login'));
    matrix.addNode(makeNode('TASK-1', ENTITY_TYPES.IMPLEMENTATION_TASK, 'Implement'));
    matrix.addNode(makeNode('TEST-1', ENTITY_TYPES.TEST_ARTIFACT, 'Test Login'));
    matrix.addEdge('REQ-1', 'TASK-1', LINK_TYPES.IMPLEMENTS);
    matrix.addEdge('TASK-1', 'TEST-1', LINK_TYPES.VALIDATES);
  });

  it('traces downstream from a requirement', () => {
    const result = matrix.traceForward('REQ-1');
    expect(result).toHaveLength(2);
    const ids = result.map((n) => n.entity_id);
    expect(ids).toContain('TASK-1');
    expect(ids).toContain('TEST-1');
  });

  it('does not include the source node', () => {
    const result = matrix.traceForward('REQ-1');
    expect(result.map((n) => n.entity_id)).not.toContain('REQ-1');
  });

  it('respects maxDepth', () => {
    const result = matrix.traceForward('REQ-1', 1);
    expect(result).toHaveLength(1);
    expect(result[0].entity_id).toBe('TASK-1');
  });

  it('returns empty for leaf node', () => {
    expect(matrix.traceForward('TEST-1')).toHaveLength(0);
  });
});

// ─── Backward Trace ──────────────────────────────────────────

describe('TraceabilityMatrix traceBackward', () => {
  let matrix;

  beforeEach(() => {
    matrix = new TraceabilityMatrix();
    matrix.addNode(makeNode('REQ-1', ENTITY_TYPES.REQUIREMENT, 'Login'));
    matrix.addNode(makeNode('TASK-1', ENTITY_TYPES.IMPLEMENTATION_TASK, 'Implement'));
    matrix.addNode(makeNode('TEST-1', ENTITY_TYPES.TEST_ARTIFACT, 'Test Login'));
    matrix.addEdge('REQ-1', 'TASK-1', LINK_TYPES.IMPLEMENTS);
    matrix.addEdge('TASK-1', 'TEST-1', LINK_TYPES.VALIDATES);
  });

  it('traces upstream from a test', () => {
    const result = matrix.traceBackward('TEST-1');
    expect(result).toHaveLength(2);
    const ids = result.map((n) => n.entity_id);
    expect(ids).toContain('TASK-1');
    expect(ids).toContain('REQ-1');
  });

  it('returns empty for root node', () => {
    expect(matrix.traceBackward('REQ-1')).toHaveLength(0);
  });
});

// ─── Impact Analysis ─────────────────────────────────────────

describe('TraceabilityMatrix analyzeImpact', () => {
  let matrix;

  beforeEach(() => {
    matrix = new TraceabilityMatrix();
    matrix.addNode(makeNode('REQ-1', ENTITY_TYPES.REQUIREMENT, 'Login'));
    matrix.addNode(makeNode('TASK-1', ENTITY_TYPES.IMPLEMENTATION_TASK, 'Implement'));
    matrix.addNode(makeNode('TEST-1', ENTITY_TYPES.TEST_ARTIFACT, 'Test'));
    matrix.addNode(makeNode('REL-1', ENTITY_TYPES.RELEASE, 'v1.0'));
    matrix.addEdge('REQ-1', 'TASK-1', LINK_TYPES.IMPLEMENTS);
    matrix.addEdge('TASK-1', 'TEST-1', LINK_TYPES.VALIDATES);
    matrix.addEdge('TEST-1', 'REL-1', LINK_TYPES.CONTAINS);
  });

  it('finds all downstream affected entities', () => {
    const report = matrix.analyzeImpact('REQ-1');
    expect(report.source_id).toBe('REQ-1');
    expect(report.total_affected).toBe(3);
  });

  it('includes distance and path in results', () => {
    const report = matrix.analyzeImpact('REQ-1');
    const task = report.affected.find((a) => a.entity_id === 'TASK-1');
    expect(task.distance).toBe(1);
    expect(task.path).toContain('REQ-1');
    expect(task.path).toContain('TASK-1');
  });

  it('results are sorted by distance', () => {
    const report = matrix.analyzeImpact('REQ-1');
    for (let i = 1; i < report.affected.length; i++) {
      expect(report.affected[i].distance).toBeGreaterThanOrEqual(report.affected[i - 1].distance);
    }
  });

  it('returns empty affected for leaf node', () => {
    const report = matrix.analyzeImpact('REL-1');
    expect(report.total_affected).toBe(0);
  });
});

// ─── Coverage Analysis ───────────────────────────────────────

describe('TraceabilityMatrix analyzeCoverage', () => {
  it('reports full coverage', () => {
    const matrix = new TraceabilityMatrix();
    matrix.addNode(makeNode('REQ-1', ENTITY_TYPES.REQUIREMENT, 'Login'));
    matrix.addNode(makeNode('TASK-1', ENTITY_TYPES.IMPLEMENTATION_TASK, 'Impl'));
    matrix.addNode(makeNode('TEST-1', ENTITY_TYPES.TEST_ARTIFACT, 'Test'));
    matrix.addNode(makeNode('REL-1', ENTITY_TYPES.RELEASE, 'v1.0'));
    matrix.addEdge('REQ-1', 'TASK-1', LINK_TYPES.IMPLEMENTS);
    matrix.addEdge('REQ-1', 'TEST-1', LINK_TYPES.VALIDATES);
    matrix.addEdge('REQ-1', 'REL-1', LINK_TYPES.CONTAINS);

    const report = matrix.analyzeCoverage();
    expect(report.total_requirements).toBe(1);
    expect(report.implemented).toBe(1);
    expect(report.tested).toBe(1);
    expect(report.released).toBe(1);
    expect(report.gaps).toHaveLength(0);
    expect(report.coverage_pct).toBe(100);
  });

  it('detects missing test and release coverage', () => {
    const matrix = new TraceabilityMatrix();
    matrix.addNode(makeNode('REQ-1', ENTITY_TYPES.REQUIREMENT, 'Login'));
    matrix.addNode(makeNode('TASK-1', ENTITY_TYPES.IMPLEMENTATION_TASK, 'Impl'));
    matrix.addEdge('REQ-1', 'TASK-1', LINK_TYPES.IMPLEMENTS);

    const report = matrix.analyzeCoverage();
    expect(report.implemented).toBe(1);
    expect(report.tested).toBe(0);
    expect(report.released).toBe(0);
    expect(report.gaps).toHaveLength(1);
    expect(report.gaps[0].missing).toContain('TEST');
    expect(report.gaps[0].missing).toContain('RELEASE');
    expect(report.coverage_pct).toBe(0);
  });

  it('returns 100% when no requirements exist', () => {
    const matrix = new TraceabilityMatrix();
    const report = matrix.analyzeCoverage();
    expect(report.coverage_pct).toBe(100);
  });
});

// ─── Orphan Detection ────────────────────────────────────────

describe('TraceabilityMatrix findOrphans', () => {
  it('finds nodes with no edges', () => {
    const matrix = new TraceabilityMatrix();
    matrix.addNode(makeNode('REQ-1', ENTITY_TYPES.REQUIREMENT, 'Connected'));
    matrix.addNode(makeNode('REQ-2', ENTITY_TYPES.REQUIREMENT, 'Orphan'));
    matrix.addNode(makeNode('TASK-1', ENTITY_TYPES.IMPLEMENTATION_TASK, 'Task'));
    matrix.addEdge('REQ-1', 'TASK-1', LINK_TYPES.IMPLEMENTS);

    const orphans = matrix.findOrphans();
    expect(orphans).toHaveLength(1);
    expect(orphans[0].entity_id).toBe('REQ-2');
  });

  it('returns empty when all nodes are connected', () => {
    const matrix = new TraceabilityMatrix();
    matrix.addNode(makeNode('A', ENTITY_TYPES.REQUIREMENT, 'A'));
    matrix.addNode(makeNode('B', ENTITY_TYPES.IMPLEMENTATION_TASK, 'B'));
    matrix.addEdge('A', 'B', LINK_TYPES.IMPLEMENTS);
    expect(matrix.findOrphans()).toHaveLength(0);
  });
});

// ─── Serialisation ───────────────────────────────────────────

describe('TraceabilityMatrix serialisation', () => {
  it('toJSON → fromJSON round-trips', () => {
    const m1 = new TraceabilityMatrix();
    m1.addNode(makeNode('REQ-1', ENTITY_TYPES.REQUIREMENT, 'Login'));
    m1.addNode(makeNode('TASK-1', ENTITY_TYPES.IMPLEMENTATION_TASK, 'Impl'));
    m1.addEdge('REQ-1', 'TASK-1', LINK_TYPES.IMPLEMENTS);

    const json = m1.toJSON();
    expect(json.nodes).toHaveLength(2);
    expect(json.edges).toHaveLength(1);

    const m2 = TraceabilityMatrix.fromJSON(json);
    expect(m2.nodeCount()).toBe(2);
    expect(m2.edgeCount()).toBe(1);
    expect(m2.traceForward('REQ-1')).toHaveLength(1);
  });
});

// ─── Cross-Repo Traceability (M25-004) ──────────────────────

describe('TraceabilityMatrix cross-repo queries', () => {
  let matrix;

  beforeEach(() => {
    matrix = new TraceabilityMatrix();
  });

  it('nodesByRepo() filters nodes by repoId', () => {
    matrix.addNode({
      entity_id: 'REQ-1',
      entity_type: ENTITY_TYPES.REQUIREMENT,
      name: 'Auth',
      stage: 'REQUIREMENTS',
      repoId: 'backend',
    });
    matrix.addNode({
      entity_id: 'REQ-2',
      entity_type: ENTITY_TYPES.REQUIREMENT,
      name: 'UI',
      stage: 'REQUIREMENTS',
      repoId: 'frontend',
    });
    matrix.addNode({
      entity_id: 'REQ-3',
      entity_type: ENTITY_TYPES.REQUIREMENT,
      name: 'API',
      stage: 'REQUIREMENTS',
      repoId: 'backend',
    });

    const backendNodes = matrix.nodesByRepo('backend');
    expect(backendNodes).toHaveLength(2);
    expect(backendNodes.every((n) => n.repoId === 'backend')).toBe(true);
  });

  it('nodesByRepo() returns empty for unknown repo', () => {
    matrix.addNode({
      entity_id: 'REQ-1',
      entity_type: ENTITY_TYPES.REQUIREMENT,
      name: 'A',
      stage: 'REQUIREMENTS',
      repoId: 'backend',
    });
    expect(matrix.nodesByRepo('nonexistent')).toEqual([]);
  });

  it('allRepoIds() returns unique repo IDs across all nodes', () => {
    matrix.addNode({
      entity_id: 'A',
      entity_type: ENTITY_TYPES.REQUIREMENT,
      name: 'A',
      stage: 'REQUIREMENTS',
      repoId: 'backend',
    });
    matrix.addNode({
      entity_id: 'B',
      entity_type: ENTITY_TYPES.IMPLEMENTATION_TASK,
      name: 'B',
      stage: 'IMPLEMENTATION',
      repoId: 'frontend',
    });
    matrix.addNode({
      entity_id: 'C',
      entity_type: ENTITY_TYPES.TEST_ARTIFACT,
      name: 'C',
      stage: 'TESTING',
      repoId: 'backend',
    });
    matrix.addNode({
      entity_id: 'D',
      entity_type: ENTITY_TYPES.REQUIREMENT,
      name: 'D',
      stage: 'REQUIREMENTS',
    }); // no repoId

    const ids = matrix.allRepoIds();
    expect(ids.sort()).toEqual(['backend', 'frontend']);
  });

  it('allRepoIds() returns empty when no nodes have repoId', () => {
    matrix.addNode(makeNode('REQ-1', ENTITY_TYPES.REQUIREMENT, 'A'));
    expect(matrix.allRepoIds()).toEqual([]);
  });

  it('crossRepoEdges() returns only edges between different repos', () => {
    matrix.addNode({
      entity_id: 'A',
      entity_type: ENTITY_TYPES.REQUIREMENT,
      name: 'A',
      stage: 'REQUIREMENTS',
      repoId: 'backend',
    });
    matrix.addNode({
      entity_id: 'B',
      entity_type: ENTITY_TYPES.IMPLEMENTATION_TASK,
      name: 'B',
      stage: 'IMPLEMENTATION',
      repoId: 'backend',
    });
    matrix.addNode({
      entity_id: 'C',
      entity_type: ENTITY_TYPES.TEST_ARTIFACT,
      name: 'C',
      stage: 'TESTING',
      repoId: 'frontend',
    });

    matrix.addEdge('A', 'B', LINK_TYPES.IMPLEMENTS); // same repo
    matrix.addEdge('A', 'C', LINK_TYPES.VALIDATES); // cross-repo
    matrix.addEdge('B', 'C', LINK_TYPES.VALIDATES); // cross-repo

    const crossEdges = matrix.crossRepoEdges();
    expect(crossEdges).toHaveLength(2);
    // All returned edges connect nodes from different repos
    for (const edge of crossEdges) {
      const from = matrix.getNode(edge.from_id);
      const to = matrix.getNode(edge.to_id);
      expect(from.repoId).not.toBe(to.repoId);
    }
  });

  it('crossRepoEdges() returns empty when all edges are same-repo', () => {
    matrix.addNode({
      entity_id: 'A',
      entity_type: ENTITY_TYPES.REQUIREMENT,
      name: 'A',
      stage: 'REQUIREMENTS',
      repoId: 'backend',
    });
    matrix.addNode({
      entity_id: 'B',
      entity_type: ENTITY_TYPES.IMPLEMENTATION_TASK,
      name: 'B',
      stage: 'IMPLEMENTATION',
      repoId: 'backend',
    });
    matrix.addEdge('A', 'B', LINK_TYPES.IMPLEMENTS);

    expect(matrix.crossRepoEdges()).toEqual([]);
  });

  it('crossRepoEdges() excludes edges where nodes lack repoId', () => {
    matrix.addNode(makeNode('A', ENTITY_TYPES.REQUIREMENT, 'A'));
    matrix.addNode(makeNode('B', ENTITY_TYPES.IMPLEMENTATION_TASK, 'B'));
    matrix.addEdge('A', 'B', LINK_TYPES.IMPLEMENTS);

    expect(matrix.crossRepoEdges()).toEqual([]);
  });
});
