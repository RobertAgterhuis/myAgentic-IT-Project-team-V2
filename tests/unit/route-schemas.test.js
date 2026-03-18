// Copyright (c) 2026 Robert Agterhuis. MIT License.

import { describe, it, expect, beforeAll } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as RS from '../../src/webapp/route-schemas.js';

/* ── Ajv instance (mirrors Fastify defaults) ────────────────────── */

let ajv;

beforeAll(() => {
  ajv = new Ajv({ allErrors: true, coerceTypes: false });
  addFormats(ajv);
});

/** Compile and validate a payload against a schema part (body / querystring / params). */
function validates(schema, data) {
  const validate = ajv.compile(schema);
  return validate(data);
}

/* ── commandCreate ──────────────────────────────────────────────── */

describe('commandCreate', () => {
  const s = RS.commandCreate.body;

  it('accepts valid payload', () => {
    expect(validates(s, { command: 'plan' })).toBe(true);
  });

  it('accepts all optional fields', () => {
    expect(
      validates(s, {
        command: 'plan',
        project: 'my-proj',
        description: 'desc',
        scope: 'all',
        brief: 'long text',
      })
    ).toBe(true);
  });

  it('rejects missing command', () => {
    expect(validates(s, {})).toBe(false);
  });

  it('rejects empty command', () => {
    expect(validates(s, { command: '' })).toBe(false);
  });

  it('rejects command exceeding maxLength', () => {
    expect(validates(s, { command: 'x'.repeat(101) })).toBe(false);
  });

  it('rejects extra properties', () => {
    expect(validates(s, { command: 'plan', hacked: true })).toBe(false);
  });
});

/* ── approvalApprove / approvalReject ───────────────────────────── */

describe('approvalApprove', () => {
  const s = RS.approvalApprove.body;

  it('accepts empty body', () => {
    expect(validates(s, {})).toBe(true);
  });

  it('accepts reason and user', () => {
    expect(validates(s, { reason: 'LGTM', user: 'alice' })).toBe(true);
  });

  it('rejects extra properties', () => {
    expect(validates(s, { exploit: 'xss' })).toBe(false);
  });
});

describe('approvalReject', () => {
  const s = RS.approvalReject.body;

  it('requires reason', () => {
    expect(validates(s, {})).toBe(false);
  });

  it('rejects empty reason', () => {
    expect(validates(s, { reason: '' })).toBe(false);
  });

  it('accepts valid rejection', () => {
    expect(validates(s, { reason: 'Not ready' })).toBe(true);
  });
});

/* ── decisionMutate ─────────────────────────────────────────────── */

describe('decisionMutate', () => {
  const s = RS.decisionMutate.body;

  it('requires action', () => {
    expect(validates(s, { id: 'DEC-001' })).toBe(false);
  });

  it('accepts valid mutation', () => {
    expect(
      validates(s, {
        action: 'answer',
        id: 'DEC-001',
        answer: 'PostgreSQL',
      })
    ).toBe(true);
  });

  it('rejects extra properties', () => {
    expect(validates(s, { action: 'add', injected: 'x' })).toBe(false);
  });
});

/* ── decisionActivateCategory ───────────────────────────────────── */

describe('decisionActivateCategory', () => {
  const s = RS.decisionActivateCategory.body;

  it('requires file', () => {
    expect(validates(s, {})).toBe(false);
  });

  it('accepts valid file', () => {
    expect(validates(s, { file: 'database.md' })).toBe(true);
  });

  it('rejects file exceeding maxLength', () => {
    expect(validates(s, { file: 'x'.repeat(101) })).toBe(false);
  });
});

/* ── decisionPromoteLesson ──────────────────────────────────────── */

describe('decisionPromoteLesson', () => {
  const s = RS.decisionPromoteLesson.body;

  it('requires lessonId', () => {
    expect(validates(s, { priority: 'HIGH' })).toBe(false);
  });

  it('accepts valid promotion', () => {
    expect(validates(s, { lessonId: 'L-1', priority: 'HIGH', scope: 'sprint' })).toBe(true);
  });
});

/* ── questionnaireSave ──────────────────────────────────────────── */

