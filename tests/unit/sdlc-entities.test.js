/**
 * SDLC Domain Entities — Unit Tests
 *
 * Validates all entity factory functions, type enums, ID generation,
 * and base field defaults.
 */

import * as __req_0 from '../../platform/sdlc/entities';
const {
  LIFECYCLE_STAGES,
  ENTITY_TYPES,
  ENTITY_STATUS,
  PRIORITY,
  LINK_TYPES,
  generateId,
  resetIdCounter,
  createProduct,
  createProject,
  createFeature,
  createRequirement,
  createArchitectureDecision,
  createImplementationTask,
  createTestArtifact,
  createRelease,
  createDeployment,
  createIncident,
  createImprovement,
} = __req_0;

// ─── Enums ───────────────────────────────────────────────────

describe('SDLC entity enums', () => {
  it('LIFECYCLE_STAGES has 10 stages', () => {
    expect(Object.keys(LIFECYCLE_STAGES)).toHaveLength(10);
  });

  it('ENTITY_TYPES has 11 types', () => {
    expect(Object.keys(ENTITY_TYPES)).toHaveLength(11);
  });

  it('ENTITY_STATUS has 9 statuses', () => {
    expect(Object.keys(ENTITY_STATUS)).toHaveLength(9);
  });

  it('PRIORITY has 4 levels', () => {
    expect(Object.keys(PRIORITY)).toHaveLength(4);
  });

  it('LINK_TYPES has 9 types', () => {
    expect(Object.keys(LINK_TYPES)).toHaveLength(9);
  });

  it('enums are frozen', () => {
    expect(Object.isFrozen(LIFECYCLE_STAGES)).toBe(true);
    expect(Object.isFrozen(ENTITY_TYPES)).toBe(true);
    expect(Object.isFrozen(ENTITY_STATUS)).toBe(true);
  });
});

// ─── ID Generation ───────────────────────────────────────────

describe('generateId', () => {
  beforeEach(() => resetIdCounter());

  it('generates unique IDs with prefix', () => {
    const id1 = generateId('test');
    const id2 = generateId('test');
    expect(id1).toMatch(/^test-/);
    expect(id2).toMatch(/^test-/);
    expect(id1).not.toBe(id2);
  });

  it('resets counter for deterministic testing', () => {
    const id1 = generateId('x');
    resetIdCounter();
    const id2 = generateId('x');
    // Sequence part should be the same after reset (0001)
    expect(id1.split('-').pop()).toBe(id2.split('-').pop());
  });
});

// ─── Entity Factories ────────────────────────────────────────

describe('createProduct', () => {
  beforeEach(() => resetIdCounter());

  it('creates a product with defaults', () => {
    const p = createProduct('Acme Platform');
    expect(p.type).toBe('PRODUCT');
    expect(p.name).toBe('Acme Platform');
    expect(p.status).toBe('DRAFT');
    expect(p.stage).toBe('IDEA');
    expect(p.vision).toBe('');
    expect(p.stakeholders).toEqual([]);
    expect(p.tags).toEqual([]);
    expect(p.links).toEqual([]);
    expect(p.id).toMatch(/^product-/);
    expect(p.created_at).toBeTruthy();
  });

  it('accepts overrides', () => {
    const p = createProduct('X', { vision: 'Build X', owner: 'alice' });
    expect(p.vision).toBe('Build X');
    expect(p.owner).toBe('alice');
  });
});

describe('createProject', () => {
  beforeEach(() => resetIdCounter());

  it('creates a project linked to a product', () => {
    const proj = createProject('Sprint Alpha', 'prod-1');
    expect(proj.type).toBe('PROJECT');
    expect(proj.product_id).toBe('prod-1');
    expect(proj.stage).toBe('PLANNING');
  });
});

describe('createFeature', () => {
  it('creates a feature with default priority', () => {
    const f = createFeature('Dark Mode', 'proj-1');
    expect(f.type).toBe('FEATURE');
    expect(f.project_id).toBe('proj-1');
    expect(f.priority).toBe('MEDIUM');
    expect(f.acceptance_criteria).toEqual([]);
  });
});

describe('createRequirement', () => {
  it('creates a functional requirement', () => {
    const r = createRequirement('User login', 'feat-1');
    expect(r.type).toBe('REQUIREMENT');
    expect(r.feature_id).toBe('feat-1');
    expect(r.classification).toBe('FUNCTIONAL');
  });

  it('allows non-functional classification override', () => {
    const r = createRequirement('1s response', 'feat-1', { classification: 'NON_FUNCTIONAL' });
    expect(r.classification).toBe('NON_FUNCTIONAL');
  });
});

describe('createArchitectureDecision', () => {
  it('creates an ADR', () => {
    const adr = createArchitectureDecision('Use Next.js');
    expect(adr.type).toBe('ARCHITECTURE_DECISION');
    expect(adr.stage).toBe('ARCHITECTURE');
    expect(adr.context).toBe('');
    expect(adr.alternatives).toEqual([]);
  });
});

describe('createImplementationTask', () => {
  it('creates a task in a sprint', () => {
    const t = createImplementationTask('Build login form', 'SP-1');
    expect(t.type).toBe('IMPLEMENTATION_TASK');
    expect(t.sprint_id).toBe('SP-1');
    expect(t.estimate_hours).toBe(0);
  });
});

describe('createTestArtifact', () => {
  it('creates a test artifact with pending result', () => {
    const t = createTestArtifact('Login tests', 'task-1');
    expect(t.type).toBe('TEST_ARTIFACT');
    expect(t.task_id).toBe('task-1');
    expect(t.test_type).toBe('UNIT');
    expect(t.result).toBe('PENDING');
    expect(t.coverage_pct).toBeNull();
  });
});

describe('createRelease', () => {
  it('creates a release with version', () => {
    const r = createRelease('1.0.0');
    expect(r.type).toBe('RELEASE');
    expect(r.version).toBe('1.0.0');
    expect(r.name).toBe('Release 1.0.0');
    expect(r.stage).toBe('RELEASE');
  });
});

describe('createDeployment', () => {
  it('creates a deployment to an environment', () => {
    const d = createDeployment('rel-1', 'production');
    expect(d.type).toBe('DEPLOYMENT');
    expect(d.release_id).toBe('rel-1');
    expect(d.environment).toBe('production');
    expect(d.deployed_at).toBeTruthy();
  });
});

describe('createIncident', () => {
  it('creates an incident with default severity', () => {
    const inc = createIncident('500 errors spike', 'rel-1');
    expect(inc.type).toBe('INCIDENT');
    expect(inc.severity).toBe('MEDIUM');
    expect(inc.resolved_at).toBeNull();
  });
});

describe('createImprovement', () => {
  it('creates an improvement from a retrospective', () => {
    const imp = createImprovement('Improve CI speed', 'RETROSPECTIVE', 'retro-1');
    expect(imp.type).toBe('IMPROVEMENT');
    expect(imp.source_type).toBe('RETROSPECTIVE');
    expect(imp.source_id).toBe('retro-1');
    expect(imp.stage).toBe('IMPROVEMENT');
  });
});