describe('questionnaireSave', () => {
  const s = RS.questionnaireSave.body;

  it('requires file and updates', () => {
    expect(validates(s, {})).toBe(false);
    expect(validates(s, { file: 'q.md' })).toBe(false);
  });

  it('rejects empty updates array', () => {
    expect(validates(s, { file: 'q.md', updates: [] })).toBe(false);
  });

  it('requires questionId in each update item', () => {
    expect(
      validates(s, {
        file: 'q.md',
        updates: [{ answer: 'yes' }],
      })
    ).toBe(false);
  });

  it('validates status enum', () => {
    expect(
      validates(s, {
        file: 'q.md',
        updates: [{ questionId: 'Q1', status: 'INVALID' }],
      })
    ).toBe(false);
  });

  it('accepts valid payload', () => {
    expect(
      validates(s, {
        file: 'q.md',
        updates: [
          { questionId: 'Q1', answer: 'yes', status: 'ANSWERED' },
          { questionId: 'Q2', status: 'DEFERRED' },
        ],
      })
    ).toBe(true);
  });
});

/* ── subscribe ──────────────────────────────────────────────────── */

describe('subscribe', () => {
  const s = RS.subscribe.body;

  it('requires email', () => {
    expect(validates(s, {})).toBe(false);
  });

  it('validates email format', () => {
    expect(validates(s, { email: 'not-an-email' })).toBe(false);
  });

  it('accepts valid email', () => {
    expect(validates(s, { email: 'user@example.com' })).toBe(true);
  });

  it('accepts metadata with valid segment', () => {
    expect(
      validates(s, {
        email: 'user@example.com',
        metadata: { segment: 'developers', source: 'landing' },
      })
    ).toBe(true);
  });

  it('rejects invalid segment enum', () => {
    expect(
      validates(s, {
        email: 'user@example.com',
        metadata: { segment: 'hackers' },
      })
    ).toBe(false);
  });
});

/* ── milestoneCreate ────────────────────────────────────────────── */

describe('milestoneCreate', () => {
  const s = RS.milestoneCreate.body;

  it('requires all fields', () => {
    expect(validates(s, { name: 'M1' })).toBe(false);
  });

  it('validates completion date pattern', () => {
    expect(
      validates(s, {
        name: 'M1',
        status: 'in progress',
        progress: 50,
        completion: 'not-a-date',
      })
    ).toBe(false);
  });

  it('validates progress range', () => {
    expect(
      validates(s, {
        name: 'M1',
        status: 'in progress',
        progress: 150,
        completion: '2026-04-01',
      })
    ).toBe(false);
  });

  it('validates status enum', () => {
    expect(
      validates(s, {
        name: 'M1',
        status: 'unknown',
        progress: 0,
        completion: '2026-04-01',
      })
    ).toBe(false);
  });

  it('accepts valid milestone', () => {
    expect(
      validates(s, {
        name: 'M1',
        status: 'not started',
        progress: 0,
        completion: '2026-04-01',
      })
    ).toBe(true);
  });
});

/* ── workspaceCreate ────────────────────────────────────────────── */

describe('workspaceCreate', () => {
  const s = RS.workspaceCreate.body;

  it('requires id, name, owner', () => {
    expect(validates(s, { id: 'ws1', name: 'My WS' })).toBe(false);
  });

  it('accepts valid workspace', () => {
    expect(validates(s, { id: 'ws1', name: 'My WS', owner: 'alice' })).toBe(true);
  });

  it('rejects extra properties', () => {
    expect(validates(s, { id: 'ws1', name: 'WS', owner: 'a', evil: 1 })).toBe(false);
  });
});

/* ── workspaceAddRepository ─────────────────────────────────────── */

describe('workspaceAddRepository', () => {
  const s = RS.workspaceAddRepository.body;

  it('requires all mandatory fields', () => {
    expect(validates(s, { id: 'r1', name: 'repo' })).toBe(false);
  });

  it('validates provider enum', () => {
    expect(
      validates(s, {
        id: 'r1',
        name: 'repo',
        provider: 'bitbucket',
        url: 'https://example.com',
        defaultBranch: 'main',
      })
    ).toBe(false);
  });

  it('accepts valid repository', () => {
    expect(
      validates(s, {
        id: 'r1',
        name: 'repo',
        provider: 'github',
        url: 'https://github.com/org/repo',
        defaultBranch: 'main',
        tags: ['frontend'],
      })
    ).toBe(true);
  });
});

/* ── policyEvaluate ─────────────────────────────────────────────── */

describe('policyEvaluate', () => {
  const s = RS.policyEvaluate.body;

  it('requires context_type and scope', () => {
    expect(validates(s, { context_type: 'gate' })).toBe(false);
    expect(validates(s, { scope: 'global' })).toBe(false);
  });

  it('validates context_type enum', () => {
    expect(validates(s, { context_type: 'invalid', scope: 'global' })).toBe(false);
  });

  it('accepts valid evaluation', () => {
    expect(validates(s, { context_type: 'gate', scope: 'global' })).toBe(true);
  });
});

/* ── policyCreateException ──────────────────────────────────────── */

describe('policyCreateException', () => {
  const s = RS.policyCreateException.body;

  it('requires policy_id, reason, approved_by', () => {
    expect(validates(s, { policy_id: 'P1', reason: 'urgent' })).toBe(false);
  });

  it('accepts valid exception', () => {
    expect(
      validates(s, {
        policy_id: 'P1',
        reason: 'urgent hotfix',
        approved_by: 'admin',
      })
    ).toBe(true);
  });
});

/* ── jobCancel ──────────────────────────────────────────────────── */

describe('jobCancel', () => {
  const s = RS.jobCancel.body;

  it('requires job_id', () => {
    expect(validates(s, {})).toBe(false);
  });

  it('rejects job_id exceeding maxLength', () => {
    expect(validates(s, { job_id: 'x'.repeat(101) })).toBe(false);
  });

  it('accepts valid cancel', () => {
    expect(validates(s, { job_id: 'job-123' })).toBe(true);
  });
});

/* ── jobsList querystring ───────────────────────────────────────── */

describe('jobsList querystring', () => {
  const s = RS.jobsList.querystring;

  it('accepts empty query', () => {
    expect(validates(s, {})).toBe(true);
  });

  it('rejects non-numeric limit', () => {
    expect(validates(s, { limit: 'abc' })).toBe(false);
  });

  it('accepts valid query filters', () => {
    expect(validates(s, { status: 'running', type: 'build', limit: '10' })).toBe(true);
  });

  it('rejects extra properties', () => {
    expect(validates(s, { evil: 'x' })).toBe(false);
  });
});

/* ── orchestratorError ──────────────────────────────────────────── */

describe('orchestratorError', () => {
  const s = RS.orchestratorError.body;

  it('requires reason', () => {
    expect(validates(s, {})).toBe(false);
  });

  it('rejects empty reason', () => {
    expect(validates(s, { reason: '' })).toBe(false);
  });

  it('accepts valid error', () => {
    expect(validates(s, { reason: 'timeout' })).toBe(true);
  });
});

/* ── orchestratorReset ──────────────────────────────────────────── */

describe('orchestratorReset', () => {
  const s = RS.orchestratorReset.body;

  it('requires mode', () => {
    expect(validates(s, {})).toBe(false);
  });

  it('accepts valid reset with phases', () => {
    expect(
      validates(s, {
        mode: 'full',
        phases: ['business', 'tech'],
        template: 'default',
      })
    ).toBe(true);
  });
});

/* ── analyticsPost ──────────────────────────────────────────────── */

describe('analyticsPost', () => {
  const s = RS.analyticsPost.body;

  it('requires events array', () => {
    expect(validates(s, {})).toBe(false);
  });

  it('rejects empty events array', () => {
    expect(validates(s, { events: [] })).toBe(false);
  });

  it('validates event name enum', () => {
    expect(validates(s, { events: [{ event: 'invalid_event' }] })).toBe(false);
  });

  it('accepts valid analytics payload', () => {
    expect(
      validates(s, {
        events: [{ event: 'page_view', properties: { path: '/home' } }, { event: 'tab_switch' }],
      })
    ).toBe(true);
  });
});

/* ── analyticsGet querystring ───────────────────────────────────── */

describe('analyticsGet querystring', () => {
  const s = RS.analyticsGet.querystring;

  it('accepts empty query', () => {
    expect(validates(s, {})).toBe(true);
  });

  it('rejects non-numeric limit', () => {
    expect(validates(s, { limit: 'abc' })).toBe(false);
  });

  it('accepts numeric strings', () => {
    expect(validates(s, { limit: '20', offset: '0' })).toBe(true);
  });
});

/* ── authUpdateRole ─────────────────────────────────────────────── */

describe('authUpdateRole', () => {
  const s = RS.authUpdateRole.body;

  it('requires role', () => {
    expect(validates(s, {})).toBe(false);
  });

  it('validates role enum', () => {
    expect(validates(s, { role: 'superadmin' })).toBe(false);
  });

  it('accepts valid roles', () => {
    expect(validates(s, { role: 'admin' })).toBe(true);
    expect(validates(s, { role: 'operator' })).toBe(true);
    expect(validates(s, { role: 'viewer' })).toBe(true);
  });

  it('rejects extra properties', () => {
    expect(validates(s, { role: 'admin', escalate: true })).toBe(false);
  });
});

/* ── params schemas ─────────────────────────────────────────────── */

describe('params schemas', () => {
  it('agentDetail requires id', () => {
    expect(validates(RS.agentDetail.params, {})).toBe(false);
    expect(validates(RS.agentDetail.params, { id: '' })).toBe(false);
    expect(validates(RS.agentDetail.params, { id: 'agent-1' })).toBe(true);
  });

  it('sessionDetail requires id', () => {
    expect(validates(RS.sessionDetail.params, { id: 's-1' })).toBe(true);
  });

  it('artifactDetail requires id', () => {
    expect(validates(RS.artifactDetail.params, { id: 'a-1' })).toBe(true);
  });

  it('milestoneArchive requires id', () => {
    expect(validates(RS.milestoneArchive.params, { id: 'm-1' })).toBe(true);
    expect(validates(RS.milestoneArchive.params, {})).toBe(false);
  });

  it('analyticsV1MetricQuery requires name', () => {
    expect(validates(RS.analyticsV1MetricQuery.params, { name: 'cpu_usage' })).toBe(true);
    expect(validates(RS.analyticsV1MetricQuery.params, {})).toBe(false);
  });
});

/* ── artifactsList querystring ──────────────────────────────────── */

describe('artifactsList querystring', () => {
  const s = RS.artifactsList.querystring;

  it('accepts empty query', () => {
    expect(validates(s, {})).toBe(true);
  });

  it('accepts valid filters', () => {
    expect(validates(s, { stage: 'build', type: 'binary', status: 'ready' })).toBe(true);
  });

  it('rejects extra properties', () => {
    expect(validates(s, { evil: 'x' })).toBe(false);
  });
});

/* ── reevaluate ─────────────────────────────────────────────────── */

describe('reevaluate', () => {
  const s = RS.reevaluate.body;

  it('accepts empty body', () => {
    expect(validates(s, {})).toBe(true);
  });

  it('validates scope enum', () => {
    expect(validates(s, { scope: 'INVALID' })).toBe(false);
  });

  it('accepts valid scopes', () => {
    for (const scope of ['ALL', 'BUSINESS', 'TECH', 'UX', 'MARKETING']) {
      expect(validates(s, { scope })).toBe(true);
    }
  });
});

/* ── helpGet querystring ────────────────────────────────────────── */

describe('helpGet querystring', () => {
  const s = RS.helpGet.querystring;

  it('accepts empty query', () => {
    expect(validates(s, {})).toBe(true);
  });

  it('validates topic pattern (lowercase, digits, hyphens)', () => {
    expect(validates(s, { topic: 'getting-started' })).toBe(true);
    expect(validates(s, { topic: 'UPPER' })).toBe(false);
    expect(validates(s, { topic: 'has spaces' })).toBe(false);
  });
});

/* ── auditGet querystring ───────────────────────────────────────── */

describe('auditGet querystring', () => {
  const s = RS.auditGet.querystring;

  it('accepts empty query', () => {
    expect(validates(s, {})).toBe(true);
  });

  it('rejects non-numeric limit', () => {
    expect(validates(s, { limit: 'abc' })).toBe(false);
  });

  it('accepts numeric limit', () => {
    expect(validates(s, { limit: '50' })).toBe(true);
  });
});

/* ── schema exports completeness ────────────────────────────────── */

describe('schema exports completeness', () => {
  const exportNames = Object.keys(RS);

  it('exports all expected schemas', () => {
    const expected = [
      'commandCreate',
      'commandGet',
      'approvalsList',
      'approvalApprove',
      'approvalReject',
      'decisionsList',
      'decisionMutate',
      'decisionActivateCategory',
      'decisionPromoteLesson',
      'questionnairesList',
      'questionnaireSave',
      'subscribe',
      'milestoneCreate',
      'milestoneUpdate',
      'milestoneArchive',
      'milestoneTemplateCreate',
      'workspaceCreate',
      'workspaceUpdate',
      'workspaceAddRepository',
      'workspaceCreateProject',
      'policyEvaluate',
      'policyCreateException',
      'policiesList',
      'jobsList',
      'jobDetail',
      'jobCancel',
      'orchestratorAdvance',
      'orchestratorError',
      'orchestratorReset',
      'reevaluate',
      'analyticsPost',
      'analyticsGet',
      'auditGet',
      'helpGet',
      'analyticsV1MetricQuery',
      'artifactsList',
      'artifactDetail',
      'agentDetail',
      'sessionDetail',
      'authUpdateRole',
    ];
    for (const name of expected) {
      expect(exportNames, `missing export: ${name}`).toContain(name);
    }
  });

  it('every schema has a tags array', () => {
    for (const [name, schema] of Object.entries(RS)) {
      expect(Array.isArray(schema.tags), `${name}.tags must be an array`).toBe(true);
    }
  });
});
